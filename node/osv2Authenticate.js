'use strict';
var request = require('request');
var pkgcloud = require('pkgcloud');
var debug = require('debug')('medicar');
var Promise = require("bluebird");

/*
 Object Storage v2 authentication.  Usage:
 var osv2Authenticate = require('../osv2Authenticate')(serviceCredentialString, vcapServicesString);

 // call back with an authorized client
 osv2Authenticate.client(function(err, client) {...}

 // promise to resolve with an authorized client
 osv2Authenticate.promise()
 .then(function (client) {...}

 */


/* globals Promise */
/**
 * @name Promise
 * @property {function} then
 */

// return promise to respond with service credentials.
// find them via http request from the bound credentials.
// in bluemix see the service credentials that are bound to the application
function requestServiceCredentialsFromVcapCredentials(serviceProviderCredentials) {
    var vcap_secret = "Basic " + new Buffer(serviceProviderCredentials.username + ":" + serviceProviderCredentials.password).toString("base64");
    var req_options = {
        headers: {
            'accept': 'application/json',
            'Authorization': vcap_secret
        },
        url: serviceProviderCredentials.auth_url,
        timeout: 20000,
        method: 'GET'
    };

    return new Promise(function (resolve, reject) {
        request(req_options, function (error, res, body) {
            if (error) {
                return reject(error);
            }
            if (res.statusCode == 200) {
                return resolve(JSON.parse(res.body).CloudIntegration);
            } else {
                return reject(Error('request service creds from bound service did not return statusCode 200: ' + res));
            }

        });
    });
}

// return promise to respond with service credentials.
// These are the creds that are in the service (not the bound service)
// In bluemix ui see the service not the bound service.
function getOsv2ServiceCredentials(serviceCredentials, serviceProviderCredentials) {
    if (serviceCredentials) { // hard coded service credentials
        return Promise.resolve(serviceCredentials);
    } else {
        return requestServiceCredentialsFromVcapCredentials(serviceProviderCredentials);
    }
}

// return promise to respond with an authenticated client.
function getAuthenticatedClient(serviceCredentials, serviceProviderCredentials) {
    //noinspection JSUnresolvedFunction
    return getOsv2ServiceCredentials(serviceCredentials, serviceProviderCredentials)
        .then(function (serviceCreds) {
            //noinspection JSUnresolvedVariable
            var authenticatedClient = pkgcloud.storage.createClient({
                provider: 'openstack',
                username: serviceCreds.credentials.userid,
                password: serviceCreds.credentials.password,
                tenantName: serviceCreds.project,
                region: serviceCreds.region,
                authUrl: serviceCreds.sdk_auth_url,
                useServiceCatalog: true
            });

            return new Promise(function (resolve, reject) {
                authenticatedClient.auth(function (err) {
                    if (err) {
                        console.error('osv2 client authentication error');
                        reject(err);
                    } else {
                        resolve(authenticatedClient);
                    }
                });
            });
        });
}


/**
 * Call init to override the environment variable VCAP_SERVICES or override the service credential string.
 * For deploying into bluemix do not do this.
 * @param {string} [osv2ServiceCredentials] service credential object from the unbound bluemix service.  Example: { CloudIntegration: { auth_url: "https://keystone2...", swift_url: "...", sdk_auth_url: "...", project: "acme", region: "dal09", credentials: {...} } }
 * @param {string} [vcapOsv2] vcap credential object from the bound bluemix service  'Object Storage' element. Example: '{ "name": "osv2-pquiring", "label": "Object Storage", "plan": "Free", "credentials": { "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/98934f3f-0cf7-47fb-b57b-c21b7a26bc95", "username": "982c30b44b1740a17299150b7f55ec3ffde3a48c", "password": "3a503832a08ce23798921fdfeed9ca4e4cea2d9f5a2ce3b36ffc5a454ba1" } }'
 */
module.exports = function (osv2ServiceCredentials, vcapOsv2) {
    var serviceCredentials;          // parsed service creds
    var serviceProviderCredentials;  // parsed vcapServices to use instead of process.env.VCAP_SERVICES

    if (osv2ServiceCredentials) {
        debug('osv2 credentials, will use hard coded credentials provided directly by the unbound bluemix service, not the VCAP_SERVICES indirect credentials');
        serviceCredentials = osv2ServiceCredentials.CloudIntegration;
    } else if (vcapOsv2) {
        debug('osv2 credentials, using the VCAP_SERVICES indirect credentials to get the service credentials');
        serviceProviderCredentials = vcapOsv2.credentials;
    } else {
        console.error('Object Storage V2 is not initialized');
        process.exit(1);
    }

    return {
        // return promise to respond with an authenticated client.
        promise: function () {
            return getAuthenticatedClient(serviceCredentials, serviceProviderCredentials);
        },
        /**
         * Call back with an authenticated client
         * @param {authenticatedClientCallback} callback
         */
        client: function (callback) {
            return getAuthenticatedClient(serviceCredentials, serviceProviderCredentials)
                .then(function (client) {
                    callback(null, client);
                })
                .catch(function (err) {
                    callback(err);
                });
        }
    };
};


/**
 * @callback authenticatedClientCallback
 * @param {object} err
 * @param {object} client
 */