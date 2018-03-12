const log = require('winston')
var config = require('../config')
var ctrls = require('../controllers')

module.exports = (device, configuration) => {
    let firstRun = true
    let anomalyBuffer = {
        high: [],
        low: []
    }
    ctrls.database.listen(`heartrate/${device.baby}`, (snap) => {
        if (firstRun) {
          firstRun = false
          return
        }
        let data = snap.val()
        if (data.bpm <= 0) {
            configuration.disconnected = true
            return
        }
        configuration.disconnected = false
        let anomaly =
            data.bpm > config.anomalies.heartrate.upperLimit ||
            data.bpm < config.anomalies.heartrate.lowerLimit

        if (!anomaly) {
            return
        }

        let type = ''
        if (data.bpm > config.anomalies.heartrate.upperLimit) {
            type = 'high'
        } else if (data.bpm < config.anomalies.heartrate.lowerLimit) {
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

                let message = {
                    title: `${babyName}`,
                    body: `Heart Rate is ${type}: ${data.bpm.toFixed(2)} BPM`,
                    data: {
                        timestamp: `${data.timestamp}`,
                        baby: device.baby,
                        type: `heartrate_${type}`,
                        value: `${data.bpm}`,
                        title: `${babyName}`,
                        body: `Heartrate is ${type}: ${data.bpm.toFixed(2)} BPM`,
                        message: `Heartrate was ${type}: ${data.bpm.toFixed(2)} BPM`
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
                ctrls.database.insert(`anomalies/${device.baby}/heartrate`, message.data)

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
