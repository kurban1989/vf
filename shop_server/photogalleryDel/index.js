const config = require('../conf');
const express = require('express');
const router = express.Router();
const fs = require('fs'); // Модуль для чтения файлов
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Проверка прав юзера перед Удалением файла
router.all('*', async (req, res, next) => {
  if (!req.cookies || !req.cookies.ust) {
    res.status(401).send("<p>Sorry, Unauthorized! <br> You need authorize!</p><br><p><b>Error 401 </b></p><br><br><a href='/account/login/'>LOGIN<a>");
    return
  } else {
    const token = await db.getQuery('SELECT * FROM `sessions` WHERE `token_session`="' + req.cookies.ust + '";');
    const user = await db.getQuery('SELECT * FROM `vfuser` WHERE `id`=' + token[0].user_id + ';');

    if (user.length > 0 && token.length > 0) {
      if (user[0].prava !== 'artem') {
        res.status(403).send("<p>Sorry, Forbidden! </p><br><p><b>Error 403 </b></p><br><br><a href='/account/login/'>LOGIN<a>");
        return
      }
    } else {
      res.status(403).send("<p>Sorry, Forbidden! </p><br><p><b>Error 403 </b></p><br><br><a href='/account/login/'>LOGIN<a>");
      return
    }
    next()
  }
});

router.post('/', function (req, res) {
  fs.unlink(config.dirnameNew + req.body.img, function(err){
    if (err) {
      res.send(JSON.stringify({result: 'Error: file not found!'}));
      return console.error(err);
    }

    res.send(JSON.stringify({result: 'file deleted'}));
   });
});

module.exports = router;
