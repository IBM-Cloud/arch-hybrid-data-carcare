// mocha test
var config = require('../config');
var osv2Authenticate = config.osv2Authenticate;
describe('osv2Authenticate', function() {
    it('return a client', function (done) {
        osv2Authenticate.client(function(err/*, client*/) {
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
                client.getContainers(function (err /*, containers*/) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });
    it('osv2Authenticate.promise()', function (done) {
        osv2Authenticate.promise()
            .then(function (client) {
                client.getContainers(function (err/*, containers*/) {
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
});