const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

router.post('/sync', syncController.syncData);

module.exports = router;
