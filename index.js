'use strict';

var usage = require('usage'),
    os = require('os'),
    cluster = require('cluster'),
    running = false;

class RaddishThreads {
    constructor(config) {
        this.config = Object.assign({
            threads: os.cpus().length,
            master: function() {},
            worker: null,
            scale: false
        }, config);

        this._type = cluster.isMaster ? 'master' : 'worker';
        this.workers = [];

        this.init();
        this.bind();
    }

    init() {
        if(typeof this.config[this._type] === 'function') {
            return this.config[this._type]();
        }

        return this.config.master();
    }

    bind() {
        if(this._type === 'worker') {
            return;
        }

        if(!this.config.scale) {
            // Spawning predetermined amount of threads.
            for(var i = 0; i < this.config.threads; i++) {
                this.workers.push(cluster.fork());
            }
        } else {
            // Spawn single worker thread.
            this.workers.push(cluster.fork());

            // Prep the config.
            var config = {
                interval: 500,
                spawnThreshold: 40,
                killThreshold: 10
            };

            if(typeof this.config.scale === 'object') {
                config = Object.assign(config, this.config.scale);
            }

            // Forward to scale method.
            setInterval(this.scale.bind(this, config), config.interval);
        }

        return true;
    }

    scale(config) {
        // We will now autospawn new threads.for (var thread of this.threads) {
        var promises = this.workers.map(function(worker) {
            return new Promise(function(resolve, reject) {
                usage.lookup(worker.process.pid, function (err, result) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(result.cpu);
                });
            })
        });

        Promise.all(promises)
            .then(function (results) {
                var total = this.workers.length,
                    current = results.reduce(function (a, b) {
                        return a + b;
                    }, 0),
                    mean = current / total;

                if (mean > config.spawnThreshold && total < this.config.threads) {
                    this.workers.push(cluster.fork());
                } else if (mean < config.killThreshold && total > 1) {
                    this.workers.pop().kill();
                }
            }.bind(this));
    }
}

module.exports = function(config) {
    if(running) {
        throw new Error('RaddishThreads is already called!');
    }

    running = true;
    new RaddishThreads(config);
};