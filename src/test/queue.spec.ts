import RediQueue from "../index";

const queue = new RediQueue("myQueue");

beforeAll(() => {
  // queue.client.flushAll();
});

afterAll(() => {
  //   queue.client.flushall();
  // queue.client.quit();
  // queue.consumerClient.quit();
});

// test('FETCH PENDING', async () => {

//     await queue.add({ message: 'second message' })
//     const consumer = await queue.client.xreadgroup('GROUP', 'default', 'consumer1', 'COUNT', 1, 'BLOCK', '1000', 'STREAMS', 'myQueue', '0')

//     if (consumer === null) {
//         return
//     }

//     const [[ queueName, jobs ]] = consumer

//     if (jobs.length < 1) {
//         console.log('EMPTY ARRAY')
//     }

//     console.log('DATA',jobs)

//     const [[ jobId, data ]] = jobs

//     console.log(jobId, data)

//     expect(1).toEqual(1)

// })

test("ADD to queue", async () => {
  const res = await queue.add({ message: "first message" });
  // await queue.add({ message: "second message" });
  // await queue.add({ message: "third message", nest: { one: "test" } });

  const addAll = [];
  for (let i = 0; i < 1000000; i++) {
    addAll.push(queue.add({ n: i }));
  }

  await Promise.all(addAll);

  // Expected pattern: 1624909920658-0
  expect(res).toMatch(/^(\d{13}-\d{1})?$/);
});

// test("PROCESS queue ", async () => {
//   await Promise.all([
//     queue.process("default", (job) => {
//       console.log("JOB DATA----", job);
//       // return new Error("WHOAH!!");
//       return "DONE";
//     }),
//   ]);

//   expect(1).toEqual(1);
// });

// queue.process("default", (job) => {
//   console.log("JOB DATA----", job);
//   // return new Error("WHOAH!!");
//   return "DONE";
// });
