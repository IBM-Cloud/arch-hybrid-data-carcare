'use strict';
var express = require('express');
var router = express.Router();
var url = require('url');
var Busboy = require('busboy');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf')
var sanitizeFilename = require('sanitize-filename');
var debug = require('debug')('file');

/*
use the DATADIR environment if available otherwise use /data
/data/storage - storage
/data/tmp - temporary download
*/

var dataDir = process.env.DATADIR || path.join(path.sep, 'data');
var storageDir = path.join(dataDir, path.sep, 'storage');
var tmpDir = path.join(dataDir, path.sep, 'tmp');
var tmpFileNumber = 0;

function mkdir(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (e) {
    if(e.hasOwnProperty('code') && e.code === 'EEXIST') return;
    console.log(e);
    throw(e);
  }
}

mkdir(dataDir, "755");
mkdir(storageDir, "755");
rimraf.sync(tmpDir);
mkdir(tmpDir, "755");

// Verify the filename is sane
function saneFilename(fileName) {
  var sane = sanitizeFilename(fileName, {replacement:'_'});
  if (sane !== fileName) {
    throw "Bad filename try " + sane;
  }
  return fileName;
}
// generate a unique tmp file name
function tmpFilename() {return path.join(tmpDir, String(tmpFileNumber++));}
function storageFilename(fileName) {return path.join(storageDir, saneFilename(fileName));}

// Write a file
// curl -v -T /cygdrive/c/somefile -i localhost:3000/volume/storagefile -X PUT
router.put('/:file', function(req, res, next) {
  var fileName = req.params.file;
  debug('put /' + fileName);
  var tmpFile = tmpFilename();
  req.on('end', function() {
    fs.rename(tmpFile, storageFilename(fileName));
    res.end();
  });
  req.pipe(fs.createWriteStream(tmpFile));
});

// Write a file from a browser form
// Note the similarity to the put function above.  Is there a way for a browser to use the mechanism above?
// The form has two inputs: 1-file and 2-text file name that can override the file name
router.post('/form', function(req, res, next) {
  var busboy = new Busboy({ headers: req.headers, limits:{files:1} });
  var finalFileName; // file name posted, overridden by a field
  var tmpFile = tmpFilename();
  busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
    debug('post /form field:' + val);
    if (val) {
      finalFileName = val; // override the file name
    }
  });
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    debug('post /form file:' + filename);
    if (!finalFileName) {
      finalFileName = filename; // if the file name has not been overridden use this one
    }
    file.pipe(fs.createWriteStream(tmpFile));
  });
  busboy.on('finish', function() {
    debug('post /form rename:' + tmpFile + '->' + finalFileName);
    var storageFinalName = storageFilename(finalFileName);
    res.writeHead(201, ''); // todo
    
    fs.rename(tmpFile, storageFinalName, function(){res.end();});
  });
  req.pipe(busboy);
});

// return all of the files in the storage directory.  See swagger spec:
// $ref: "#/definitions/fileDescription"
// [{name:filename}, ...]
router.get('/', function getFiles (req, res, next) {
  debug('get /');
  fs.readdir(storageDir, function(err, files) {
    if (err) {
      res.status(404).json(err).end();
      return;
    }
    var ret = [];
    for (var i = 0; i < files.length; i++) {
      ret.push({'filename': files[i]});
    }
    res.status(200).json(ret).end();
  });
});

// read a file
// curl -v localhost:3000/volume/a.txtx
router.get('/:file', function getFile (req, res, next) {
  var fileName = req.params.file;
  debug('get /' + fileName);
  var filePath = storageFilename(fileName);
  fs.stat(filePath, function(err, stat){
    if (err) {
      res.status(404).json(err).end();
      return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': stat.size
    });
  
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

// delete a file
// curl -v localhost:3000/volume/swagger.yaml -X DELETE
router.delete('/:file', function (req, res, next) {
  var fileName = req.params.file;
  debug('delete /' + fileName);
  var filePath = storageFilename(fileName);
  fs.unlink(filePath, function(err){
    if (err) {
      res.status(404).json(err).end();
      return;
    }
    res.status(200).end();
  });
});

module.exports = router;