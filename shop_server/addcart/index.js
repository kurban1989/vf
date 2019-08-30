const express = require('express');
const router = express.Router();
const config = require('../conf');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const db = require("mysql_models");
const fs = require('fs'); // Модуль для чтения файлов

// POST запорсы AJAX добавления в корзину.
router.post('/', function(req, res, next) {
    db.setData('cart',{
        id_prod: req.body.product,
        user_token: req.body.user,
        size: req.body.size
    })
    .then(function(responce){
      res.send(JSON.stringify({result: responce}));
    });
});

// POST запорс удаления товара из корзины.
router.post('/remove/', function(req, res, next) {
    db.getQuerySafe('cart', 'id_prod', req.body.product, 'deleteProd')
    .then(function(responce){
      res.send(JSON.stringify({result: responce}));
    });
});

// POST запорс Обновления количества определённого товара в корзине.
router.post('/quantity/', function(req, res, next) {
    db.updateData('cart', {quantity: req.body.quantity}, req.body.product).then(function(responce){
      res.send(JSON.stringify({result: responce}));
    });
});

// POST запорс для получения данных о добавленном товаре в корзину.
router.post('/get_info/', function(req, res, next) {
    db.getQuerySafe('products', 'id', req.body.product, 'equality')
    .then(function(responce){
      res.send(JSON.stringify({result: responce}));
    });
});
module.exports = router;