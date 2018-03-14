const log = require('winston')
var config = require('../config')
var ctrls = require('../controllers')

module.exports = () => {
    ctrls.database.listen('devices', (snapshot) => {
        log.info(`Setting up analyzer for device [${snapshot.key}]`)
        let device = snapshot.val()
        let connection = {
            set: (val) => {
                log.info(`Setting device [${snapshot.key}] connection to [${val}]`)
                configuration.connected = val
                ctrls.database.update(`devices/${snapshot.key}/connected`, val)
            },
            check: () => {
                if (configuration.connected && Date.now() - configuration.lastEvent >= config.timeout) {
                    connection.set(false)
                }
            }
        }

        let configuration = {
            connected: false,
            lastEvent: Date.now(),
            connectDevice: () => {
                connection.set(true)
            },
            disconnectDevice: () => {
                connection.set(false)
            }
        }

        connection.set(false)
        setInterval(connection.check, config.timeout)

        require('./heartrate')(device, configuration)
        require('./temperature')(device, configuration)
        require('./movement')(device, configuration)
    })
}
