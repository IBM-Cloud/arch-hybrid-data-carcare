'use strict';
var debug = require('debug')('medicalrecords');
var express = require('express');
var router = express.Router();
var http = require('http');
var config = require('../config');

// create a copy off the req headers appropriate for onprem
// Is it best to choose the headers to pass through, or filter out the ones that don't make sense?
function createOnpremReqHeaders(req) {
    var ret = {};
    var filter = {connection: true, host: true};
    for (var key in req.headers) {
        if (req.headers.hasOwnProperty(key)) {
            if (!filter[key]) {
                ret[key] = req.headers[key];
            }
        }
    }
    return ret;
}

// create copy off the res headers from the onprem response
function createResHeaders(onpremRes) {
    var ret = {};
    var filter = {connection: true, host: true};
    for (var key in onpremRes.headers) {
        if (onpremRes.headers.hasOwnProperty(key)) {
            if (!filter[key]) {
                ret[key] = onpremRes.headers[key];
            }
        }
    }
    return ret;
}

router.all('*', function (req, res) {
    var onpremReqOption = {
        hostname: config.onpremHost,
        port: config.onpremPort,
        method: req.method,
        //
        path: req.originalUrl.replace(/^\/[^\/]+\/[^\/]+\/(.*)/, '/api/vol/$1')
    };
    if (req.auth) {onpremReqOption.auth = req.auth;}

    var onpremReqHeaders = createOnpremReqHeaders(req);

    onpremReqOption.headers = onpremReqHeaders;

    var onpremiseReq = http.request(onpremReqOption, function(onpremRes) {
        console.log('got response');

        res.set(createResHeaders(onpremRes));
        onpremRes.pipe(res);
        onpremRes.on('end', function () {
            console.log('response done');
        })
    });

    req.pipe(onpremiseReq);
    req.on('end', function () {
       // onpremiseReq.end();
    });

    //req.on('response', function (onpremiseRes) {
    //    onpremiseRes.pipe(res);
    //});
});

module.exports = router;
