const config = require('../conf');
const express = require('express');
const router = express.Router();
const fs = require('fs'); // Модуль для чтения файлов
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.post('/', function (req, res) {
    fs.unlink(config.dirnameNew + req.body.img, function(err){
        if(err) {
            res.send(JSON.stringify({result: 'Error: file not found!'}));
            return console.log(err);
        }
/*Сделать проверку по куки перед Удалением файла*/
        res.send(JSON.stringify({result: 'file deleted'}));
   });
});

module.exports = router;
