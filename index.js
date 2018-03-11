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
            high: [],
            low: []
        },
        temperature: {
            high: [],
            low: []
        },
        movement: {
            fall: []
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
            type = 'high'
        } else if (data.bpm < config.anomalies.heartrate.lowerLimit) {
            type = 'low'
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
                    title: `${babyName}`,
                    body: `Heart Rate is ${type}: ${data.bpm.toFixed(2)} BPM`,
                    data: {
                        timestamp: `${data.timestamp}`,
                        baby: device.baby,
                        type: `heartrate_${type}`,
                        value: `${data.bpm}`,
                        title: `${babyName}`,
                        body: `Heartrate is ${type}: ${data.bpm.toFixed(2)} BPM`
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
                            anomaliesBuffer.heartrate[type].shfit()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.heartrate[type].shfit()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/heartrate`, message.data)

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.heartrate[type].shfit()
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
                        body: `Temperature is ${type}: ${data.temperature.toFixed(2)}${degree}C`
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
                            anomaliesBuffer.temperature[type].shfit()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.temperature[type].shfit()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/temperature`, message.data)

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.temperature[type].shfit()
            })
    }, {
        limit: 1
    })

    ctrls.database.listen(`movement/${device.baby}`, (snap) => {
        let data = snap.val()
        if (disconnected) {
            return
        }
        let anomaly = (data.fall >= config.anomalies.movement.fall)

        if (!anomaly) {
            return
        }

        let type = 'fall'
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
                    title: `${babyName}`,
                    body: `Has fallen!`,
                    data: {
                        timestamp: `${data.timestamp}`,
                        baby: device.baby,
                        type: `movement_${type}`,
                        value: `${data.fall}`,
                        title: `${babyName}`,
                        body: `Has fallen`
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
                            anomaliesBuffer.movement[type].shift()
                        }, config.buffer)
                    })
                    .catch((error) => {
                        log.error(error)
                        anomaliesBuffer.movement[type].shift()
                    })
                ctrls.database.insert(`anomalies/${device.baby}/movement`, message.data)

            })
            .catch((error) => {
                log.error(error)
                anomaliesBuffer.movement[type].shift()
            })
    }, {
        limit: 1
    })
})
