var assert = require("assert"); // node.js core module
var request = require('supertest');
var rimraf = require('rimraf');
var fs = require('fs');
var path = require('path');

// environment variable setup for test setup.  see config.js
var tmpData = 'tmpdata';
process.env.CAR_OSV2_PUBLIC_CONTAINER_NAME = 'test';
process.env.CAR_OSV2_PUBLIC_CONTAINER_DESTROY = 'true';
process.env.CAR_FILE_DATADIR = tmpData;

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
var areq = request.agent(app);
function verifyPackageJsonThenDelete(url) {

    it('get /package.json', function (done) {
        areq.get(url + '/package.json')
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
        areq.delete(url + '/package.json')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / - package.json should be gone', function (done) {
        areq.get(url)
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get should fail /package.json', function (done) {
        areq.get(url + '/package.json')
            .expect(404)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
}

function fileTestUrl(url) {
    it('get /', function (done) {
        areq.get(url)
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('post package.json /form', function (done) {
        areq.post(url + '/form')
            .attach('file', 'package.json')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / contains package.json', function (done) {
        areq.get(url)
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[{"name":"package.json"}]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    verifyPackageJsonThenDelete(url);
    it('put package.json /', function (done) {
        var req = areq.put(url + '/package.json');
        var fileStream = fs.createReadStream('package.json');
        req.on('response', function() {
            done();
        });
        req.on('error', function(err) {
            done(err);
        });
        fileStream.pipe(req);
    });
    verifyPackageJsonThenDelete(url);
}

describe('public filesystem testing', function () {
    it('verify clean up of cruft', function (done) {
        assert.equal(fs.existsSync(existingGroupDirThatShouldBeDeleted), false, 'file not deleted during initialization');
        done();
    });
    fileTestUrl('/api/vol/public');
});

describe('private filesystem testing', function () {
    it('post bad login credentials', function (done) {
        areq
            .post('/login')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('username=x&password=x')
            .expect(302)    // expecting a redirect back to the login page on bad passwords
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / when not logged in', function (done) {
        areq.get('/api/vol/private')
            .expect(401)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('post good login credentials and stay logged in for the rest of the tests', function (done) {
        areq
            .post('/login')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('username=powell&password=ppw')
            .expect(302)    // todo keep synced with code
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    fileTestUrl('/api/vol/private');
    it('get /logout when logged in', function (done) {
        areq.get('/logout')
            .expect(302)    // redirect to /
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /api/vol/private should fail', function (done) {
        areq.get('/api/vol/private')
            .expect(401) // not logged in
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /api/vol/private with basic authentication', function (done) {
        auth = "Basic " + new Buffer('powell' + ":" + 'ppw').toString("base64");
        areq.get('/api/vol/private')
            .expect(200)
            .set('Authorization', auth)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /api/vol/private after basic creds should fail the creds are not persisted in the session', function (done) {
        areq.get('/api/vol/private')
            .expect(401) // not logged in
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /api/vol/private with basic authentication wit bad creds should fail', function (done) {
        auth = "Basic " + new Buffer('x' + ":" + 'x').toString("base64");
        areq.get('/api/vol/private')
            .expect(401) // not logged in
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
});