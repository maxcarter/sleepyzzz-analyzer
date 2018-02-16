module.exports = {
    log: 'sleepyzzz-analyzer.log',
    buffer: 60000,
    database: {
        url: "https://sleepyzzz-38a10.firebaseio.com/",
        serviceAccount: "../svc-sleepyzzz.json",
        node: "sleepyzzz-dev"
    },
    anomalies: {
        heartrate: {
            upperLimit: 160,
            lowerLimit: 90
        },
        temperature: {
            upperLimit: 38,
            lowerLimit: 36.4
        }
    }
}
