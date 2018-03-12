const log = require('winston')
var config = require('../config')
var ctrls = require('../controllers')

module.exports = (device, configuration) => {
    let firstRun = true
    let anomalyBuffer = {
        high: [],
        low: []
    }
    ctrls.database.listen(`temperature/${device.baby}`, (snap) => {
        if (firstRun) {
            firstRun = false
            return
        }
        let data = snap.val()
        if (configuration.disconnected) {
            return
        }
        let anomaly =
            data.temperature > config.anomalies.temperature.upperLimit ||
            data.temperature < config.anomalies.temperature.lowerLimit

        if (!anomaly) {
            return
        }

        let type = ''
        if (data.temperature > config.anomalies.temperature.upperLimit) {
            type = 'high'
        } else if (data.temperature < config.anomalies.temperature.lowerLimit) {
            type = 'low'
        }
        let now = Date.now()
        for (let i = 0; i < anomalyBuffer[type].length; i++) {
            let latestNotification = anomalyBuffer[type][i]
            let timelapse = now - latestNotification
            if (timelapse < config.buffer && timelapse > 0) {
                return
            }
            anomalyBuffer[type].shift()
        }

        if (anomalyBuffer[type].length > 0) {
            return
        }

        anomalyBuffer[type].push(now)

        ctrls.database.read('users', device.user)
            .then((user) => {
                let babyName = user.babies[device.baby]

                let degree = String.fromCharCode(176)

                let message = {
                    title: `${babyName}`,
                    body: `Temperature is ${type}: ${data.temperature.toFixed(2)}${degree}C`,
                    data: {
                        timestamp: `${data.timestamp}`,
                        baby: device.baby,
                        type: `temperature_${type}`,
                        value: `${data.temperature}`,
                        title: `${babyName}`,
                        body: `Temperature is ${type}: ${data.temperature.toFixed(2)}${degree}C`,
                        message: `Temperature was ${type}: ${data.temperature.toFixed(2)}${degree}C`
                    }
                }

                let notifications = []
                for (let k in user.mobileDevices) {
                    notifications.push(ctrls.notifications.send(
                        user.mobileDevices[k],
                        message.title,
                        message.body,
                        message.data))
                }
                Promise.all(notifications)
                    .then((results) => {
                        setTimeout(() => {
                            if (anomalyBuffer[type][0] === now) {
                                anomalyBuffer[type].shift()
                            }
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        if (anomalyBuffer[type][0] === now) {
                            anomalyBuffer[type].shift()
                        }
                    })
                ctrls.database.insert(`anomalies/${device.baby}/temperature`, message.data)

            })
            .catch((error) => {
                log.error(error)
                if (anomalyBuffer[type][0] === now) {
                    anomalyBuffer[type].shift()
                }
            })
    }, {
        limit: 1
    })
}
