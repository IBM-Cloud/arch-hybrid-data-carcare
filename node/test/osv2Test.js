// environment variable setup for test setup.  see config.js
process.env.MR_CONTAINER = 'test';
process.env.MR_DESTROY_CONTAINER = 'true';

// normal
var assert = require("assert"); // node.js core module
var request = require('supertest');
var fs = require('fs');

var app = require('../app.js');
var areq = request(app);

describe('object storage v2 tests', function () {
    it('get /', function (done) {
        areq.get('/api/obj/public')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('post package.json /form', function (done) {
        areq.post('/api/obj/public/form')
            .attach('file', 'package.json')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / contains package.json', function (done) {
        areq.get('/api/obj/public')
            .expect('Content-Type', /json/)
            .expect(200)
            //.expect('[{"filename":"package.json"}]')
            .expect(function (res) {
                assert(res.body[0].name === 'package.json');
            })
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get /package.json', function (done) {
        areq.get('/api/obj/public/package.json')
            .expect('Content-Type', /json/)
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
        areq.delete('/api/obj/public/package.json')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('get / - package.json should be gone', function (done) {
        areq.get('/api/obj/public')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('[]')
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });
});
