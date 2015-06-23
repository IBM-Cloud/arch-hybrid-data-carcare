// VCAP_SERVICES contains all the credentials of services bound to
// this application. For details of its content, please refer to
// the document or sample of each service.  
var debug = require('debug')('medicar');
var path = require('path');

// Object Storage V2, osv2, configuration
// This was provided from the bluemix credential page for the service (not the application binding)
// copy/paste the string here (make sure it is valid json)
module.exports.osv2ServiceCredentials;// = '{ "CloudIntegration": { "auth_url": "https://keystone2.open.ibmcloud.com", "swift_url": "https://swift2.open.ibmcloud.com/v1/AUTH_3627c702873a4e9ea92a54cd02d612bc", "sdk_auth_url": "https://keystone2.open.ibmcloud.com", "project": "acme", "region": "dal09", "credentials": { "userid": "pquiring@us.ibm.com", "password": "x8f2,SxA%Ps?{sYL" } } }';

// The vcap services will be provided at runtime when the app is bound to a service.
// On CF bind the service to an app (look at the bound service and you will see a string like the one below)
// For containers create a CF app bound to the service and then bind the CF app to the container
// In a debug environment (not bluemix) Open the CF Application > CF OSV2 Service and copy/paste the "bound credentials" for the service below:
module.exports.processEnvVCAP_SERVICES    = '{ "Object Storage": [ { "name": "osv2-pquiring", "label": "Object Storage", "plan": "Free", "credentials": { "auth_url": "https://objectstorage.ng.bluemix.net/auth/8259e199-3520-4de6-9180-411aa1788095/2ad3fe49-83e6-492a-836c-bf958318fc0f", "username": "80ce884743da644807120849ca2938bd380c3374", "password": "52bea2ee6fd6666a06dd230ef4fa4c7e7eec0b9f4b144b4cc27a715cf38f" } } ] }';

module.exports.container = process.env.MR_CONTAINER  || 'medical_records_container';
debug('container: ' + module.exports.container);

module.exports.containerDestroy = false;
if (typeof process.env.MR_DESTROY_CONTAINER === 'string') {
    module.exports.containerDestroy = (process.env.MR_DESTROY_CONTAINER.toLowerCase().trim() == 'true');
}
if (module.exports.containerDestroy) {
    debug('config.containerDestroy === true');
}

// file system configuration
module.exports.dataDir = process.env.MR_DATADIR || path.join(path.sep, 'data');    // default to /data and override in a container: docker run -v xxx:/data
module.exports.tmp = 'tmp';
module.exports.HOSTNAME = 'HOSTNAME';
module.exports.group_id = 'group_id';

// on premise conifguration
// curl cap-sg-prd-2.integration.ibmcloud.com:15188
module.exports.onpremHost = 'cap-sg-prd-2.integration.ibmcloud.com';
module.exports.onpremPort = '15188';