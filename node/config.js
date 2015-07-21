require('./polyfill');

var debug = require('debug')('medicar');
var path = require('path');
var nconf = require('nconf');
var osv2Authenticate = require('./osv2Authenticate');

// all access to nconf should be through this exported variable
module.exports.nconf = nconf;

// args and environment always win
nconf.argv()
    .env();

// if cloud foundry initialization then host, port and default data directory for the file system storage are adjusted
if (runningInCloudFoundry()) {
    var cfenv = require('cfenv');
    // get the app environment from Cloud Foundry
    var appEnv = cfenv.getAppEnv();
    console.log(appEnv);
    nconf.defaults({
        'CAR_HOSTNAME': appEnv.bind,
        'CAR_PORT': appEnv.port,
        'CAR_FILE_DATADIR': './data'
    });
}

nconf.file('./config/app.json');

// the file holds VCAP_SERVICES conveniently in object format when copy/pasted from the bluemix credential GUI
// but in the environment (which is typical) it is a string that needs to be parsed
var VCAP_SERVICES = nconf.get('VCAP_SERVICES');
if (typeof(VCAP_SERVICES) === 'string') {
    VCAP_SERVICES = JSON.parse(VCAP_SERVICES);
}

module.exports.findVcapMemberOfServiceByNameOrExit = findVcapMemberOfServiceByNameOrExit;
module.exports.findVcapMemberOfServiceByName = findVcapMemberOfServiceByName;
function findVcapMemberOfServiceByNameOrExit(nconfServiceName) {
    var ret = findVcapMemberOfServiceByName(nconfServiceName);
    if (!ret) {
        console.error('exit 1');
        process.exit(1);
    }
    return ret;
}

// VCAP_SERVICES have one object per service and then an array of members.
// return the member that matches the nconf service configuration.
// log an error and return false if there is a problem with the service
function findVcapMemberOfServiceByName(nconfServiceName) {
    var nconfService = nconf.get(nconfServiceName);
    if (!nconfService) {
        console.error('Not a configured bluemix service: ' + nconfServiceName);
        return false;
    }
    var service = VCAP_SERVICES[nconfService.serviceName];
    if (!service) {
        console.error('The service name: ' + nconfServiceName + ' indicates that the following non existent service should be in VCAP_SERVICES: ' + nconfService.serviceName);
        return false;
    }

    var ret = service.find(function (element) {
        return element.name === nconfService.memberName;
    });
    if (!ret) {
        console.error('The service name: ' + nconfServiceName + '  identifies an existing service : ' + nconfService.serviceName + '  which is missing the named member: ' + nconfService.memberName);
        return false;
    }
    return ret;
}

// Identify the Object Storage v2 service.
var vcapOsv2 = findVcapMemberOfServiceByNameOrExit('serviceOsv2');  // use this mechanism
var osv2ServiceCredentials = nconf.get('osv2ServiceCredentials');   // not required and can be undefined, kept for testing
if (typeof(osv2ServiceCredentials) === 'string') {
    osv2ServiceCredentials = JSON.parse(osv2ServiceCredentials);
}
module.exports.osv2Authenticate = osv2Authenticate(osv2ServiceCredentials, vcapOsv2);

module.exports.container = nconf.get('CAR_OSV2_PUBLIC_CONTAINER_NAME');
debug('container: ' + module.exports.container);

module.exports.containerDestroy = (nconf.get('CAR_OSV2_PUBLIC_CONTAINER_DESTROY').toLowerCase() === 'true');
debug('config.containerDestroy: ' + module.exports.containerDestroy);

// file system configuration
module.exports.dataDir = nconf.get('CAR_FILE_DATADIR').replace(/\//g, path.sep);    // use linux style and replace with the windows path separator
debug('data directory: ' + module.exports.dataDir);

module.exports.tmp = 'tmp';
module.exports.HOSTNAME = 'HOSTNAME';
module.exports.group_id = 'group_id';

// on premise conifguration.  These strings are similar to those that will be used in production:
// curl cap-sg-prd-2.integration.ibmcloud.com:15188
module.exports.onpremHost = nconf.get('CAR_SG').onpremHost;
module.exports.onpremPort = nconf.get('CAR_SG').onpremPort;

/**
 *
 * @returns {boolean} true if running in cloud foundry
 */
function runningInCloudFoundry() {
    return !!process.env['CF_INSTANCE_IP'];

}

