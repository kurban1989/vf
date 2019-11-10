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
const mobileMenuPath = config.pagesPath + '/menu/mobile_menu.ejs'; // Путь до мобильного меню
const footer = fs.readFileSync(config.viewMain + '/footer.ejs', 'utf8');
let cart = fs.readFileSync(config.pagesPath + '/cart.ejs', 'utf8');

const arrMenu = [];

// Опции рендера страницы
const optionsMain = {
  title : 'Ваша корзина',
  h1 : '',
  nav : '',
  picture : '',
  footer,
  cart,
  mobileMenu: '',
  bodyMain : '',
  main : '',
  modalSizes : '',
  discription : 'Ваша корзина выбранных товаров',
};

router.get('/', (req, res, next) => {

  const userToken = req.cookies.add2cart_for_users || '';
  const arrOrder = [];
  let quantity = 0;
  let size = '';
  let tableVisible = req.cookies.total_sum_in_cart == 0 || req.cookies.total_sum_in_cart == undefined || req.cookies.total_sum_in_cart == '' ? 'style="display: none;"' : '';

  optionsMain.h1 = req.cookies.total_sum_in_cart == 0 || req.cookies.total_sum_in_cart == undefined || req.cookies.total_sum_in_cart == '' ? 'Ваша корзина пуста.<br> Чтобы найти что-то нужное, воспользуйтесь меню или начните с <a href="/" style="text-decoration:underline;color:#daa676;cursor:pointer;">главной</a> страницы.' : 'Ваша корзина выбранных товаров';

  preRender(config.pagesPath, arrMenu, res)
    .then(async (result) => {
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
    .then(() => {
        // РЕНДЕР МОБИЛЬНОГО МЕНЮ
        let mobMenu = db.getQuery('SELECT * FROM `category`').then(async (result) => {
            let checkNewCat = false;
            const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

            if(checkNew.length > 0) {
              checkNewCat = true;
            }

            res.render(mobileMenuPath, {
            checkNewCat: checkNewCat,
            items : result,
            },
            (err, html) => {
                if(err) { throw new Error("this E: " + err); }
                optionsMain.mobileMenu = html;
            });
        });

        return Promise.all([mobMenu]);
    })
    .then((mobMenu) => {

        /*// Ренден продуктов содержащихся в корзине юзера //*/

        const table = db.getQueryManySafe('cart', {user_token: userToken, success: 0})
          .then(async (cartInner) => {
            let arrOrderPromise = await cartInner.map(async function(rr, index) {
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
        (err, html) => {
            if(err) { throw new Error("this E: " + err); }
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
    .catch(err => { 
      throw new Error(err)
    } );
});

function preSum(quantity, price) {
  return toNumber(quantity) * toNumber(price);
}

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n
};

function preRender(path, args = [], res) {

  let template = [];

  return new Promise(async (resolve, reject) => {

    args = await db.getQuery('SELECT * FROM `category`');

    args.forEach(async (item) => {

      await (() => {
         res.render(path + '/menu/desktop_menu.ejs',
         {
           link: item.name,
           description: item.description,
           img: item.images
         },
         (err, html) => {
             template.push(util.replacerSpace(html)); // Обфускация HTML - delete space
         });
      })();

    });

    return resolve(template);
  });
}

module.exports = router;
