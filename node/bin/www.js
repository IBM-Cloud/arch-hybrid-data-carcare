#!/usr/bin/env node
console.log('node version: ' + process.version);
console.log('medicar says hello.  setenv DEBUG=medicar to get a lot more log.  If DEBUG=medicar the next line should read: medicar debugging on');
var debug = require('debug')('medicar');
debug('debugging on');

debug('ENV: ');
debug(process.env);
var http = require('http');
var config = require('../config');

var app = require('../app');
var port = config.nconf.get('CAR_PORT');
var port = normalizePort(port);
app.set('port', port);

var server = http.createServer(app);
var hostname = config.nconf.get('CAR_HOSTNAME');
if (hostname) {
    console.log('hostname: ', hostname);
    server.listen(port, hostname);
} else {
    server.listen(port);
}
server.on('error', onError);
server.on('listening', onListening);

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
