'use strict';
var debug = require('debug')('medicar');
var config = require('./config');
var osv2Authenticate = require('./osv2Authenticate');
var Promise = require("bluebird");

var client; // access this via the initializeOsv2ReturnClient

/* globals Promise */
/**
 * @name Promise
 * @property {function} then
 */


// containerContext is {
//   name: nameOfContainer,
//   exists: trueIfContainerExists,
// }

// return a promise to create the container and resolve to containerContext
// will change the containerContext.exists = true
function optionallyCreateContainer(containerContext) {
    return new Promise(function(resolve, reject) {
        if (containerContext.exists) {
            debug('container exists: ', containerContext.container);
            resolve(containerContext);
        } else {
            debug('creating container: ', containerContext.container);
            client.createContainer({name: containerContext.container}, function (err, createdContainer) {
                if (err) {
                    console.error('osv2 create container failed for: ' + container);
                    reject(err);
                } else {
                    debug('created container: ' + createdContainer);
                    containerContext.exists = true;
                    resolve(containerContext);
                }
            });
        }
    });
}

// return promise to delete a container based on the config configuration
// and change the resolved containerContext.exist = false
function optionallyDeleteContainer(containerContext) {
    return new Promise(function(resolve, reject) {
        if (containerContext.exists) {
            if (config.containerDestroy) {
                debug('osv2 destroy container: ' + containerContext.container);
                client.destroyContainer(containerContext.container, function (err) {
                    if (err) {
                        console.error('osv2 destroy container failed');
                        reject(err);
                    } else {
                        debug('osv2 container destroyed: ' + containerContext.container);
                        containerContext.exists = false;   // no longer exists
                        resolve(containerContext);
                    }
                });
            } else {
                resolve(containerContext);
            }
        } else {
            resolve(containerContext);
        }
    });
}

// return promise to resolve the containerContext.exist to true if container exists
function doesContainerExist(containerContext) {
    return new Promise(function(resolve, reject) {
        debug('checking existance of container: ' + containerContext.container);
        client.getContainer(containerContext.container, function (err, existingContainer) {
            if (err) {
                if (err.failCode === 'Item not found') {
                    debug('osv2 container does not exist: ' + containerContext.container);
                    containerContext.exists = false;
                } else {
                    return reject(err);
                }
            } else {
                debug('osv2 container already exists: ' + existingContainer);
                containerContext.exists = true;
            }
            resolve(containerContext);
        });
    });
}

// return promise to respond with an authorized client.
// initialize osv2 by creating a container if required.
function initializeOsv2ReturnClient() {
    if (client) {
        return Promise.resolve(client);
    } else {
        return osv2Authenticate.promise()
            .then(function(authenticatedClient) {
                client = authenticatedClient;
                return {container: config.container}; // containerContext
            })
            .then(doesContainerExist)  // resolve containerContext
            .then(optionallyDeleteContainer) // resolve containerContext
            .then(optionallyCreateContainer)  // resolve containerContext
            .then(function () {
                return client; // resolve
            });
    }
}

/**
 *
 * @param res response to use to respond with an error if thhere is a problem
 * @param callback function to call with a client parameter - see return value of require('pkgcloud').storage.createClient().
 */
module.exports.callbackWithClientOrRespondOnError = function (res, callback) {
    osv2Authenticate.init(config.osv2ServiceCredentials, config.processEnvVCAP_SERVICES);
    initializeOsv2ReturnClient() // resolve client
        .then(callback) // callback(client)
        .catch(function (err) {
            console.error('error resolving osv2 client');
            console.error(err);
            res.write('error resolving osv2 client');
            res.status(401).end();
        });
}