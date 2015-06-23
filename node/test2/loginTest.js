var assert = require("assert"); // node.js core module
var request = require('supertest');

var app = require('../app.js');
var areq = request(app);

describe('login testing', function () {
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
    it('post good login credentials', function (done) {
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
});
