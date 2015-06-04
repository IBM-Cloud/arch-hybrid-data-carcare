'use strict';
var debug = require('debug')('medicalrecords');
var express = require('express');
var osv2Connect = require('../osv2Connect');
var config = require('../config');
var Busboy = require('busboy');

var router = express.Router();

// read the req into the fileName within the osv2 client and send appropriate res
function readRequestIntoOsv2(fileName, client, inputStream, res) {
    var container = config.container;
    debug(container + '/' + fileName);
    var options = {
        container: container,
        remote: fileName
    };
    debug('osv2 upload options: ' + JSON.stringify(options));
    var writeStream = client.upload(options);
    writeStream.on('error', function(err) {
        console.error('router.put writeStream error');
        console.error(err);
        res.status(401).end();
    });
    writeStream.on('success', function() {
        res.status(200).end();
    });
    inputStream.pipe(writeStream);
}

// Write a file
// curl -v -T /cygdrive/c/somefile -i localhost:3000/obj/storagefile -X PUT
router.put('/:file', function(req, res) {
    var fileName = req.params.file;
    debug('put /' + fileName);
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        readRequestIntoOsv2(fileName, client, req, res);
    })
});

// Write a file from a browser form
// Note the similarity to the put function above.  Is there a way for a browser to use the mechanism above?
// The form has two inputs: 1-file and 2-text file name that can override the file name
// TODO this does not work.
router.post('/form', function (req, res) {
    debug('post /form');
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
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
            debug('post /form file:' + filename + ' unused encoding:' | encoding + ' unused mimetype: ' + mimetype);
            if (!finalFileName) {
                finalFileName = filename; // if the file name has not been overridden use this one
            }
            readRequestIntoOsv2(finalFileName, client, file, res);
        });
        req.pipe(busboy);
    });
});

// read a file
// curl -v localhost:3000/obj/a.txt
router.get('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('get /' + fileName);
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        var container = config.container;
        debug(container + '/' + fileName);
        var options = {
            container: container,
            remote: fileName
        };
        debug('osv2 download options: ' + options);
        client.download(options, function (err) {
            if (err) {
                console.error('client.download failed');
                console.error(err)
            }
        }).pipe(res);
    })
});

// read the table of contents
// curl -v localhost:3000/obj/a.txt
router.get('/', function (req, res) {
    debug('get /');
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        debug('authentic client: ' + client._identity);
        var container = config.container;
        debug(container);
        client.getFiles(container, function (err, files) {
            if (err) {
                console.error('getFiles failed');
                console.error(err);
            } else {
                res.json(files).end();
            }
        });
    });
});

// delete a file
// curl -v localhost:3000/obj/swagger.yaml -X DELETE
router.delete('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('delete /' + fileName);
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        var container = config.container;
        debug('removeFile ' + container + '/' + fileName);
        client.removeFile(container, fileName, function (err) {
            if (err) {
                console.log('remove file failed with err: ' + err);
                res.status(404).json(err).end();
                return;
            }
            res.status(200).end();
        });
    });
});

module.exports = router;