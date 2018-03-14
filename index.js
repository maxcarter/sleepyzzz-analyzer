const log = require('winston')
var config = require('./config')

log.add(log.transports.File, {
    filename: config.log
})

log.info('Starting SleepyZzz Analyzer')

require('./anomalies')()
