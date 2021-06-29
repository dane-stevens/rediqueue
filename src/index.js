require('dotenv').config()
const Redis = require("ioredis")
const { nanoid } = require('nanoid')

class RediQueue {

    constructor(queue, redisConnection, opts = {}) {
        this.client = new Redis({
            host: '127.0.0.1',
            port: 6379,
            password: '',
            connectionName: `rediqueue:${ (process.env.NODE_ENV || 'development') }:${ nanoid() }`
        })
        this.queue = (opts.prefix || 'rediqueue') + ':' + (process.env.NODE_ENV || 'development') + ':' + queue
        this.opts = opts
        this.consumerGroupExists = false
        // XGROUP CREATE queuename groupname $ MKSTREAM
    }

}

function objectToArray(object) {
    const newArray = []
    Object.keys(object).map(key => {
        newArray.push(key)
        return newArray.push(object[key])
    })
    return newArray
}

function arrayToObject(array) {
    const theObject = {}
    for (let i = 0; i < array.length; i = i + 2) {
        theObject[array[i]] = array[i + 1]
    }

    return theObject
}

RediQueue.prototype.add = function (data) {

    return this.client.xadd(
        this.queue, 
        ...(this.opts.maxLength ? ['MAXLEN', '~', this.opts.maxLength] : []), 
        '*', 
        ...objectToArray(data))

}

RediQueue.prototype.process = async function (consumerGroupName, result) {

    let restarted = true

    if (!this.consumerGroupExists) {
        try {
            const res = await this.client.xgroup('CREATE', this.queue, consumerGroupName, '0')
            console.log('CREATING GROUP',res)
            this.consumerGroupExists = true 
        }
        catch (err) {
            if (err.message === 'BUSYGROUP Consumer Group name already exists') {
                this.consumerGroupExists = true
            }
        }
    }

    for (let i = 0; i < 1; i--) {

        const consumer = await this.client.xreadgroup('GROUP', consumerGroupName, 'consumer1', 'COUNT', 1, 'BLOCK', '1000', 'STREAMS', this.queue, restarted ? '0' : '>')
        
        if (consumer === null) {
            // return i = 2
            console.log('Waiting for jobs...')
            // return null
        }

        if (consumer !== null) {

            const [[ queueName, jobs ]] = consumer

            if (jobs.length < 1) { 
                restarted = false
            }
            else {

                const [[ jobId, data ]] = jobs

                const pipeline = this.client.pipeline()

                try {

                    const processingResult = await result({
                        data: arrayToObject(data)
                    })
                    
                    if (typeof processingResult === 'object' && processingResult.name === 'Error') throw new Error(processingResult.message)

                    pipeline.xadd(
                        `${ this.queue }:completed`, 
                        ...(this.opts.maxLength ? ['MAXLEN', '~', this.opts.maxLength] : []),
                        '*', 
                        'data', JSON.stringify(arrayToObject(data)), 
                        'result', JSON.stringify(processingResult)
                    )
                    pipeline.hincrby(`${ this.queue }:counters`, 'completedJobs', 1)
                    
                }

                catch (err) {
                    
                    pipeline.xadd(
                        `${ this.queue }:failed`, 
                        ...(this.opts.maxLength ? ['MAXLEN', '~', this.opts.maxLength] : []),
                        '*', 
                        'data', JSON.stringify(arrayToObject(data)), 
                        'error', JSON.stringify({ name: err.name, message: err.message, stack: err.stack })
                    )
                    pipeline.hincrby(`${ this.queue }:counters`, 'failedJobs', 1)
                    
                }

                finally {
                    // Acknowledge the job
                    pipeline.xack(this.queue, consumerGroupName, jobId)
                    await pipeline.exec()
                }
            }
            
        }

    }
    

    // const res = await this.client.xreadgroup('GROUP', consumerGroupName, 'consumer1', 'COUNT', 1, 'BLOCK', 0, 'STREAMS', this.queue, '>')
    // console.log(res)

    // const [[ name, results ]] = await this.client.xread( 'COUNT', '1', 'BLOCK', '0', 'STREAMS', this.queue, '1624910674172-0')
    // const res = result(results)
    // console.log('REAL RES',res)

}

RediQueue.prototype.RediQueue = RediQueue

module.exports = RediQueue
module.exports.RediQueue = RediQueue