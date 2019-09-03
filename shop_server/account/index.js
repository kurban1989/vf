const config = require('../conf');
const https = require('https');
const crypto = require('crypto');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const express = require('express');
const router = express.Router();
const utils = require('../utils');
const util = new utils();
const db = require("mysql_models");
const auth = require("auth");
const fs = require('fs'); // Модуль для чтения файлов
const mobileMenu = config.pagesPath + '/menu/mobile_menu.ejs'; // Путь до мобильного меню
const footer = fs.readFileSync(config.viewMain + '/footer.ejs', 'utf8');
const bcrypt = require("bcrypt");
const uuidv1 = require('uuid/v1');
const modalErr = fs.readFileSync(config.modalPath + '/modalErr.ejs', 'utf8');
let cart = fs.readFileSync(config.pagesPath + '/cart.ejs', 'utf8');

// Опции рендера страницы
const optionsMain = {
  title : '',
  h1 : '',
  nav : '',
  picture : '',
  footer : footer,
  cart : cart,
  mobileMenu : mobileMenu,
  bodyMain : '',
  main : '',
  modalSizes : modalErr,
  discription : '',
  admin: false
};

router.get('/login', async function(req, res, next) {
  if (req.cookies && req.cookies.ust) {
    res.redirect(config.fullDomain + '/account/inside');
    return
  } else {
    next();
  }
})

router.get('/:page', async (req, res, next) => {
const userToken = req.cookies.add2cart_for_users || '';

switch(req.params.page) {
  case 'login' :
    optionsMain.title = 'Войти в личный кабинет';
    optionsMain.discription = 'Войти в личный кабинет, чтобы получить больше предложений и информации';
    optionsMain.h1 = 'Войти в личный кабинет VF';
    break;
  case 'register' :
    optionsMain.title = 'Регистрация аккаунта';
    optionsMain.discription = 'Регистрация нового аккаунта в интернет магазине нижнего белья для женщин';
    optionsMain.h1 = 'Регистрация аккаунта';
    break;
  case 'inside' :
    optionsMain.title = 'Добро пожаловать';
    optionsMain.discription = 'личный кабинет';
    optionsMain.h1 = 'Добро пожаловать в свой аккаунт';
    break;
  case 'forgot' :
    optionsMain.title = 'Восстановление пароля';
    optionsMain.discription = 'Восстановление пароля';
    optionsMain.h1 = 'Восстановление пароля через email';
    break;
}

if(req.params.page === 'inside') {
  
  if (!req.cookies || !req.cookies.ust) {
    res.status(401).send("<p>Sorry, Unauthorized! <br><br> You need authorize!</p><br><p><b>Error 401 </b></p><br><br><a href='/account/login/'>LOGIN<a>");
    return
  } else {
    const token = await db.getQuery('SELECT * FROM `sessions` WHERE `token_session`="' + req.cookies.ust + '";');
    const user = await db.getQuery('SELECT * FROM `vfuser` WHERE `id`=' + token[0].user_id + ';');

    if(user.length > 0 && token.length > 0) {
      if(user[0].prava === 'artem') {
        optionsMain.admin = true
      }
    }
  }
}
preRender(config.pagesPath, res)
  .then(async function(result) {
      let checkNewCat = false;
      const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

      if(checkNew.length > 0) {
        checkNewCat = true;
      }
      // Рендер пунктов выпадашек
      res.render(config.viewMain + '/nav.ejs', {
      checkNewCat: checkNewCat,
      items : result,
      list: await db.getQuery('SELECT * FROM `category`'),
      }, function(err, html){
          if(err) { throw new Error("this E: " + err); }
          optionsMain.nav  = html;
      });
  })
  .then(function() {
      // РЕНДЕР МОБИЛЬНОГО МЕНЮ
      let mobMenu = db.getQuery('SELECT * FROM `category`').then(async function(result){
        let checkNewCat = false;
        const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

        if(checkNew.length > 0) {
          checkNewCat = true;
        }

        res.render(mobileMenu, {
        checkNewCat: checkNewCat,
        items : result,
        }, function(err, html){
            if(err) { throw new Error("this E: " + err); }
            optionsMain.mobileMenu = html;
        });
      });

      return Promise.all([mobMenu]);
  })
  .then(function(r) {
      // Рендер тела страницы
      res.render(config.pagesPath + '/' + req.params.page + '.ejs',
      optionsMain,
      function(err, html){
          if(err) {
            res.status(404).send("<p>Sorry can't find that you want!</p> <p><b>Error 404 </b></p><br><br><a href='/'>HOME<a>");
          }
          optionsMain.bodyMain = html;
      });
  })
  .then(function() {
      // Основной рендер
      res.render(config.viewMain + "/index",
      optionsMain,
      function(err, html){
        if (err) {throw new Error(err);}
          res.send(util.replacerSpace(html)); // Обфускация HTML - delete space
      });
  })
  .catch(function(err) { throw new Error(err); });
});

