'use strict';
var debug = require('debug')('medicar');
var express = require('express');
var osv2Connect = require('../osv2Initialize');
var config = require('../config');

var router = express.Router();
var privateBaseUrl = '/api/obj/private';

// container name is either the user id (if it is a private url) or the public name from the config
function privateReq(req) {
    return req.baseUrl === privateBaseUrl;
}
function containerNameFromBoolAndReq(privateName, req) {
    if (privateName) {
        return req.user.id;
    } else {
        return config.container;
    }
}
function containerNameFromReq(req) {
    return containerNameFromBoolAndReq(privateReq(req), req);
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
        writeResCallback(err)
    });
    writeStream.on('success', function() {
       writeResCallback(false, res);
    });
    inputStream.pipe(writeStream);
}

// Perform the operation.  If the operation fails because the container does not exist
// then create the container and then perform the operation again.
// Send the error response on error.  If the operation is successful then the operation should send the
// response
function performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerName, operation) {
    debug('container: ' + containerName);
    osv2Connect.callbackWithClientOrRespondOnError(res, function (client) {
        debug('authentic client region: ' + client.region);
        operation(req, res, client, containerName, function (err) {
            if (err) {
                if (err.failCode === 'Item not found') {
                    debug('creating container: ' + containerName);
                    client.createContainer({name: containerName}, function (err, createdContainer) {
                        if (err) {
                            console.error('osv2 create container failed for: ' + containerName);
                            res.status(500).json(err);
                        } else {
                            debug('created container: ' + JSON.stringify(createdContainer));
                            operation(req, res, client, containerName, function (err) {
                                if (err) {
                                    res.status(500).json(err);
                                }
                            });
                        }
                    });
                }
            }
        });
    });
}

// Write a file from a stream provided by the GUI.  No part of the REST API
module.exports.post = function(req, res, readStream, fileName, privateName, callback) {
    debug('post obj from gui /' + fileName);
    performOperationIfFailCreateContainerPerformOperationAgain(req, res, containerNameFromBoolAndReq(privateName, req), function (req, res, client, containerName, againCallback) {
        readRequestIntoOsv2(req, res, containerName, fileName, client, readStream, function(err, res) {
            if (err) {
                againCallback(err);
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
                againCallback(err);
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
                againCallback(err);
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
                res.status(500).json(err);
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
                callback(err);
            } else {
                res.status(200).end();
            }
        });
    });
});

module.exports.router = router;