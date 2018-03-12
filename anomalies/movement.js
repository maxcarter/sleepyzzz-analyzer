const log = require('winston')
var config = require('../config')
var ctrls = require('../controllers')

module.exports = (device, configuration) => {
    let firstRun = true
    let anomalyBuffer = {
        fall: []
    }
    ctrls.database.listen(`movement/${device.baby}`, (snap) => {
        if (firstRun) {
            firstRun = false
            return
        }
        let data = snap.val()
        if (configuration.disconnected) {
            return
        }
        let anomaly = (data.fall >= config.anomalies.movement.fall)

        if (!anomaly) {
            return
        }

        let type = 'fall'
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

                let message = {
                    title: `${babyName}`,
                    body: `Has fallen!`,
                    data: {
                        timestamp: `${data.timestamp}`,
                        baby: device.baby,
                        type: `movement_${type}`,
                        value: `${data.fall}`,
                        title: `${babyName}`,
                        body: `Has fallen`,
                        message: `fell`
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
                ctrls.database.insert(`anomalies/${device.baby}/movement`, message.data)

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
