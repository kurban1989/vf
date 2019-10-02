const config = require('../conf');
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const express = require('express');
const router = express.Router();
const utils = require('../utils');
const util = new utils();
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const db = require("mysql_models");
const fs = require('fs'); // Модуль для чтения файлов
const mobileMenu = config.pagesPath + '/menu/mobile_menu.ejs'; // Путь до мобильного меню
const footer = fs.readFileSync(config.viewMain + '/footer.ejs', 'utf8');
const modalFaq = fs.readFileSync(config.modalPath + '/modalErr.ejs', 'utf8');
const cart = fs.readFileSync(config.pagesPath + '/cart.ejs', 'utf8');

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
  modalSizes : modalFaq,
  discription : '',
};

router.get('/:page', function (req, res, next) {

  const userToken = req.cookies.add2cart_for_users || '';
  const arrOrder = [];
  let quantity = 0;
  let size = '';

  switch(req.params.page) {
    case 'about' :
      optionsMain.title = 'О нас';
      optionsMain.discription = 'О нас, Индивидуальный пошив белья, Неординарный дизайн, О нашей кампании';
      optionsMain.h1 = 'Скромно о нашей кампании';
      break;
    case 'faqs' :
      optionsMain.title = 'Часто задоваемые вопросы';
      optionsMain.discription = 'Часто задоваемые вопросы, написать вопрос, оставить отзыв о vanity fair';
      optionsMain.h1 = 'Часто задоваемые вопросы';
      break;
    case 'opt' :
      optionsMain.title = 'Опт/франчайзинг';
      optionsMain.discription = 'Опт / франчайзинг, франчайзинг нижнего женского белья';
      optionsMain.h1 = 'Опт / франчайзинг';
      break;
    case 'contact_us' :
      optionsMain.title = 'Контакты / Связаться с нами';
      optionsMain.discription = 'Контакты / Связаться с нами / Позвонить';
      optionsMain.h1 = 'Наши контакты';
      break;
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
              res.status(404).send("<p>Sorry can't find that you want!</p> <p><b>Error 404 </b></p><br><br><a href='/'>HOME PAGE<a>");
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
            res.send(util.replacerSpace(html)); // Обфускация HTML
        });
    })
    .catch(function(err) { throw new Error(err); });
});
// Запись отзыва или вопорса
router.post('/reviews', function(req, res) {
  const detail = {
    email: req.body.faqEmail,
    name: req.body.faqName,
    text: req.body.faqText
  }

  db.setData('reviews', detail).then((r) => {
    res.send(JSON.stringify({ status: 'OK', result: '<span style="text-align:center;">&nbsp;Спасибо за ваше обращение к нам. <br><br> &nbsp;Ваш вопрос или отзыв очень важен для нас!</span>' }))
  })
})

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n
};

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