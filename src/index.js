const Redis = require("ioredis");

class RediQueue {

    constructor(queue, { host, port, password, options }) {
        this.client = new Redis({ host, port, password })
        this.options = options
    }


    add(data) {

        return addToQueue(data, queue)

    }


}

function addToQueue(data, queue) {

    console.log(data)

}

const queue = new RedisQueue('test', { host: 'localhost', port: 6379, password: '' })

RediQueue.prototype.RediQueue = RedisQueue

module.exports = RediQueue
module.exports.RediQueue = RediQueue