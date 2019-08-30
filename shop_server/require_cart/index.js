const express = require('express');
const router = express.Router();
const config = require('../conf');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const utils = require('../utils');
const util = new utils();
const db = require("mysql_models");

// POST запорсы AJAX добавленых товаров в корзину.
router.post('/', function(req, res, next) {
    util.renderCart(req, db).then(function(resultRenderCart) {
        if(resultRenderCart.length > 5) {
          res.send(JSON.stringify({result: resultRenderCart}));
        }
    });
});

module.exports = router;