const express = require('express');
const router = express.Router();
const config = require('../conf');
const utils = require('../utils');
const util = new utils();
module.paths.push(config.pathToServer); // Добавим в глобал пафф, корневой каталог
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const db = require("mysql_models");
const fs = require('fs'); // Модуль для чтения файлов
const https = require('https'); // Сервер для кроссдоменного запроса
const mobileMenu = fs.readFileSync(config.pagesPath + '/menu/mobile_menu.ejs', 'utf8');
const footer = fs.readFileSync(config.viewMain + '/footer.ejs', 'utf8');
const modalErr = fs.readFileSync(config.modalPath + '/modalErr.ejs', 'utf8');

// Опции рендера
const optionsMain = {
  title : 'Оформление заказа',
  h1 : 'Оформление заказа',
  nav : '',
  picture : '',
  footer : footer,
  cart : '',
  mobileMenu : '',
  bodyMain : 'order',
  main : '',
  modalSizes : modalErr,
  discription : 'Оформление заказа',
};

router.get('/', function(req, res, next) {

  const userToken = req.cookies.add2cart_for_users || '';
  const arrOrder = [];
  let quantity = 0;
  let size = '';

  if(userToken == '') {
    res.send('<script type="text/javascript">window.location.href = history.go(-1);</script>');
  }

  db.getQueryManySafe('cart', {user_token: userToken, success: 0})
  .then(async function(r){
    let arrOrderPromise = [];
    arrOrderPromise = await r.map(async function(rr, index) {
          let resolve = await db.getQuerySafe('products', 'id', rr.id_prod, 'equality');
          // СБор данных для таблички рендера добавленных товаров.
          arrOrder.push({
            quantity: rr.quantity,
            size: rr.size,
            img: getOneImg(resolve[0].images),
            sum: preSum(rr.quantity, resolve[0].price),
            title: resolve[0].title,
            price: resolve[0].price,
            id: resolve[0].id,
          });
    });

      return Promise.all(arrOrderPromise);
  })
  .then(function(r2){
    let totalSum = 0;

    arrOrder.forEach(function(currentValue) {
      totalSum += toNumber(currentValue.sum);
    });

    // рендер добавленных товаров
    res.render(config.pagesPath + '/order.ejs',
    {
      arrOrder: arrOrder,
      totalSum: totalSum
    },
    function(err, html){
      if (err) {throw new Error(err);}
        optionsMain.bodyMain = html; // Обфускация HTML - delete space
    });
  })
  .then(function(r){
    // Основной рендер
    res.render(config.viewMain + '/index',
    optionsMain,
    function(err, html){
      if (err) {throw new Error(err);}
        res.send(util.replacerSpace(html)); // Обфускация HTML - delete space
    });
  }).catch(function(err) { throw new Error(err); });
});

/* Парсим поисковый запрос */
router.post('/', function(req, res, next) {
    if(req.body.param1 === 'searchCat') { // Поиск по имени regiona
      db.getQuerySafe('regions', 'region', req.body.param2, 'likeAllFields')
        .then(function(responce){
          res.send(JSON.stringify({result: responce}));
        });
    } else if(req.body.param1 === 'searchCity') { // Поиск по имени regiona и города
      db.getQueryManySafe(['cities','latestLike'], {region: req.body.param3, city: req.body.param2})
        .then(function(responce){
          res.send(JSON.stringify({result: responce}));
        });
    }
});

/*
 * Получение данных для доставки СДЭК
 */
router.post('/delivery/', function(request, response, next) {
  const userToken = request.cookies.add2cart_for_users || '';

  if(userToken == '') {
    response.status(402).send('Не удалось пройти идентификацию пользователя!');
    return false;
  }

  /*+encodeURIComponent('Россия')*/

  const options = {
    hostname: 'integration.cdek.ru',
    port: 443,
    path:'/v1/location/cities/json?size=5&page=0&cityName=' + encodeURIComponent(request.body.checkoutCity) + '&regionCodeExt=' + encodeURIComponent(request.body.checkoutRegionCode),
    method: 'GET'
  }

  const req = https.request(options, (res) => {

    if(res.statusCode != 200) {
      response.send('<b>Удалённый сервер не ответил правильно. Статус ответа: <i>' + res.statusCode + '</i></b>');
      console.error('Статус ответа: <i>' + res.statusCode);
    }

    res.on('data', (d) => {
      /*process.stdout.write(d);*/
      if(d.length < 5) /* Если массив/строка со сдэка пришёл пустым, то значит туда нету доставки */
      {
        response.send(JSON.stringify({status: 'error', msg: 'В населёныый пункт "' + request.body.checkoutCity + '" не осуществляется доставка.<br><br>&nbsp;Выберите другой, удобный и ближайший для вас город.'}));// Отправка юзеру данных
      } else {
        getCostSdek(JSON.parse(d), userToken).then(function(cost) {
          const jsonObj = JSON.parse(cost);
          const final = {
            user_token: userToken,
            cost_delivery: jsonObj.result[0].result.priceByCurrency,
            delivery_period_max: jsonObj.result[0].result.deliveryPeriodMax,
            delivery_period_min: jsonObj.result[0].result.deliveryPeriodMin
          };

          response.send(cost);// Отправка юзеру данных о доставке

          /* после того как спросили стоимость доставки, запишем первые данные о заказе, сделав некоторые поле Integer */
          request.body.checkoutFirst_name = request.body.checkoutFirst_name.trim();
          request.body.checkoutLast_name = request.body.checkoutLast_name.trim();
          request.body.checkoutRegionCode = parseInt(request.body.checkoutRegionCode, 10);
          request.body.checkoutPhone = parseInt(request.body.checkoutPhone.replace(/[^0-9]/g, ''), 10); // Обязательно Посмотреть как приходит в БД!!!!!!

          setTimeout(async function() {
            let localId = await db.getQueryManySafe('cart', {user_token: userToken, success: 0});

            db.setData('checkout', Object.assign(final, request.body));
            db.updateData('cart', {status_checkout: 1}, localId[0].id); // Запишем инфу, то что юзер уже первый этап оформления заказа прошёл

          }, 100);
        })
        .catch( (err) => {
          response.send(JSON.stringify(err));
        })
      }
    })
  });

  req.on('error', (error) => {
    console.error(error);
  })
  req.end();
});

