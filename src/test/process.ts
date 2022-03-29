const queue = require('./redisConnection.js')

queue.process('default', async (job) => {

    console.log(job.data)

    const { data } = job

    if (data.n % 15 === 0) throw new Error('Whoops, we don\'t process numbers that are divisible by 15')

    return {
        original: data.n,
        multipliedByTwo: data.n * 2
    }

})

let n = 0

setInterval(() => {
    if (n < 5) {
        queue.add({ n })
        n = n + 1
    }
}, 1000)