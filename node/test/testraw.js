process.env['DATADIR'] = 'tmpdata';
var tmpData = process.env.DATADIR;
var request = require('supertest');
var express = require('express');
var fs = require('fs');
var rimraf = require('rimraf')
rimraf.sync(tmpData);
var app = require('../app.js');
var rimraf = require('rimraf')
var memoryStream = require('memory-streams');
var assert = require('assert');


request = request(app)

var packageJson = fs.readFileSync('package.json', "utf8");

request.post('/api/vol/public/form')
  .attach('file', 'package.json')
  .end(function(err, res){
    if (err) throw err;
    request.get('/api/vol/public/package.json')
      .expect('Content-Type', /text/)
      .expect(200)
      .end(function(err, res){
        if (err) throw err;
//        console.log(res.text);
        console.log(packageJson);
        console.log(res.text);
        assert.equal(packageJson, res.text, 'package.json comparison');
//        var writer = new memoryStream.WritableStream();
//        res.on('end', function() {
//          console.log(packageJson);
//          console.log(writer.toBuffer());
//        });
//        res.pipe(writer);
      });
    });
  
//request.get('/api/vol/public/package.json')
//  .expect('Content-Type', /json/)
//  .expect(200)
//  .end(function(err, res){
//    if (err) throw err;
//    console.log(res.text);
//  });
//
//request.get('/api/vol/public')
//  .expect('Content-Type', /json/)
//  .expect(200)
//  .expect('[]')
//  .end(function(err, res){
//    if (err) throw err;
//  });
//
//request.post('/api/vol/public/form')
//  .attach('file', 'package.json')
//  .end(function(err, res){
//    if (err) throw err;
//  });
//  
//request.get('/api/vol/public')
//  .expect('Content-Type', /json/)
//  .expect(200)
//  .expect('[]')
//  .end(function(err, res){
//    if (err) throw err;
//  });
//console.log('3');