/* Функция для получения стоимости доставки */
function getCostSdek(objCity, userToken) {
const goods = {
          "weight":0,
          "length":0,
          "width":0,
          "height":0
        };

  return new Promise((resolve, reject) => {
    db.getQueryManySafe('cart', {user_token: userToken, success: 0})
        .then(async function(r){

          arrOrderPromise = await r.map(async function(rr, index) {
                let resolve = await db.getQuerySafe('products', 'id', rr.id_prod, 'equality');

                goods.weight = String(parseFloat(toNumber(goods.weight) + toNumber(resolve[0].weight)).toFixed(3));
                goods.length = String(toNumber(goods.length) + toNumber(resolve[0].length));
                goods.width = String(toNumber(goods.width) + toNumber(resolve[0].width));
                goods.height = String(toNumber(goods.height) + toNumber(resolve[0].height));
          });

          return Promise.all(arrOrderPromise);
        })
        .then((prs) => {
          const date = new Date();
          const month = Number(date.getMonth()) < 9 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
          const day = Number(date.getDate());
          const objForSend = {
                            "version":"1.0",
                            "dateExecute": String(`${date.getUTCFullYear()}-${month}-${day}`),
                            "senderCityId": "431", /* Код Тольятти*/
                            "receiverCityId": String(objCity[0].cityCode),
                            "currency":"RUB",
                            "tariffList":[{"id":1}],
                            "goods":
                                [
                                  goods
                                ]
                        };
                          // console.log(JSON.stringify(objCity[0]))
          const options = {
            hostname: 'api.cdek.ru',
            port: 443,
            path:'/calculator/calculate_tarifflist.php',
            method: 'POST',
            headers: {
              "Content-Type": "application/json"
            }
          }

        const req = https.request(options, (res) => {

          if(res.statusCode != 200) {
            console.error('Статус ответа: ' + res.statusCode);
          }

          res.on('data', (d) => {
           /* process.stdout.write(d);*/
            const check = JSON.parse(d);

            if(check.error) {
              return reject(check)
            } else {
              check.result[0].result.deliveryPeriodMax++;
              check.result[0].result.deliveryPeriodMin++;
            }
            return resolve(JSON.stringify(check));
          })
        });

        req.write(JSON.stringify(objForSend));

        req.on('error', (error) => {
          console.error(error);
        });

        req.end();

      }).catch(function(err) { throw new Error(err); });
  });
};/* End function for Sdek */

/* Взять только первое изображение */
function getOneImg(images) {
    if(images && images != '' && images.length > 5) {
      imgPreview = images.split(',');
      return toString(imgPreview[0]);
    } else {
      return "/img/svg/no-photo.svg";
    }
}

function preSum(quantity, price) {
  return toNumber(quantity) * toNumber(price);
}

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n
}

function isPlainObject(obj) {
    var key;

    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if ( !obj || typeof obj !== "object" || obj.nodeType ) {
        return false;
    }

    try {
        // Not own constructor property must be Object
        if ( obj.constructor &&
            !core_hasOwn.call(obj, "constructor") &&
            !core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
            return false;
        }
    } catch ( e ) {
        // IE8,9 Will throw exceptions on certain host objects #9897
        return false;
    }

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.
    for ( key in obj ) {}

    return key === undefined || core_hasOwn.call( obj, key );
}
/**
 *  Конвертация в строку
 */
function toString(val) {
return val == null
  ? ''
  : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
    ? JSON.stringify(val, null, 2)
    : String(val)
};
module.exports = router;