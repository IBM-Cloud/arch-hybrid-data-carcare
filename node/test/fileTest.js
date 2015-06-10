var assert = require("assert"); // node.js core module
var request = require('supertest');
var rimraf = require('rimraf');
var fs = require('fs');
var path = require('path');

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

// Create some cruft to represent stuff left over from the last run.
// The test below will verify this gets cleaned up.
var tmpDir = path.join(tmpData, path.sep, 'tmp');
fs.mkdirSync(tmpDir);
var existingGroupDirThatShouldBeDeleted = path.join(tmpDir, path.sep, 'deadbeef-b358-442a-9383-bbe7deadbeef');
fs.mkdirSync(existingGroupDirThatShouldBeDeleted);
assert.equal(fs.existsSync(existingGroupDirThatShouldBeDeleted), true, 'created directory does not exist');

var app = require('../app.js');
var areq = request(app);

describe('filesystem testing', function () {
    it('verify clean up of cruft', function (done) {
        assert.equal(fs.existsSync(existingGroupDirThatShouldBeDeleted), false, 'file not deleted during initialization');
        done();
    });
    it('get /', function (done) {
        areq.get('/api/vol/public')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('post package.json /form', function (done) {
        areq.post('/api/vol/public/form')
            .attach('file', 'package.json')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / contains package.json', function (done) {
        areq.get('/api/vol/public')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[{"name":"package.json"}]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /package.json', function (done) {
        areq.get('/api/vol/public/package.json')
            .expect('Content-Type', /text/)
            .expect(200)
            .end(function (err, res) {
                var packageJson = fs.readFileSync('package.json', "utf8");
                if (err) return done(err);
                assert.equal(packageJson, res.text, 'package.json comparison');
                done();
                //        var writer = new memoryStream.WritableStream();
                //        res.on('end', function() {
                //          console.log(packageJson);
                //          console.log(writer.toBuffer());
                //        });
                //        res.pipe(writer);
            });
    });
    it('delete /package.json', function (done) {
        areq.delete('/api/vol/public/package.json')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / - package.json should be gone', function (done) {
        areq.get('/api/vol/public')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
});
