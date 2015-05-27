var assert = require("assert"); // node.js core module
process.env['DATADIR'] = 'tmpdata';
var tmpData = process.env.DATADIR;
var request = require('supertest');
var express = require('express');
var fs = require('fs');
var rimraf = require('rimraf')
rimraf.sync(tmpData);
var app = require('../app.js');
var rimraf = require('rimraf')

var areq = request(app)

describe('filesystem testing', function(){
  it('get /', function(done){
      areq.get('/api/vol/public')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect('[]')
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
  });
  it('post package.json /form', function(done){
      areq.post('/api/vol/public/form')
        .attach('file', 'package.json')
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
  });
  it('get / contains package.json', function(done){
      areq.get('/api/vol/public')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect('[{"filename":"package.json"}]')
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
  });
  it('get /package.json', function(done){
      areq.get('/api/vol/public/package.json')
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function(err, res){
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
  it('delete /package.json', function(done){
      areq.delete('/api/vol/public/package.json')
      .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
  });
  it('get / - package.json should be gone', function(done){
      areq.get('/api/vol/public')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect('[]')
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
  });
});
