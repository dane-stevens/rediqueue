<div align="center">
    <img src="https://skyf4ll.nyc3.cdn.digitaloceanspaces.com/npm/rediQueue.png" alt="RediQueue" />
    <br/>
    <p>
        The simple message queue built on Redis Streams.
    </p>
    <br/>
    <br/>
</div>

### Queue Monitoring UI

Coming soon...

[Request beta access](https://cdn.forms-content.sg-form.com/8e4ae6f6-2a8a-11eb-a1d1-4e330953a988)

### RediQueue Features

- [x] Robust design based on Redis Streams
- [x] Highly memory efficient
- [x] Automatic environment separation
- [x] Automatic recovery from process crashes
- [x] Automatic queue trimming by count, time, or memory usage 

### Install

```bash
npm install rediqueue
```

### Get a FREE Redis Instance

[Redis Cloud](https://redislabs.com/redis-enterprise-cloud/overview/)

## Contributing

We welcome all types of contributions, either code fixes, new features or doc improvements.
Code formatting is enforced by [prettier](https://prettier.io/).
For commits please follow conventional [commits convention](https://www.conventionalcommits.org/en/v1.0.0-beta.2/).
All code must pass lint rules and test suites before it can be merged into develop.

---

### Basic Usage

```js
import RediQueue from 'rediqueue'

// Create a queue
const notificationQueue = new RediQueue('notifications', { 
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
})

// Add a job to the queue
notificationQueue.add({
    email: 'someone@example.com'
})

// Process jobs
notificationQueue.process((job) => {

    const { data } = job

    return sendEmailFunction(data.email) {
        ...
    }

})
```

### Documentation

Coming soon...

### Important

RediQueue aims for at-least-once strategy. If a consumer fails or is killed while processing a job, a job could be processed more than once.