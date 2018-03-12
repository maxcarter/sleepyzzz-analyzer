module.exports = (device, configuration) => {
    require('./heartrate')(device, configuration)
    require('./temperature')(device, configuration)
    require('./movement')(device, configuration)
}
