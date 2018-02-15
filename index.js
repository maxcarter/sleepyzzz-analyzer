const log = require('winston')
var config = require('./config')
var ctrls = require('./controllers')

log.add(log.transports.File, {
    filename: config.log
})

log.info('Starting SleepyZzz Analyzer')

ctrls.database.listen('devices', (snapshot) => {
    let device = snapshot.val()
    let babyKey = device.baby
    let userKey = device.user
    ctrls.database.listenChild('heartrate', babyKey, (snap) => {
        let data = snap.val()
        let anomaly = (data.bpm > 160) || (data.bpm < 90)


        if (!anomaly) {
            return
        }

        ctrls.database.read('users', userKey).then((user) => {
            let message = {}
            let babyName = user.babies[babyKey]
            log.info('Notifying user mobile devices')

            if (data.bpm > 160) {
                message.title = babyName + "'s heartrate is too fast!"
            } else if (data.bpm < 90) {
                message.title = babyName + "'s heartrate is too slow!"
            }

            message.body = babyName + "'s heartrate is currently: " + data.bpm + ' BPM.'

            for (let mKey in user.mobileDevices) {
                ctrls.notifications.send(user.mobileDevices[mKey], message.title, message.body)
            }
        }).catch((error) => {
            log.error(`Could not find user [${userKey}]`)
        })
    })

    ctrls.database.listenChild('movement', babyKey, (snap) => {
        let data = snap.val()
        log.info(data)
    })

    ctrls.database.listenChild('temperature', babyKey, (snap) => {
        let data = snap.val()
        log.info(data)
    })
})
