require("dotenv").config();
import { createClient } from "redis";
import humanId from "human-id";
import { RedisClientType } from "@node-redis/client";

interface RedisConnection {
  redis?: {
    host: string;
    port: number;
    password: string;
  };
}

interface QueueOpts {
  prefix?: string;
  env?: "test" | "development" | "staging" | "production";
}

declare global {
  var __rediQueueConnection: RedisClientType | undefined;
  var __rediQueueClientConnected: Boolean | undefined;
  var __rediQueueConsumerClientConnected: Boolean | undefined;
}

class RediQueue {
  [key: string]: any;
  constructor(
    queue,
    redisConnection: RedisConnection = {},
    opts: QueueOpts = {}
  ) {
    let host = "127.0.0.1";
    let port = 6379;
    let password = "";
    if (redisConnection.redis) {
      host = redisConnection.redis.host;
      port = redisConnection.redis.port;
      password = redisConnection.redis.password;
    }

    this.env = opts?.env || process.env.NODE_ENV || "development";

    this.client;

    if (process.env.NODE_ENV === "production") {
      this.client = createClient({
        socket: {
          host,
          port,
        },
        password,
        name: `rediqueue:${this.env}:${humanId({
          separator: "-",
          capitalize: false,
        })}`,
      });
    } else {
      if (!global.__rediQueueConnection) {
        global.__rediQueueConnection = createClient({
          socket: {
            host,
            port,
          },
          password,
          name: `rediqueue:${this.env}:${humanId({
            separator: "-",
            capitalize: false,
          })}`,
        });
      }
      this.client = global.__rediQueueConnection;
    }

    this.consumerClient = this.client.duplicate();

    this.client.connect();
    this.consumerClient.connect();

    this.queue = (opts.prefix || "rediqueue") + ":" + this.env + ":" + queue;
    this.opts = opts;
    this.consumerGroupExists = false;
    this.blockMillis = 1000;
    // XGROUP CREATE queuename groupname $ MKSTREAM
  }
}

// function objectToArray(object) {
//   const newArray = [];
//   Object.keys(object).map((key) => {
//     newArray.push(key);
//     return newArray.push(object[key]);
//   });
//   return newArray;
// }

function arrayToObject(array) {
  const theObject = {};
  for (let i = 0; i < array.length; i = i + 2) {
    theObject[array[i]] = array[i + 1];
  }

  return theObject;
}

RediQueue.prototype.add = function (data) {
  return this.client.xAdd(this.queue, "*", { data: JSON.stringify(data) });
  // ...(this.opts.maxLength ? ["MAXLEN", "~", this.opts.maxLength] : []),
};

RediQueue.prototype.process = async function (consumerGroupName, result) {
  const consumerId = humanId({ separator: "-", capitalize: false });
  let restarted = true;
  let blockMillis = 1000;

  if (!this.consumerGroupExists) {
    try {
      const res = await this.consumerClient.xGroupCreate(
        this.queue,
        consumerGroupName,
        "0"
      );
      console.log("CREATING GROUP", res);
      this.consumerGroupExists = true;
    } catch (err) {
      if (err.message === "BUSYGROUP Consumer Group name already exists") {
        this.consumerGroupExists = true;
      }
    }
  }

  for (let i = 0; i < 1; ) {
    const consumer = await this.consumerClient.xReadGroup(
      consumerGroupName,
      consumerId,
      { key: this.queue, id: restarted ? "0" : ">" },
      {
        BLOCK: blockMillis,
        COUNT: 1,
      }
    );

    // console.log(consumer);
    // return null;

    // const consumer = await this.consumerClient.XREADGROUP(
    //   "GROUP",
    //   consumerGroupName,
    //   "consumer1",
    //   "COUNT",
    //   1,
    //   "BLOCK",
    //   `${blockMillis}`,
    //   "STREAMS",
    //   this.queue,
    //   restarted ? "0" : ">"
    // );

    if (consumer === null) {
      console.log("Waiting for jobs...", blockMillis, i);
      i = i - 1;
      if (i === -4) blockMillis = 5000;
      if (i === -9) blockMillis = 10000;
      if (i === -49) blockMillis = 60000;

      //   NEED TO CLAIM MESSAGES FOR STUCK CONSUMERS

      if (process.env.NODE_ENV === "test") return null;
    } else {
      i = 0;
      blockMillis = 1000;
    }

    if (consumer !== null) {
      const [{ name, messages }] = consumer;

      //   console.log(messages);
      //   return null;
      //   let jobs;

      if (messages.length < 1) {
        restarted = false;
      } else {
        const [{ id: jobId, message }] = messages;

        const data = JSON.parse(message.data);

        const processPipeline = [];
        try {
          const processingResult = await result({
            data,
          });

          if (
            typeof processingResult === "object" &&
            processingResult.name === "Error"
          )
            throw new Error(processingResult.message);

          processPipeline.push(
            this.consumerClient.xAdd(`${this.queue}:completed`, "*", {
              consumer: consumerId,
              data: JSON.stringify(data),
              result: JSON.stringify(processingResult),
            })
          );
          processPipeline.push(
            this.consumerClient.hIncrBy(
              `${this.queue}:counters`,
              "completedJobs",
              1
            )
          );
        } catch (err) {
          processPipeline.push(
            this.consumerClient.xAdd(
              `${this.queue}:failed`,
              "*",
              {
                data: JSON.stringify(data),
                error: JSON.stringify({
                  name: err.name,
                  message: err.message,
                  stack: err.stack,
                }),
              }
              //   {
              //     TRIM: {
              //       strategy: "MAXLEN",
              //       strategyModifier: "~",
              //       threshold: this.opts.maxLength,
              //     },
              //   }
            )
          );
          processPipeline.push(
            this.consumerClient.hIncrBy(
              `${this.queue}:counters`,
              "failedJobs",
              1
            )
          );
        } finally {
          // Acknowledge the job
          //   processPipeline.push(
          //     this.consumerClient.xAck(this.queue, consumerGroupName, jobId)
          //   );
          await Promise.all(processPipeline);
        }
      }
    }
  }

  // const res = await this.client.xreadgroup('GROUP', consumerGroupName, 'consumer1', 'COUNT', 1, 'BLOCK', 0, 'STREAMS', this.queue, '>')
  // console.log(res)

  // const [[ name, results ]] = await this.client.xread( 'COUNT', '1', 'BLOCK', '0', 'STREAMS', this.queue, '1624910674172-0')
  // const res = result(results)
  // console.log('REAL RES',res)
};

RediQueue.prototype.RediQueue = RediQueue;

export default RediQueue;
export { RediQueue };
