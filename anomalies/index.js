const log = require('winston')
var config = require('../config')
var ctrls = require('../controllers')

module.exports = () => {
    ctrls.database.listen('devices', (snapshot) => {
        log.info(`Setting up analyzer for device [${snapshot.key}]`)
        let device = snapshot.val()
        let configuration = {
            disconnected: false
        }
        require('./heartrate')(device, configuration)
        require('./temperature')(device, configuration)
        require('./movement')(device, configuration)
    })
}
