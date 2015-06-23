'use strict';
var rp = require('request-promise');
var pkgcloud = require('pkgcloud');
var debug = require('debug')('medicar');
var Promise = require("bluebird");

var serviceCredentials;          // parsed service creds
var serviceProviderCredentials;  // parsed vcapServices to use instead of process.env.VCAP_SERVICES

/*
 Object Storage v2 authentication.  Usage:

 var osv2Authenticate = require('../osv2Authenticate');

 // call back with an authorized client
 osv2Authenticate.client(function(err, client) {...}

 // promise to resolve with an authorized client
 osv2Authenticate.promise()
 .then(function (client) {...}

 // override the environment variable for the service provider credentials with
 // either directly with the service credential string or with VCAP_SERVICES string
 osv2Authenticate.init(serviceCredentialString, vcapServicesString);
 */


/* globals Promise */
/**
 * @name Promise
 * @property {function} then
 */


/**
 *
 * @param {string} [vcapServicesString] vcap credential string that contains 'Object Storage' element. Example: '{ "Object Storage": [ { "name": "osv2-pquiring", "label": "Object Storage", "plan": "Free", "credentials": { "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/98934f3f-0cf7-47fb-b57b-c21b7a26bc95", "username": "982c30b44b1740a17299150b7f55ec3ffde3a48c", "password": "3a503832a08ce23798921fdfeed9ca4e4cea2d9f5a2ce3b36ffc5a454ba1" } } ] }'
 * @return {object} serviceProviderCredentials object representation of the first element of the "Object Storage" array.  Example: { "name": "osv2-pquiring", "label": "Object Storage", "plan": "Free", "credentials": { "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/98934f3f-0cf7-47fb-b57b-c21b7a26bc95", "username": "982c30b44b1740a17299150b7f55ec3ffde3a48c", "password": "3a503832a08ce23798921fdfeed9ca4e4cea2d9f5a2ce3b36ffc5a454ba1" } }
 */
function serviceProviderCredentialParser(vcapServicesString) {
    var vcapServices = JSON.parse(vcapServicesString);
    return vcapServices['Object Storage'][0];
}

/**
 * Call init to override the environment variable VCAP_SERVICES or override the service credential string.
 * For deploying into bluemix do not do this.
 * @param {string} [serviceCredentialString] service credential json string.  Example: '{ "CloudIntegration": { "auth_url": "https://keystone2.open.ibmcloud.com", "swift_url": "https://swift2.open.ibmcloud.com/v1/AUTH_3627c702873a4e9ea92a54cd02d612bc", "sdk_auth_url": "https://keystone2.open.ibmcloud.com", "project": "acme", "region": "dal09", "credentials": { "userid": "pquiring@us.ibm.com", "password": "x8f2,SxA%Ps?{sYL" } } }'
 * @param {string} [vcapServicesString] vcap credential string that contains 'Object Storage' element. Example: '{ "Object Storage": [ { "name": "osv2-pquiring", "label": "Object Storage", "plan": "Free", "credentials": { "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/98934f3f-0cf7-47fb-b57b-c21b7a26bc95", "username": "982c30b44b1740a17299150b7f55ec3ffde3a48c", "password": "3a503832a08ce23798921fdfeed9ca4e4cea2d9f5a2ce3b36ffc5a454ba1" } } ] }'
 */
module.exports.init = function (serviceCredentialString, vcapServicesString) {
    if (serviceCredentialString) {
        debug('osv2 credentials, will use hard coded service credentials');
        serviceCredentials = JSON.parse(serviceCredentialString).CloudIntegration;
    } else if (vcapServicesString) {
        debug('osv2 credentials, will use hard coded vcap credentials');
        serviceProviderCredentials = serviceProviderCredentialParser(vcapServicesString);
    }
};

// return promise to respond with service credentials.
// find them via http request from the bound credentials.
// in bluemix see the service credentials that are bound to the application
function requestServiceCredentialsFromVcapCredentials() {
    var credentials;
    // parse the service provider credentials from a string.  Catch the case where a parse fails.
    try {
        if (process.env['VCAP_SERVICES']) {
            debug('using VCAP_SERVICES environment for credentials');
            credentials = serviceProviderCredentialParser(process.env['VCAP_SERVICES']).credentials;
        } else {
            // were they provided via the init call?
            if (serviceProviderCredentials) {
                debug('not using VCAP_SERVICES environment instead using values from init call');
                credentials = serviceProviderCredentials.credentials;
            } else {
                return Promise.reject(Error('VCAP_SERVICES Environment variable not set'));
            }
        }
    } catch (e) {
        return Promise.reject('error in VCAP_SERVICES environment resulted in this parsing error: ' + e);
    }
    var vcap_creds = {
        "auth_url": credentials.auth_url,
        "username": credentials.username,
        "password": credentials.password
    };
    var vcap_secret = "Basic " + new Buffer(credentials.username + ":" + credentials.password).toString("base64");
    var req_options = {
        url: vcap_creds.auth_url,
        headers: {
            'accept': 'application/json',
            'Authorization': vcap_secret
        },
        timeout: 20000,
        method: 'GET',
        resolveWithFullResponse: true
    };

    return rp(req_options)
        .then(function (res) {
            if (res.statusCode == 200) {
                return Promise.resolve(JSON.parse(res.body).CloudIntegration);
            } else {
                throw Error('request service creds from bound service did not return statusCode 200: ' + res);
            }
        });
}

// return promise to respond with service credentials.
// These are the creds that are in the service (not the bound service)
// In bluemix ui see the service not the bound service.
function getOsv2ServiceCredentials() {
    if (serviceCredentials) { // hard coded service credentials
        return Promise.resolve(serviceCredentials);
    } else {
        return requestServiceCredentialsFromVcapCredentials();
    }
}

// return promise to respond with an authenticated client.
module.exports.promise = function getAuthenticatedClient() {
    //noinspection JSUnresolvedFunction
    return getOsv2ServiceCredentials()
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
};

/**
 * Call back with an authenticated client
 * @param {authenticatedClientCallback} callback
 */
module.exports.client = function (callback) {
    return module.exports.promise()
        .then(function (client) {
            callback(null, client);
        })
        .catch(function (err) {
            callback(err);
        });
};

/**
 * @callback authenticatedClientCallback
 * @param {object} err
 * @param {object} client
 */