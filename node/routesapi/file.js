'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var sanitizeFilename = require('sanitize-filename');
var debug = require('debug')('medicar');
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
var privateDir = ret.privateDir;
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
    var privateDir = path.join(dataDir, path.sep, 'private');
    var group_id = saneFilename(process.env[config.group_id] || '53bedaf5-b358-442a-9383-bbe7243b6036');
    var HOSTNAME = saneFilename(process.env[config.HOSTNAME] || 'instance-0001bd54');
    var tmpDir = path.join(dataDir, path.sep, 'tmp');
    var groupDir = path.join(tmpDir, path.sep, group_id);
    var hostDir = path.join(groupDir, path.sep, HOSTNAME);

    // create my directories
    mkdir(dataDir, "755");
    mkdir(storageDir, "755");
    mkdir(privateDir, "755");
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
    return {myTmpDir: hostDir, storageDir: storageDir, privateDir: privateDir};
}

// support the API


// given just a req and a fileName return a storage dir
function storageFilename(req, fileName) {
    return path.join(getStorageDirCreateIfNeeded(req), saneFilename(fileName));
}

// req contains the user id needed to determine the path for private files
function getStorageFilenameCreateParentDirIfNeeded(req, fileName) {
    return path.join(getStorageDirCreateIfNeeded(req), saneFilename(fileName));
}

// requests to the private URLs have been marked by earlier layers
function privateReq(req) {
    return req.medicar && req.medicar.private;
}

// get the public or a user specific private directory
function getStorageDirCreateIfNeeded(req) {
    if (privateReq(req)) {
        var privateDirectory = path.join(privateDir, saneFilename(req.user.id));
        if (!fs.existsSync(privateDirectory)) {
            fs.mkdirSync(privateDirectory);
        }
        return privateDirectory;
    } else {
        return storageDir;
    }
}

// write a file from a stream through a temp file then rename to a destination
// file path where the parent directory already exists.
function writeFileFromStream(readStream, destinationFilePath, callback) {
    var tmpFile = tmpFilename();
    debug('write to file: ' + tmpFile + ' then rename to: ' + destinationFilePath);
    var writeFileStream = fs.createWriteStream(tmpFile);
    writeFileStream.on("error", function(err) {
        throw(err); // not recovering from this
    });
    writeFileStream.on('finish', function () {
        fs.rename(tmpFile, destinationFilePath, function (err) {
            debug('rename to: ' + destinationFilePath);
            if (err) {
                return callback(err);
            } else {
                callback();
            }
        });
    });
    readStream.pipe(writeFileStream);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Write a file from a stream provided by the GUI.  No part of the REST API
module.exports.post = function(req, res, readStream, fileName, callback) {
    debug('post file from gui /' + fileName);
    var destinationFileName = getStorageFilenameCreateParentDirIfNeeded(req, fileName);
    writeFileFromStream(readStream, destinationFileName, function (err) {
        if (callback) {
            if (err) {
                callback(err)
            } else {
                callback(false);
            }
        }
    });
};

// REST API

// Write a file
// curl -v -T /cygdrive/c/somefile -i localhost:3000/volume/storagefile -X PUT
router.put('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('put /' + fileName);
    var destinationFilePath = storageFilename(req, fileName);
    writeFileFromStream(req, destinationFilePath, function(err) {
        if (err) {
            res.status(404).json(err).end();
        } else {
            res.end();
        }
    });
});

// return all of the files in the storage directory.  See swagger spec:
// $ref: "#/definitions/fileDescription"
// [{name:filename}, ...]
router.get('/', function getFiles(req, res) {
    debug('get file /');
    fs.readdir(getStorageDirCreateIfNeeded(req), function (err, files) {
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
    var filePath = storageFilename(req, fileName);
    fs.stat(filePath, function (err, stat) {
        if (err) {
            return res.status(404).json(err).end();
        }
        fs.open(filePath, 'r', function(err, fd) {
            if (err) {
                return res.status(404).json(err).end();
            }
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(null, {fd: fd});
            readStream.on('error', function(err) {
                console.error(err);
                return res.status(404).json(err).end();
            });
            readStream.pipe(res);
        });
    });
});

// delete a file
// curl -v localhost:3000/volume/swagger.yaml -X DELETE
router.delete('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('delete /' + fileName);
    var filePath = storageFilename(req, fileName);
    fs.unlink(filePath, function (err) {
        if (err) {
            res.status(404).json(err).end();
            return;
        }
        res.status(200).end();
    });
});

module.exports.router = router;