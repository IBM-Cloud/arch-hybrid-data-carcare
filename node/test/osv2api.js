// mocha test
var osv2Authenticate = require('../osv2Authenticate');
var config = require('../config');

osv2Authenticate.init(config.osv2ServiceCredentials);
describe('osv2Authenticate', function() {
    it('return a client', function (done) {
        osv2Authenticate.init(config.osv2ServiceCredentials, config.processEnvVCAP_SERVICES);
        osv2Authenticate.client(function(err, client) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });
    it('verify client.getContainers will return with a good value', function (done) {
        osv2Authenticate.client(function(err, client) {
            if (err) {
                done(err);
            } else {
                client.getContainers(function (err, containers) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });
    it('delete module and try the initialization via the promise', function (done) {
        var name = require.resolve('../osv2Authenticate');
        delete require.cache[name];
        var osv22 = require('../osv2Authenticate');
        osv22.init(config.osv2ServiceCredentials, config.processEnvVCAP_SERVICES);
        osv22.promise()
            .then(function (client) {
                client.getContainers(function (err, containers) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            })
            .catch(function (err) {
                done(err);
            });
    });
    it('delete both osv2Authenticate and osv2Initialize to start fresh with next test', function (done) {
        var osv2Authenticate = require.resolve('../osv2Authenticate');
        var osv2Initialize = require.resolve('../osv2Initialize');
        delete require.cache[osv2Authenticate];
        delete require.cache[osv2Initialize];
        done();
    });
});