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
    let disconnected = false
    let anomaliesBuffer = {
        heartrate: {
            fast: [],
            slow: []
        }
    }

    ctrls.database.listen(`heartrate/${device.baby}`, (snap) => {
        let data = snap.val()
        if (data.bpm <= 0) {
            disconnected = true
            return
        }
        disconnected = false
        let anomaly =
            data.bpm > config.anomalies.heartrate.upperLimit ||
            data.bpm < config.anomalies.heartrate.lowerLimit

        if (!anomaly) {
            return
        }

        let type = ''
        if (data.bpm > config.anomalies.heartrate.upperLimit) {
            type = 'fast'
        } else if (data.bpm < config.anomalies.heartrate.lowerLimit) {
            type = 'slow'
        }
        let now = Date.now()
        let latestNotification = now
        if (anomaliesBuffer.heartrate[type].length > 0) {
            latestNotification = anomaliesBuffer.heartrate[type][0]
        }

        let timelapse = now - latestNotification
        if (timelapse < config.buffer && timelapse != 0) {
            return
        }
        anomaliesBuffer.heartrate[type].push(now)

        ctrls.database.read('users', device.user)
            .then((user) => {
                let babyName = user.babies[device.baby]

                let message = {
                    title: `${babyName}'s heartrate is too ${type}!`,
                    body: `${babyName}'s heartrate is currently: ${data.bpm} BPM.`
                }

                let notifications = []
                for (let k in user.mobileDevices) {
                    notifications.push(ctrls.notifications.send(user.mobileDevices[k], message.title, message.body))
                }
                Promise.all(notifications)
                    .then((results) => {
                        setTimeout(() => {
                            anomaliesBuffer.heartrate[type].pop()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.heartrate[type].pop()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/heartrate`, {
                    timestamp: data.timestamp,
                    message: message.title,
                    details: message.body
                })

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.heartrate[type].pop()
            })
    }, {
        limit: 1
    })
})
