const log = require('winston')
const firebase = require('firebase')
const q = require('q')
const config = require('../config')

firebase.initializeApp({
    serviceAccount: config.database.serviceAccount,
    databaseURL: config.database.url
})

var ref = firebase.database().ref(config.database.node)

module.exports = {
    /**
     * Inserts into database
     * @param  {String} collection Name of collection
     * @param  {Object} data       Data to be inserted
     * @return {Promise}           JavaScript Promise
     */
    insert: (collection, data) => {
        log.info('Controller [database] Function [insert]')
        log.info(`Inserting data into Firebase [${collection}]`)

        let deferred = q.defer()
        let collectionRef = ref.child(collection).push()
        collectionRef.set(data).then(() => {
            log.info(`Successfully inserted data into Firebase [${collection}]`)
            deferred.resolve()
        }).catch((error) => {
            log.error(`Failed inserting data into Firebase [${collection}]`, error)
            deferred.reject(error)
        })

        return deferred.promise
    },
    /**
     * Reads from database
     * @param  {String} collection Name of collection
     * @param  {String} value      Name of value to read
     * @return {Promise}           JavaScript Promise
     */
    read: (collection, key) => {
        log.info('Controller [database] Function [read]')
        log.info(`Reading Firebase [${collection}]`)

        let deferred = q.defer()
        let collectionRef = ref.child(collection).child(key)
        collectionRef.once('value').then((snapshot) => {
            log.info(`Successfully read data from Firebase [${collection}]`)
            deferred.resolve(snapshot.val())
        }).catch((error) => {
            log.error(`Failed reading data from Firebase [${collection}]`, error)
            deferred.reject(error)
        })
        return deferred.promise
    },
    /**
     * Gets last entry from database
     * @param  {string} collection Name of Collection
     * @param  {array} children   Array of child elements
     * @return {Promise}          JavaScript Promise
     */
    getLast: (collection, children) => {
        log.info('Controller [database] Function [getLast]')
        log.info(`Reading Firebase [${collection}]`)

        let deferred = q.defer()
        let collectionRef = ref.child(collection)
        for (let child in children) {
            collectionRef = collectionRef.child(children[child])
        }
        collectionRef.orderByKey().limitToLast(1).once('child_added').then((snapshot) => {
            log.info(`Successfully read data from Firebase [${collection}]`)
            deferred.resolve(snapshot.val())
        }).catch((error) => {
            log.error(`Failed reading data from Firebase [${collection}]`, error)
            deferred.reject(error)
        })
        return deferred.promise
    },
    /**
     * Listens to a specific collection in Firefbase
     * @param  {string}   collection Name of collection
     * @param  {object}   options    Options
     * @param  {Function} callback   JavaScript Callback function
     */
    listen: (collection, callback, options) => {
        log.info('Controller [database] Function [listen]')
        log.info(`Setting up Firebase Listener for [${collection}]`)
        options = options || {}
        let children = collection.split('/')
        let collectionRef = ref
        for (let i = 0; i < children.length; i++) {
            collectionRef = collectionRef.child(children[i])
        }
        collectionRef = collectionRef.orderByKey()
        if (options.limit && options.limit > 0) {
            collectionRef = collectionRef.limitToLast(options.limit)
        }
        collectionRef.on('child_added', (snapshot) => {
            log.info(`Received [${collection}] event.`)
            callback(snapshot)
        }, (error) => {
            log.error(`Failed receiving [${collection}] event.`)
            log.error(error)
            deferred.reject(error)
        })
    }
}
