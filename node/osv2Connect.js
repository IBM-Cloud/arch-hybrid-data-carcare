'use strict';
var async = require('async');
var pkgcloud = require('pkgcloud');
var debug = require('debug')('medicalrecords');
var config = require('./config');

var client; // access this via the callbackWithClientOrRespondOnError

// create a container using the provided client
function createContainer(tempClient, container, callback) {
    tempClient.createContainer({name: container}, function (err, createdContainer) {
        if (err) {
            console.error('osv2 create container failed for: ' + container);
            callback(err);
        } else {
            debug('created container: ' + createdContainer);
            callback();
        }
    });

}
// run the callback passing the client.  If an error is determined then use the Response res
// to write the error value and do not call the callback.
// if destroy is boolean true then destroy the container
module.exports.callbackWithClientOrRespondOnError = function callbackWithClientOrRespondOnError(res, callback) {
    if (client) {
        callback(client);
    } else {
        var tempClient;

        async.series([
            function (callback) {
                tempClient = pkgcloud.storage.createClient({
                    provider: 'openstack',
                    username: config.cloudIntegration.credentials.userid,
                    password: config.cloudIntegration.credentials.password,
                    tenantName: config.cloudIntegration.project,
                    region: config.cloudIntegration.region,
                    authUrl: config.cloudIntegration.sdk_auth_url,
                    useServiceCatalog: true
                });

                tempClient.auth(function (err) {
                    if (err) {
                        console.error('osv2 client authentication error');
                        callback(err);
                    } else {
                        callback();
                    }
                });
            },
            // If the container does not exist - create it.
            // if it does exist check the environment variable to see if it needs to be destroyed before creating
            function (callback) {
                var container = config.container;
                debug('checking existance of container: ' + container);
                tempClient.getContainer(container, function (err, existingContainer) {
                    if (err) {
                        if (err.failCode === 'Item not found') {
                            debug('osv2 container does not exist, creating: ' + container);
                            createContainer(tempClient, container, callback);
                        }
                    } else {
                        debug('container exists: ' + existingContainer);
                        if (config.containerDestroy) {
                            debug('destroy container: ' + container);
                            tempClient.destroyContainer(container, function (err2) {
                                if (err2) {
                                    console.error('osv2 destroy container failed');
                                    callback(err2);
                                } else {
                                    debug('osv2 container just destroyed, creating new container: ' + container);
                                    createContainer(tempClient, container, callback);
                                }
                            })
                        } else {
                            callback();
                        }
                    }
                });
            }], function (err) {
            // On err write the error status back
            if (err) {
                console.error('error resolving osv2 client');
                console.error(err);
                res.write('error resolving osv2 client');
                res.status(401).end();
                return;
            }
            client = tempClient;
            debug('storageAPI.createClient exit');
            callback(client);
        });
    }
};

