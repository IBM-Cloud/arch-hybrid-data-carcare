#!/usr/bin/env node
console.log('medicar says hello.  setenv DEBUG=medicar to get a lot more log.  If DEBUG=medicar the next line should be: medicar debugging on');

/**
 * Module dependencies.
 */

var debug = require('debug')('medicar');
debug('debugging on');
debug('ENV: ');
debug(process.env);
var http = require('http');
var port;
var bind;

// cloud foundry initialization
if (runningInCloudFoundry()) {
    var cfenv = require('cfenv');
    // get the app environment from Cloud Foundry
    var appEnv = cfenv.getAppEnv();
    console.log(appEnv);
    port = appEnv.port;
    bind = appEnv.bind;
    if (!process.env['MR_DATADIR']) {
        process.env['MR_DATADIR'] = './data'; // set the default to a local directory instead of /data
    }
}

/**
 * Get port from environment and store in Express.
 */

console.log('node version: ' + process.version);
port = port || normalizePort(process.env.PORT || '80');

var app = require('../app');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
if (bind) {
    server.listen(port, bind);
} else {
    server.listen(port);
}
server.on('error', onError);
server.on('listening', onListening);

/**
 *
 * @returns {boolean} true if running in cloud foundry
 */
function runningInCloudFoundry() {
    if (process.env['CF_INSTANCE_IP']) {
        return true;
    }
    return false;
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
