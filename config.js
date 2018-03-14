module.exports = {
    log: 'sleepyzzz-analyzer.log',
    buffer: 60000,
    database: {
        url: "https://sleepyzzz-38a10.firebaseio.com/",
        serviceAccount: "../svc-sleepyzzz.json",
        node: "sleepyzzz-dev"
    },
    timeout: 15000,
    anomalies: {
        heartrate: {
            min: 10,
            upperLimit: 160,
            lowerLimit: 90
        },
        temperature: {
            upperLimit: 38,
            lowerLimit: 36.4
        },
        movement: {
            fall: 1,
            roll: {
                upperLimit: 45,
                lowerLimit: -45
            },
            pitch: {
                upperLimit: 45,
                lowerLimit: -45
            }
        }
    }
}
