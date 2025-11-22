const express = require('express');
const { sendMessage } = require('./chat.controller.js');

const router = express.Router();

// Exponer solo POST / (se montará en /api/chat)
router.post('/', sendMessage);

module.exports = router;
