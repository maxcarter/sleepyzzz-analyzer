module.exports = {
    apps: [{
        name: "sleepyzzz-analyzer",
        script: "index.js",
        cwd: "/var/www/production/sleepyzzz-analyzer",
        env_production: {
            NODE_ENV: "production"
        }
    }]
}