//// Аутентификация через вк ////
router.get('/vk/auth', function (request, response, next) {
  const salt = bcrypt.genSaltSync(10);
  const token = uuidv1(salt + new Date().getTime());
  const options = {
    hostname: 'oauth.vk.com',
    port: 443,
    path:'/access_token?client_id='+config.client_id+'&client_secret='+config.client_secret+'&redirect_uri='+config.calbackUri+'&v=5.95&code='+ request.query.code,
    method: 'GET'
  }
  // Тело запроса на сервер ВК
  const req = https.request(options, (res) => {
    if(res.statusCode != 200) {
      response.status(res.statusCode).send('<b style="color:#C50606;font-size:20px;">Удалённый сервер не ответил правильно. Статус ответа: <i>' + res.statusCode + '</i></b>');
      throw new Error('Статус ответа: ' + res.statusCode);
    }

    res.on('data', async (d) => {
      const json = JSON.parse(d);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 2)
      let id = String(json.user_id);
      const hash = crypto.createHash('md5').update(id).digest('hex'); // Хэш MD5

      db.getQuerySafe('vfuser', 'hash_id', hash, 'equality').then( async (r) => {

        if(!r[0] || r[0] === undefined) {
          auth.setUser(d).then( async (result) => {
              result = JSON.parse(result);
              const dataUser = {
                email: Math.ceil(Math.random() * 100) + 'm@template.com',
                first_name: result.response[0].first_name,
                last_name: result.response[0].last_name,
                city: result.response[0].city.title,
                password: result.response[0].id,
                hash_id: hash,
                prava: 'user'
              }

              db.setData('vfuser', dataUser).then( (vfuser) => {
                id = vfuser.insertId
              })
          })
        } else {
          id = r[0].id;
        }

        await db.setData('sessions', {
            user_id: id,
            token_session: token,
            expire_at: expires
        });

        response.cookie('ust', token, { domain: '.'+config.domain, path: '/', expires: expires});
        response.redirect(config.fullDomain + '/account/inside/')

      });

    })
  });
  // Тело запроса на сервер ВК

  // Сам запрос
  req.on('error', (error) => {
    console.error(error);
  })
  req.end();

});
// Вход в систему
router.post('/login/', async function (req, res, next) {
  const dataUser = {
    email: req.body.email,
    password: crypto.createHash('md5').update(req.body.pass).digest('hex')
  }

  db.getQueryManySafe('vfuser', dataUser).then( async (result) => {
    if(result.length > 0) {
      const token = uuidv1(req.body.email + new Date().getTime());
      const expires = new Date(Date.now() +  1000 * 60 * 60 * 2);
      const r = await db.setData('sessions', {
          user_id: result[0].id,
          token_session: token,
          expire_at: expires
      });

      res.cookie('ust', token, { domain: '.'+config.domain, path: '/', expires: expires});

      res.send(JSON.stringify({path: config.fullDomain + '/account/inside/'}));
      return
    }

    res.send(JSON.stringify({error: 401, text: 'Неверная пара - логин / пароль'}))
  })
});
// Регистрация юзера в системе
router.post('/reguser/', function (req, res, next) {

const salt = bcrypt.genSaltSync(10);
const dataUser = {
  email: req.body.regemail,
  first_name: req.body.regName,
  last_name: req.body.regLastName,
  password: crypto.createHash('md5').update(req.body.regpass).digest('hex'),
  hash_id: bcrypt.hashSync(req.body.regemail + '$' + req.body.regemail, salt)
}

const token = uuidv1(req.body.regemail + new Date().getTime());

db.setData('vfuser', dataUser).then(async (result) => {
  const expires = new Date(Date.now() +  1000 * 60 * 60 * 2)
  const r = await db.setData('sessions', {
      user_id: result.insertId,
      token_session: token,
      expire_at: expires
  });

  result.token = token;
  res.cookie('ust', token, { domain: '.'+config.domain, path: '/', expires: expires});
  res.send(JSON.stringify(result))
  
})
.catch(function(err) { res.send(err) });

});
// Пререндер Меню
function preRender(path, res) {
  let args = null;
  let template = [];

return new Promise(async function(resolve, reject) {

  args = await db.getQuery('SELECT * FROM `category`');

  args.forEach(async function(item) {

    await (function(){
       res.render(path + '/menu/desktop_menu.ejs',
       {
         link: item.name,
         description: item.description,
         img: item.images
       },
       function(err, html){
           template.push(util.replacerSpace(html)); // Обфускация HTML - delete space
       });
    })();

  });

  return resolve(template);
});
}

module.exports = router;
