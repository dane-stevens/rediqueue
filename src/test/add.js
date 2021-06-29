const queue = require('./redisConnection.js')
// queue.client.flushall();

for (let i = 0; i<100; i++) {
    queue.add({ n: i })
}
