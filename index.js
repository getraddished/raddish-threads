/**
 * I have the idea of extending cluser for the ease of use and direct access to the classes.
 * This object will be a singleton for we only want to ever have a single object.
 */

function RaddishThreads(config) {
    this.cluster = require('cluster');
    this.isMaster = this.cluster.isMaster;
    this.isWorker = this.cluster.isWorker;

    this.start();
}

RaddishThreads.prototype.start = function() {
    // Start the sockets.
};

module.exports = RaddishThreads;