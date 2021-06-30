const RediQueue = require('../index.js')


const queue = new RediQueue('ingest', 'localhost:6379', {
    // maxLength: 100
})

module.exports = queue