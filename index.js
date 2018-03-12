const log = require('winston')
var config = require('./config')
var ctrls = require('./controllers')

log.add(log.transports.File, {
    filename: config.log
})

log.info('Starting SleepyZzz Analyzer')

ctrls.database.listen('devices', (snapshot) => {
    log.info(`Setting up analyzer for device [${snapshot.key}]`)
    let device = snapshot.val()
    let configuration = {
      disconnected: false
    }
    require('./anomalies')(device, configuration)
})
