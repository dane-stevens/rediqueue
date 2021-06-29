const RediQueue = require('./index.js')

const queue = new RediQueue('myQueue')

beforeAll(() => {
    queue.client.flushall();
});

afterAll(() => {
    queue.client.quit()
})

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

test('ADD to queue', async () => {

    const res = await queue.add({ message: 'first message' })
    await queue.add({ message: 'second message' })
    await queue.add({ message: 'third message' })

    // Expected pattern: 1624909920658-0 
    expect(res).toMatch(/^(\d{13}-\d{1})?$/)

})

test('PROCESS queue ', async () => {

    await queue.process('default', (job) => {
        console.log('JOB DATA----',job)
        return new Error('WHOAH!!')
        return 'DONE'
    })

    // const key = 'test:set'

    // for (let i = 0; i < 100; i++) {
    //     redisClient.sadd(key, i)
    // }

    // const results = await redisClient.sscan(key, [0, 'COUNT', 10]);




    expect(1).toEqual(1);


});