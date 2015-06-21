var express = require('express');
var router = express.Router();

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

module.exports = router;
