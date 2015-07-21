// environment variable setup for test setup.  see config.js
process.env.CAR_OSV2_PUBLIC_CONTAINER_NAME = 'test';
process.env.CAR_OSV2_PUBLIC_CONTAINER_DESTROY = 'true';

// normal
var assert = require("assert"); // node.js core module
var request = require('supertest');
var fs = require('fs');

var app = require('../app.js');
var areq = request.agent(app);

function verifyPackageJsonThenDelete(url){
    it('get / contains package.json', function (done) {
        areq.get(url)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                assert(res.body[0].name === 'package.json');
                done();
            });
    });
    it('get /package.json', function (done) {
        areq.get(url + '/package.json')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                var packageJson = fs.readFileSync('package.json', "utf8");
                if (err) return done(err);
                assert.equal(packageJson, res.text, 'package.json comparison');
                done();
            });
    });
    it('get / contains package.json', function (done) {
        areq.get(url)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                assert(res.body[0].name === 'package.json');
                done();
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

}

function osv2TestUrl(url) {
    it('delete /', function (done) {
        areq.delete(url)
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
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

    it('post package.json /form', function (done) {
        areq.post(url + '/form')
            .attach('file', 'package.json')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    verifyPackageJsonThenDelete(url);
}


describe('object storage public v2 tests', function () {
    osv2TestUrl('/api/obj/public');
});

describe('object storage private v2 tests', function () {
    // osv2TestUrl('/api/obj/public');
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
    osv2TestUrl('/api/obj/private');
});
