var assert = require("assert"); // node.js core module
var request = require('request');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var http = require('http');

// environment variable setup for test setup.  see config.js
var tmpData = 'tmpdata';
process.env.MR_CONTAINER = 'test';
process.env.MR_DESTROY_CONTAINER = 'true';
process.env.MR_DATADIR = tmpData;

var config = require('../config');

process.env[config.HOSTNAME] = 'host';
process.env[config.group_id] = 'group';

rimraf.sync(tmpData);
fs.mkdirSync(tmpData);

var app = require('../app.js');
var server = http.createServer(app);
console.log(server);
var server2 = app.listen(0);
console.log(app.address().port);
function fileTestUrl(url) {
    it('get /', function (done) {
        request(url, function(err, res, body) {
            if (err) return done(err);
            done();
        });
    });
}

describe('public filesystem testing', function () {
    it('verify clean up of cruft', function (done) {
        assert.equal(fs.existsSync(existingGroupDirThatShouldBeDeleted), false, 'file not deleted during initialization');
        done();
    });
    fileTestUrl('/api/vol/public');
});

