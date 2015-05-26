process.env['DATADIR'] = 'tmpdata';
var tmpData = process.env.DATADIR;
var request = require('supertest');
var express = require('express');
var fs = require('fs');
var rimraf = require('rimraf')
rimraf.sync(tmpData);
var app = require('../app.js');
var rimraf = require('rimraf')

request = request(app)

request.get('/api/vol/public')
  .expect('Content-Type', /json/)
  .expect(200)
  .expect('[]')
  .end(function(err, res){
    if (err) throw err;
  });
//request(app)
//  .put('/api/vol/public/a.txt')
//  .send({a:'b'})
//  .end(function(err, res){
//    if (err) throw err;
//  });

request.post('/api/vol/public/form')
  .attach('file', 'package.json')
  .end(function(err, res){
    if (err) throw err;
  });
  
request.get('/api/vol/public')
  .expect('Content-Type', /json/)
  .expect(200)
  .expect('[]')
  .end(function(err, res){
    if (err) throw err;
  });

request.post('/api/vol/public/form')
  .attach('file', 'package.json')
  .end(function(err, res){
    if (err) throw err;
  });
  
request.get('/api/vol/public')
  .expect('Content-Type', /json/)
  .expect(200)
  .expect('[]')
  .end(function(err, res){
    if (err) throw err;
  });
console.log('3');
