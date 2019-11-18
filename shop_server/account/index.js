const config = require('../conf');
const https = require('https');
const crypto = require('crypto');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const express = require('express');
const router = express.Router();
const utils = require('../utils');
const util = new utils();
const db = require("mysql_models");
const {mailer, testMailer} = require("mailer");
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

router.get('/login', async (req, res, next) => {
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

if (req.params.page === 'inside') {
  
  if (!req.cookies || !req.cookies.ust) {
    res.status(401).send("<p>Sorry, Unauthorized! <br><br> You need authorize!</p><br><p><b>Error 401 </b></p><br><br><a href='/account/login/'>LOGIN<a>");
    return false
  } else {
    const token = await db.getQuery('SELECT * FROM `sessions` WHERE `token_session`="' + req.cookies.ust + '";');
    const user = await db.getQuery('SELECT * FROM `vfuser` WHERE `id`=' + parseInt(token[0].user_id, 10) + ';');

    if (user.length && token.length) {
      optionsMain.admin = user[0].prava === 'artem'
      const infoUser = user.map((item) => {
        return {
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email,
          city: item.city,
          region: item.region,
          phone: item.phone
        }
      })

      optionsMain.userInfo = infoUser[0];

      optionsMain.existsCheckout = await db.getQuerySafe('checkout', 'checkoutEmail', user[0].email, 'equality');

      if (optionsMain.existsCheckout.length) {
        optionsMain.checkout = await db.getQuerySafe('cart', 'email', user[0].email, 'equality');

        optionsMain.productsFromCheckout = optionsMain.checkout.map(async (item) => {
          const resolve = await db.getQuerySafe('products', 'id', item.id_prod, 'equality');

          return {
            id: resolve[0].id,
            title: resolve[0].title,
            category: resolve[0].category
          }
        })

        Promise.all(optionsMain.productsFromCheckout).then(values => { 
          optionsMain.productsFromCheckout = values
        })
      }
    }
  }
}
preRender(config.pagesPath, res)
  .then(async (result) => {
      let checkNewCat = false;
      const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

      if (checkNew.length) {
        checkNewCat = true;
      }
      // Рендер пунктов выпадашек
      res.render(config.viewMain + '/nav.ejs', {
      checkNewCat: checkNewCat,
      items : result,
      list: await db.getQuery('SELECT * FROM `category`'),
      },
      (err, html) => {
          if (err) { throw new Error("Render Error: " + err) }
          optionsMain.nav  = html;
      });
  })
  .then(() => {
      // РЕНДЕР МОБИЛЬНОГО МЕНЮ
      let mobMenu = db.getQuery('SELECT * FROM `category`').then(async (result) => {
        let checkNewCat = false;
        const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

        if (checkNew.length > 0) {
          checkNewCat = true;
        }

        res.render(mobileMenu, {
        checkNewCat: checkNewCat,
        items : result,
        },
        (err, html) => {
            if (err) {
              throw new Error("Render Error: " + err)
            }
            optionsMain.mobileMenu = html;
        });
      });

      return Promise.all([mobMenu]);
  })
  .then(() => {
      // Рендер тела страницы
      res.render(config.pagesPath + '/' + req.params.page + '.ejs',
      optionsMain,
      (err, html) => {
          if (err) {
            res.status(404).send("<p>Sorry can't find that you want!</p> <p><b>Error 404 </b></p><br><br><a href='/'>HOME<a>");
            throw new Error("Render Error: \n\n----------\n\n\t" + err)
          }
          optionsMain.bodyMain = html;
      });
  })
  .then(() => {
      // Основной рендер
      res.render(config.viewMain + "/index",
      optionsMain,
      (err, html) => {
        if (err) {
          throw new Error(err)
        }
          res.send(util.replacerSpace(html)); // Обфускация HTML - delete space
      });
  })
  .catch((err) => { throw new Error(err) });
});

