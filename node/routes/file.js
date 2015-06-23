'use strict';
var express = require('express');
var router = express.Router();
var Busboy = require('busboy');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var sanitizeFilename = require('sanitize-filename');
var debug = require('debug')('file');
var lockfile = require('lockfile');
var config = require('../config');

/*
 use the DATADIR environment if available otherwise use /data
 /data/storage - storage
 /data/tmp - temporary download directory organized by group and hostname
 /data/tmp/group_id/HOSTNAME - temporary directory for my instance to put files

 At startup the above directory structure will be created if it does not exist.
 All group_ids that are not mine will be deleted to clean up in case of cruft left around from previous runs
*/

var ret = createStorageDirectoriesAndClean();
var myTmpDir = ret.myTmpDir;
var storageDir = ret.storageDir;
var tmpFileNumber = 0;

// make the directory and if it already exists do not fail
function mkdir(dir) {
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        if (e.hasOwnProperty('code') && e.code === 'EEXIST') return;
        console.log(e);
        throw(e);
    }
}

// Verify the filename is sane
function saneFilename(fileName) {
    var sane = sanitizeFilename(fileName, {replacement: '_'});
    if (sane !== fileName) {
        throw "Bad filename try " + sane;
    }
    return fileName;
}
// generate a unique tmp file name
function tmpFilename() {
    return path.join(myTmpDir, String(tmpFileNumber++));
}
function storageFilename(fileName) {
    return path.join(storageDir, saneFilename(fileName));
}

// delete the file or directory and log it
function cleanupFileOrDirectory(deleteMe) {
    if (fs.existsSync(deleteMe)) {
        console.log('cleaning up, deleting: ' + deleteMe);
        rimraf.sync(deleteMe);
    }
}

function createStorageDirectoriesAndClean() {
    var dataDir = config.dataDir;
    var storageDir = path.join(dataDir, path.sep, 'storage');
    var group_id = saneFilename(process.env[config.group_id] || '53bedaf5-b358-442a-9383-bbe7243b6036');
    var HOSTNAME = saneFilename(process.env[config.HOSTNAME] || 'instance-0001bd54');
    var tmpDir = path.join(dataDir, path.sep, 'tmp');
    var groupDir = path.join(tmpDir, path.sep, group_id);
    var hostDir = path.join(groupDir, path.sep, HOSTNAME);

    // create my directories
    mkdir(dataDir, "755");
    mkdir(storageDir, "755");
    mkdir(tmpDir, "755");
    mkdir(groupDir, "755");

    //////////////////////////////////////////////////////
    // Lock will insure one container at a time passes through this code
    var physicalLockFile = path.join(dataDir, path.sep, 'lockfile.lock');
    var lockFile = require('lockfile');
    lockFile.lockSync(physicalLockFile);

    // Delete the files and directories in the tmp directory that are not the current container group
    var files = fs.readdirSync(tmpDir);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file !== group_id) {
            cleanupFileOrDirectory(path.join(tmpDir, path.sep, files[i]));
        }
    }

    lockFile.unlockSync(physicalLockFile);
    // Unlock
    //////////////////////////////////////////////////////

    cleanupFileOrDirectory(hostDir);
    mkdir(hostDir, "755");
    return {myTmpDir: hostDir, storageDir: storageDir};
}

// Write a file
// curl -v -T /cygdrive/c/somefile -i localhost:3000/volume/storagefile -X PUT
router.put('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('put /' + fileName);
    var tmpFile = tmpFilename();
    req.on('end', function () {
        fs.rename(tmpFile, storageFilename(fileName));
        res.end();
    });
    req.pipe(fs.createWriteStream(tmpFile));
});

/**
 * @name Busboy#on
 * @event
 */

// Write a file from a browser form
// Note the similarity to the put function above.  Is there a way for a browser to use the mechanism above?
// The form has two inputs: 1-file and 2-text file name that can override the file name
router.post('/form', function (req, res) {
    var busboy = new Busboy({headers: req.headers, limits: {files: 1}});
    var finalFileName; // file name posted, overridden by a field
    var tmpFile = tmpFilename();
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
        file.pipe(fs.createWriteStream(tmpFile));
    });
    busboy.on('finish', function () {
        debug('post /form rename:' + tmpFile + '->' + finalFileName);
        var storageFinalName = storageFilename(finalFileName);
        // commenting - when using res.render(), you don't need to handle response manually i.e no need to call res.writeHead().
        // refer http://stackoverflow.com/questions/11676556/node-js-express-jade-error-cant-set-headers-after-they-are-sent
        //res.writeHead(200, { 'content-type': 'text/html' }); // todo
        res.render('vol', { title: 'Volume on Disk' });

        fs.rename(tmpFile, storageFinalName, function () {
            res.end();
        });
    });
    req.pipe(busboy);
});

// return all of the files in the storage directory.  See swagger spec:
// $ref: "#/definitions/fileDescription"
// [{name:filename}, ...]
router.get('/', function getFiles(req, res) {
    debug('get /');
    fs.readdir(storageDir, function (err, files) {
        if (err) {
            res.status(404).json(err).end();
            return;
        }
        var ret = [];
        for (var i = 0; i < files.length; i++) {
            ret.push({'name': files[i]});
        }
        res.status(200).json(ret);
    });
});

// read a file
// curl -v localhost:3000/volume/a.txtx
router.get('/:file', function getFile(req, res) {
    var fileName = req.params.file;
    debug('get /' + fileName);
    var filePath = storageFilename(fileName);
    fs.stat(filePath, function (err, stat) {
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
router.delete('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('delete /' + fileName);
    var filePath = storageFilename(fileName);
    fs.unlink(filePath, function (err) {
        if (err) {
            res.status(404).json(err).end();
            return;
        }
        res.status(200).end();
    });
});

module.exports = router;
