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
let cart = fs.readFileSync(config.pagesPath + '/cart.ejs', 'utf8');

const arrMenu = ['lingerie',
                'bridal',
                'dress',
                'swimsuit'];

// Опции рендера страницы
const optionsMain = {
  title : 'Ваша корзина',
  h1 : '',
  nav : '',
  picture : '',
  footer : footer,
  cart : cart,
  mobileMenu : mobileMenu,
  bodyMain : '',
  main : '',
  modalSizes : '',
  discription : 'Ваша корзина выбранных товаров',
};

router.get('/', function (req, res, next) {

  const userToken = req.cookies.add2cart_for_users || '';
  const arrOrder = [];
  let quantity = 0;
  let size = '';
  let tableVisible = req.cookies.total_sum_in_cart == 0 || req.cookies.total_sum_in_cart == undefined || req.cookies.total_sum_in_cart == '' ? 'style="display: none;"' : '';

  optionsMain.h1 = req.cookies.total_sum_in_cart == 0 || req.cookies.total_sum_in_cart == undefined || req.cookies.total_sum_in_cart == '' ? 'Ваша корзина пуста.<br> Чтобы найти что-то нужное, воспользуйтесь меню или начните с <a href="/" style="text-decoration:underline;color:#daa676;cursor:pointer;">главной</a> страницы.' : 'Ваша корзина выбранных товаров';

  preRender(config.pagesPath, arrMenu, res)
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
    .then(function(mobMenu) {

        /*// Ренден продуктов содержащихся в корзине юзера //*/

        const table = db.getQueryManySafe('cart', {user_token: userToken, success: 0})
          .then(async function(r){
            let arrOrderPromise = await r.map(async function(rr, index) {
                  let resolve = await db.getQuerySafe('products', 'id', rr.id_prod, 'equality');
                  // СБор данных для таблички рендера добавленных товаров.
                  arrOrder.push({
                    quantity: rr.quantity,
                    size: rr.size,
                    img: resolve[0].images,
                    sum: preSum(rr.quantity, resolve[0].price),
                    title: resolve[0].title,
                    price: resolve[0].price,
                    id: resolve[0].id,
                  });
            });

              return Promise.all(arrOrderPromise);
          });

          return Promise.all([table]);
    })
    .then(function(r) {

        // Рендер тела страницы
        res.render(config.pagesPath + '/cart_page.ejs',
        {
            h1: optionsMain.h1,
            arrOrder: arrOrder,
            tableVisible: tableVisible
        },
        function(err, html){
            if(err) { throw new Error("this E: " + err); }
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

function preSum(quantity, price) {
  return toNumber(quantity) * toNumber(price);
}

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n
};

function preRender(path, args = [], res) {

  if(args.length == 0) return false;

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