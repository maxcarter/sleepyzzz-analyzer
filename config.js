module.exports = {
    log: 'sleepyzzz-analyzer.log',
    buffer: 30000,
    database: {
        url: "https://sleepyzzz-38a10.firebaseio.com/",
        serviceAccount: "../svc-sleepyzzz.json",
        node: "sleepyzzz-dev"
    },
    anomalies: {
      heartrate: {
        upperLimit: 160,
        lowerLimit: 90
      }
    }
}
