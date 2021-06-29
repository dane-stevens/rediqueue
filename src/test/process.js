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