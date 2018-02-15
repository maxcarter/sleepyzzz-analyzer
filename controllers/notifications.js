const log = require('winston')
const q = require('q')
const FCM = require('fcm-node')
const config = require('../config')

var db = config.database.node
var fcm = new FCM(require(config.database.serviceAccount))
module.exports = {
    /**
     * Sends a notification using FCM
     * @param  {string} id    Mobile Device ID
     * @param  {string} title Notification Title
     * @param  {string} body  Notification Body
     * @return {Promise}      JavaScript Promise
     */
    send: (id, title, body) => {
        log.info('Controller [notifications] Function [send]')

        let message = {
            to: id,
            notification: {
                title: title,
                body: body
            }
        }

        log.info(`Sending notification to [${id}]`)
        let deferred = q.defer()
        fcm.send(message, (err, response) => {
            if (err) {
                log.error(`Failed sending notification to [${id}]`, err)
                deferred.reject(err)
            }

            log.info(`Successfully sent notification to [${id}]`)
            deferred.resolve()
        })
        return deferred.promise
    }
}
