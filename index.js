'use strict';

var usage = require('usage');

class RaddishThreads {
    constructor() {
        this.cluster = require('cluster');
        this.isMaster = this.cluster.isMaster;
        this.isWorker = this.cluster.isWorker;
        this.master = this.cluster;
        this.config = {};
        this.isWin = /^win/.test(process.platform);
        this.threads = [];
    }

    /**
     * This method returns the config
     * the config returned is prefilled with fallback variables if undefined.
     *
     * @returns {Object} The configuration object.
     */
    getConfig() {
        return {
            interval: this.config['interval'] || 500,
            maxThreads: this.config['maxThreads'] || 16,
            minThreshold: this.config['minThreshold'] || 10,
            maxThreshold: this.config['maxThreshold'] || 50
        };
    }

    /**
     * This method is called periodically while checking for threads.
     *
     * @returns {Promise} A promise containing all the cpu loads.
     */
    checkThreads() {
        var promises = [],
            self = this;

        for (var index in this.threads) {
            if (this.threads.hasOwnProperty(index)) {
                var thread = this.threads[index];

                promises.push(new Promise(function (resolve, reject) {
                    usage.lookup(thread.process.pid, function (err, result) {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(result.cpu);
                    });
                }));
            }
        }

        return Promise.all(promises)
            .then(function (results) {
                var config = self.getConfig(),
                    total = self.threads.length,
                    current = results.reduce(function (a, b) {
                        return a + b;
                    }, 0),
                    mean = current / total;

                if (mean > config.maxThreshold && total < config.maxThreads) {
                    console.log('Spawning process!');
                    this.threads.push(self.master.fork());
                } else if (mean < config.minThreshold && total > 1) {
                    console.log('Killing process!');
                    this.threads.pop().kill();
                }
            });
    }

    /**
     * This method does some basic checks and will start the threads class.
     */
    start() {
        if(this.isWin) {
            console.log('Threads not suppoerted under Windows!');
            return;
        }

        if(this.isMaster) {
            console.log('Threads support enabled!');
            this.threads.push(this.master.fork());
        }

        setInterval(this.checkThreads.bind(this), this.getConfig().interval);
    }
}

module.exports = RaddishThreads;