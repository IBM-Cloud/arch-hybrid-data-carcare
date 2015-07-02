'use strict';
var debug = require('debug')('medicar');
var express = require('express');
var osv2Connect = require('../osv2Initialize');
var config = require('../config');

var router = express.Router();

// requests to the private URLs have been marked by earlier layers
function privateReq(req) {
    return req.medicar && req.medicar.private;
}

// container name is either the user id (if it is a private url) or the public name from the config
function containerNameFromReq(req) {
    if (privateReq(req)) {
        return req.user.id;
    } else {
        return config.container;
    }
}

// read the req into the fileName within the osv2 client and send appropriate res
function readRequestIntoOsv2(req, res, containerName, fileName, client, inputStream, writeResCallback) {
    debug(containerName + '/' + fileName);
    var options = {
        container: containerName,
        remote: fileName
    };
    debug('osv2 upload options: ' + JSON.stringify(options));
    var writeStream = client.upload(options);
    writeStream.on('error', function(err) {
        writeResCallback(err, res);
    });
    writeStream.on('success', function() {
       writeResCallback(false, res);
    });
    inputStream.pipe(writeStream);
}

// examine the req and the error code returned from the object storge
// command and return true if it is likely that the container does not exist
function maybeContainerDoesNotExist(req, err) {
    return (err.failCode && err.failCode === 'Item not found');
}

// Connect to the osv2 service singleton to get the client.
// Call the provided operation with the client and providing a callback to perform the operation again if desired.
// If the callback requests and the error looks like it may be happening because the container does not exist create the container
// and call the operation again.
// Send the error response on error.  If the operation is successful then the operation should send the
// response
function performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerName, operation) {
    debug('container: ' + containerName);
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        debug('authentic client region: ' + client.region);
        operation(req, res, client, containerName, function (err) {
            if (err) {
                if (maybeContainerDoesNotExist(req, err)) {
                    debug('creating container: ' + containerName);
                    client.createContainer({name: containerName}, function (err, createdContainer) {
                        if (err) {
                            console.error('osv2 create container failed for: ' + containerName);
                            res.status(500).json(err).end();
                        } else {
                            debug('created container: ' + JSON.stringify(createdContainer));
                            operation(req, res, client, containerName, function (err) {
                                if (err) {
                                    res.status(404).json(err).end();
                                }
                            });
                        }
                    });
                } else {
                    res.status(500).json(err);
                }
            }
        });
    });
}

// Write a file from a stream provided by the GUI.  No part of the REST API
module.exports.post = function(req, res, readStream, fileName, callback) {
    debug('post obj from gui /' + fileName);
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromReq(req), function (req, res, client, containerName, againCallback) {
        readRequestIntoOsv2(req, res, containerName, fileName, client, readStream, function(err, res) {
            if (err) {
                res.status(404).json(err).end();
            } else {
                callback && callback(res);
            }
        });
    });
};

// Write a file
// curl -v -T /cygdrive/c/somefile -i localhost:3000/obj/storagefile -X PUT
router.put('/:file', function(req, res) {
    var fileName = req.params.file;
    debug('put osv2 /' + fileName);
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromReq(req), function (req, res, client, containerName, againCallback) {
        readRequestIntoOsv2(req, res, containerName, fileName, client, req, function(err, res) {
            if (err) {
                res.status(404).json(err).end();
            } else {
                res.status(200).end();
            }
        });
    });
});

// read a file
// curl -v localhost:3000/obj/a.txt
router.get('/:file', function (req, res) {
    // todo return res.status(200).end();
    var fileName = req.params.file;
    debug('get osv2 /' + fileName);
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromReq(req), function (req, res, client, containerName, againCallback) {
        debug(containerName + '/' + fileName);
        var options = {
            container: containerName,
            remote: fileName
        };
        debug('osv2 download options: ' + JSON.stringify(options));
        client.download(options, function (err) {
            if (err) {
               // res.status(404).json(err).end();
            }
        }).pipe(res);
    });
});

// read the table of contents
// curl -v localhost:3000/obj/a.txt
router.get('/', function (req, res) {
    debug('get osv2 /');
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromReq(req), function (req, res, client, containerName, callback) {
        client.getFiles(containerName, function (err, files) {
            if (err) {
                callback(err);
            } else {
                res.json(files).end();  // success
                callback();
            }
        });
    });
});

router.delete('/', function (req, res) {
    debug('delete osv2 container /');
    if (!privateReq(req)){return res.end();}  // deleting the public container is not supported
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        var container = containerNameFromReq(req);
        client.destroyContainer(container, function (err) {
            if (err) {
                console.error('osv2 destroy container failed:' + container);
                res.status(404).json(err).end();
            } else {
                debug('osv2 container destroyed: ' + container);
                res.end();
            }
        });
    });
});

// delete a file
// curl -v localhost:3000/obj/swagger.yaml -X DELETE
router.delete('/:file', function (req, res) {
    var fileName = req.params.file;
    debug('delete osv2 /:' + fileName);
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromReq(req), function (req, res, client, containerName, callback) {
        debug('removeFile ' + containerName + '/' + fileName);
        client.removeFile(containerName, fileName, function (err) {
            if (err) {
                res.status(404).json(err).end();
            } else {
                res.status(200).end();
            }
        });
    });
});

module.exports.router = router;