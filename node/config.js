// VCAP_SERVICES contains all the credentials of services bound to
// this application. For details of its content, please refer to
// the document or sample of each service.  
var debug = require('debug')('medicalrecords');
var path = require('path');

// Object Storage V2, osv2, configuration
// This was provided from the bluemix credential page for the service (not the application binding)
// TODO var services = JSON.parse(process.env.VCAP_SERVICES || ' { "CloudIntegration": { "auth_url": "https://keystone2.open.ibmcloud.com", "swift_url": "https://swift2.open.ibmcloud.com/v1/AUTH_3627c702873a4e9ea92a54cd02d612bc", "sdk_auth_url": "https://keystone2.open.ibmcloud.com", "project": "acme", "region": "dal09", "credentials": { "userid": "pquiring@us.ibm.com", "password": "x8f2,SxA%Ps?{sYL" } } }');
var services = JSON.parse('{ "CloudIntegration": { "auth_url": "https://keystone2.open.ibmcloud.com", "swift_url": "https://swift2.open.ibmcloud.com/v1/AUTH_3627c702873a4e9ea92a54cd02d612bc", "sdk_auth_url": "https://keystone2.open.ibmcloud.com", "project": "acme", "region": "dal09", "credentials": { "userid": "pquiring@us.ibm.com", "password": "x8f2,SxA%Ps?{sYL" } } }');

module.exports.cloudIntegration = services.CloudIntegration; 
debug('services: ' + module.exports.cloudIntegration);

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

// on premise conifguration
// curl cap-sg-prd-2.integration.ibmcloud.com:15188
module.exports.onpremHost = 'cap-sg-prd-2.integration.ibmcloud.com';
module.exports.onpremPort = '15188';