var express = require('express');
var router = express.Router();
var volumeFile = require('../routesapi/file');
var osv2 = require('../routesapi/osv2');
var Busboy = require('busboy');
var debug = require('debug')('medicar');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Hybrid Data Store' });
});

/* GET Object Storage page. */
router.get('/osv2.html', function(req, res) {
  res.render('osv2', { title: 'Object Storage' })
});

/* GET On Premise page. */
router.get('/onprem.html', function(req, res) {
  res.render('onprem', { title: 'On Premise' })
});

/* GET vol page. */
router.get('/vol.html', function(req, res) {
  res.render('vol', { title: 'Volume on Disk' })
});

/**
 * @name Busboy#on
 * @event
 */

// Write a file from a browser form.  The transfer is done in the api post method
// The form has two inputs: 1-file and 2-text file name that can override the file name

// volume
router.post('/api/vol/public/form', postFileFromForm);
router.post('/api/vol/private/form', function(req, res) {
  req.medicar = {private: true};
  postFileFromForm(req, res);
});

function postFileFromForm(req, res) {
  var busboy = new Busboy({headers: req.headers, limits: {files: 1}});
  var finalFileName; // file name posted, overridden by a field
  busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
    debug('post /form field:' + val + ' fieldnameTruncated: ' + fieldnameTruncated + ' valTruncated: ' + valTruncated);
    if (val) {
      finalFileName = val; // override the file name
    }
  });
  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    debug('post /form file:' + filename + ' encoding: ' + encoding + ' mimetype: ' + mimetype);
    if (!finalFileName) {
      finalFileName = filename; // if the file name has not been overridden use this one
    }
    volumeFile.post(req, res, file, finalFileName, function() {
      debug('post finish /form: ' + finalFileName);
      res.render('vol', {title: 'Volume on Disk'});
    });
  });
  req.pipe(busboy);
}

// osv2
router.post('/api/obj/public/form', postObjFromForm);
router.post('/api/obj/private/form', function(req, res) {
  req.medicar = {private: true};
  postObjFromForm(req, res);
});

function postObjFromForm(req, res) {
  debug('post osv2 /form');
  var busboy = new Busboy({headers: req.headers, limits: {files: 1}});
  var finalFileName; // file name posted, overridden by a field
  busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
    debug('post /form field:' + val + ' unused fieldnameTruncated: ' + fieldnameTruncated + ' unused valTruncated: ' + valTruncated);
    if (val) {
      finalFileName = val; // override the file name
    }
  });
  busboy.on('finish', function () {
    debug('post /form complete to: ' + finalFileName);
  });
  // the file is the input stream coming from the file
  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    debug('post /form file: ' + filename + ' unused encoding:' + encoding + ' unused mimetype: ' + mimetype);
    if (!finalFileName) {
      finalFileName = filename; // if the file name has not been overridden use this one
    }
    osv2.post(req, res, file, finalFileName, function(res) {
      debug('post finish /form: ' + finalFileName);
      res.render('osv2', {title: 'Object Storage'});
    });
  });
  req.pipe(busboy);
}

module.exports = router;