//// Аутентификация через вк ////
router.get('/vk/auth', (request, response, next) => {
  const salt = bcrypt.genSaltSync(10);
  const token = uuidv1(salt + new Date().getTime() + String(Math.random() * 120));
  const options = {
    hostname: 'oauth.vk.com',
    port: 443,
    path:`/access_token?client_id=${config.client_id}&client_secret=${config.client_secret}&redirect_uri=${config.calbackUri}&v=5.95&code=${request.query.code}`,
    method: 'GET'
  }
  // begin Тело запроса на сервер ВК
  const req = https.request(options, (res) => {
    if (res.statusCode != 200) {
      response.status(res.statusCode).send('<b style="color:#C50606;font-size:20px;">Удалённый сервер не ответил правильно. Статус ответа: <i>' + res.statusCode + '</i></b>');
      throw new Error('Статус ответа: ' + res.statusCode);
    }

    res.on('data', async (responceData) => {
      const json = JSON.parse(responceData);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 2)
      const hash = crypto.createHash('md5').update(id).digest('hex'); // Хэш MD5
      let id = String(json.user_id);

      db.getQuerySafe('vfuser', 'hash_id', hash, 'equality').then( async (resultQuery) => {

        if (!resultQuery[0]) {
          auth.setUser(responceData).then( async (result) => {
              result = JSON.parse(result);
              const dataUser = {
                email: `${~~(Math.random() * 100)}mail@template.com`,
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
          id = resultQuery[0].id;
        }

        await db.setData('sessions', {
            user_id: id,
            token_session: token,
            expire_at: expires
        });

        response.cookie('ust', token, { domain: '.' + config.domain, path: '/', expires: expires});
        response.redirect(`${config.fullDomain}/account/inside/`)

      });

    })
  });
  // end Тело запроса на сервер ВК

  // Сам запрос
  req.on('error', (error) => {
    console.error(error)
  })
  req.end();

});
// Вход в систему
router.post('/login/', async (req, res, next) => {
  const dataUser = {
    email: req.body.email,
    password: crypto.createHash('md5').update(req.body.pass).digest('hex')
  }

  db.getQueryManySafe('vfuser', dataUser).then( async (result) => {
    if (result.length > 0) {
      const token = uuidv1(req.body.email + new Date().getTime() + String(Math.random() * 120));
      const expires = new Date(Date.now() +  1000 * 60 * 60 * 2);
      const r = await db.setData('sessions', {
          user_id: result[0].id,
          token_session: token,
          expire_at: expires
      });

      res.cookie('ust', token, { domain: '.' + config.domain, path: '/', expires: expires});

      res.send(JSON.stringify({path: config.fullDomain + '/account/inside/'}));
      return
    }

    res.send(JSON.stringify({error: 401, text: 'Неверная пара - логин / пароль'}))
  })
});
// Регистрация юзера в системе
router.post('/reguser', (req, res, next) => {
  const salt = bcrypt.genSaltSync(10);
  const originPassword = req.body.regpass
  const dataUser = {
    email: req.body.regemail,
    first_name: req.body.regName,
    last_name: req.body.regLastName,
    password: crypto.createHash('md5').update(req.body.regpass).digest('hex'),
    hash_id: bcrypt.hashSync(req.body.regemail + '$' + req.body.regemail, salt)
  }
  
  const token = uuidv1(req.body.regemail + new Date().getTime() + String(Math.random() * 120));
  
  db.setData('vfuser', dataUser).then(async (result) => {
    const expires = new Date(Date.now() +  1000 * 60 * 60 * 2)

    await db.setData('sessions', {
      user_id: result.insertId,
      token_session: token,
      expire_at: expires
    })
    .catch((err) => { throw new Error("sessions E: " + err) });

    result.token = token;

    // testMailer()
    const message = getTemplateMail(Object.assign({}, {originPassword}, dataUser) )

    mailer(message).then((resultMail) => {
      console.log(resultMail)
    })
    res.cookie('ust', token, { domain: '.' + config.domain, path: '/', expires: expires});
    res.send(JSON.stringify(result))

  })
  .catch((err) => { res.send(err) });

});
// Восстановление пароля
router.post('/forgot/', async (req, res, next) => {
  let newPassword = '';

  if (req.body.forgot) {
    const result = await db.getQuerySafe('vfuser', 'email', req.body.email, 'equality')

    if (result.length) {
      newPassword = String(crypto.createHash('md5').update(String(Math.random() * 500)).digest('hex')).substring(0, 7)
      const message = getTemplateMailForgot(Object.assign({}, { email: req.body.email, originPassword: newPassword }) )
      newPassword = crypto.createHash('md5').update(newPassword).digest('hex')

      const resultSetNewPass = await db.updateData('vfuser', { password: newPassword }, result[0].id )

      if (resultSetNewPass.affectedRows > 0) {
        mailer(message).then((resultMail) => {
          res.send(JSON.stringify({ responce: `Письмо с новым паролем на Email адрес '${req.body.email}' успешно отправлено.` }))
        })
      } else {
        res.send(JSON.stringify({ responce: `Что-то пошло не так, произошла серверная ошибка` }))
      }

    } else {
      res.send(JSON.stringify({ responce: `С Email адресом '${req.body.email}' пользователь не существует` }))
    }
  } else {
    res.send(JSON.stringify({ responce: 'Bad request' }))
  }
})
// Функция возвращающая объект письма для отправки
function getTemplateMail (objectUser) {
  let {email, originPassword} = objectUser

  return {
    from: '<vflingerierus@gmail.com>',
    to: email.replace(/\'/g, ''),
    subject: 'Поздравляем! Вы успешно прошли регистрацию на сайте ' + config.domain,
    text: `Поздравляем с успешной регистрацией на нашем сайт красивого нижнего белья по индивидуальным меркам!
    
        Данные вашего аккаунта: 
        Login: ${email}
        Password: ${originPassword}
        
        Данное письмо создано автоматически и не требует ответа.`
  }
}
// Функция возвращающая объект письма для отправки 'Восстановление пароля'
function getTemplateMailForgot (objectUser) {
  let {email, originPassword} = objectUser

  return {
    from: '<vflingerierus@gmail.com>',
    to: email.replace(/\'/g, ''),
    subject: 'Восстановление пароля на сайте ' + config.domain,
    text: `Ваш старый пароль успешно сброшен!
    
        Новые данные вашего аккаунта: 
        Login: ${email}
        New password: ${originPassword}
        
        Данное письмо создано автоматически и не требует ответа.`
  }
}
// Пререндер Меню
function preRender(path, res) {
  let args = null;
  let template = [];

return new Promise(async function(resolve, reject) {

  args = await db.getQuery('SELECT * FROM `category`');

  args.forEach(async function(item) {

    await (() => {
       res.render(path + '/menu/desktop_menu.ejs',
       {
         link: item.name,
         description: item.description,
         img: item.images
       },
       (err, html) => {
           template.push(util.replacerSpace(html)); // Обфускация HTML
       });
    })();

  });

  return resolve(template);
});
}

module.exports = router;
