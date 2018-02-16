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
        },
        temperature: {
            high: [],
            low: []
        },
        movement: {
            freefall: []
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

    ctrls.database.listen(`temperature/${device.baby}`, (snap) => {
        let data = snap.val()
        if (disconnected) {
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
        let latestNotification = now
        if (anomaliesBuffer.temperature[type].length > 0) {
            latestNotification = anomaliesBuffer.temperature[type][0]
        }

        let timelapse = now - latestNotification
        if (timelapse < config.buffer && timelapse != 0) {
            return
        }
        anomaliesBuffer.temperature[type].push(now)

        ctrls.database.read('users', device.user)
            .then((user) => {
                let babyName = user.babies[device.baby]

                let message = {
                    title: `${babyName}'s body temperature is too ${type}!`,
                    body: `${babyName}'s body temperature is currently: ${data.bpm} BPM.`
                }

                let notifications = []
                for (let k in user.mobileDevices) {
                    notifications.push(ctrls.notifications.send(user.mobileDevices[k], message.title, message.body))
                }
                Promise.all(notifications)
                    .then((results) => {
                        setTimeout(() => {
                            anomaliesBuffer.temperature[type].pop()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.temperature[type].pop()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/temperature`, {
                    timestamp: data.timestamp,
                    message: message.title,
                    details: message.body
                })

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.temperature[type].pop()
            })
    }, {
        limit: 1
    })

    ctrls.database.listen(`movement/${device.baby}`, (snap) => {
        let data = snap.val()
        if (disconnected) {
            return
        }
        let anomaly = (data.fall >= config.anomalies.movement.freefall)

        if (!anomaly) {
            return
        }

        let type = 'freefall'
        let now = Date.now()
        let latestNotification = now
        if (anomaliesBuffer.movement[type].length > 0) {
            latestNotification = anomaliesBuffer.movement[type][0]
        }

        let timelapse = now - latestNotification
        if (timelapse < config.buffer && timelapse != 0) {
            return
        }
        anomaliesBuffer.movement[type].push(now)

        ctrls.database.read('users', device.user)
            .then((user) => {
                let babyName = user.babies[device.baby]

                let message = {
                    title: `${babyName} has fallen!`,
                    body: `${babyName} has fallen.`
                }

                let notifications = []
                for (let k in user.mobileDevices) {
                    notifications.push(ctrls.notifications.send(user.mobileDevices[k], message.title, message.body))
                }
                Promise.all(notifications)
                    .then((results) => {
                        setTimeout(() => {
                            anomaliesBuffer.movement[type].pop()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.movement[type].pop()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/movement`, {
                    timestamp: data.timestamp,
                    message: message.title,
                    details: message.body
                })

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.movement[type].pop()
            })
    }, {
        limit: 1
    })
})
