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

const serviceModal = fs.readFileSync(config.modalPath + '/modal.ejs', 'utf8');

// Промежуточное ПО для парсера ПОСТ запросов
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const optionsPage = {
    showAllProd: '',
    countOrder: 0,
    serviceModal: serviceModal,
}

// Проверка прав юзера перед всеми роутами админки
router.all('*', async function(req, res, next) {
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
// Заказы оплаченные и не оплаченные
router.get('/orders/', function(req, res) {

  /* Проверка наличия заказов */
  queryNewOrder(db).then((res) => {
    optionsPage.countOrder = res.length;
  });

  preRanderTableOrders(req, res, config.pagesPath + '/adm_show_orders.ejs')
    .then(async function(responce){
      optionsPage.showAllProd = responce;

      res.render(config.viewMain + '/admin_index',
          optionsPage,
          function(err, html){
            if (err) throw new Error(err);
            res.send(util.replacerSpace(html)); // Обфускация HTML - del space
          });
    });
});

// Различные AJAX запорсы ORDER
router.post('/orders/', function(req, res) {
  const dataOrderAll = {
    templateArr: [],
    dataCustomer: [],
    numberOrder: 0,
    newOrder: 0,
    date: '',
    statusPay: '',
  };

  /* Запрос для перевода заказа в из "Нового" в статус "Обработанный" */
  if (req.body.param1 === 'orderReady') {

    db.updateData('checkout', {new: 0}, req.body.idProd)
      .then(function(result) {
        res.send(JSON.stringify({status: 'ok'}));
      })
      .catch(function(err) { throw new Error(err); });
      return;
  }

    /* Условие, где рендерится таблица заказа со всеми его данными */
  if (req.body.param1 === 'setNewWindowAdd') {
    page = config.pagesPath + '/show_order.ejs';

    db.getQuerySafe('cart', 'user_token', req.body.idProd, 'equality').then(async function(result) {

        let templateArrLocal = await result.map(async function(item) {
              let resolve = await db.getQuerySafe('products', 'id', item.id_prod, 'equality');

              resolve[0].changedSize = item.size;
              resolve[0].quantity = item.quantity;

              dataOrderAll.templateArr.push(resolve);
        });

        return Promise.all(templateArrLocal);
    })
    .then(async function(templateArrLocal) {
      await db.getQuerySafe('checkout', 'user_token', req.body.idProd, 'equality').then(async function(result) {
        dataOrderAll.numberOrder = result[0].id;
        dataOrderAll.date = result[0].date;
        dataOrderAll.dataCustomer = result;
        dataOrderAll.statusPay = result[0].status_pay;
        dataOrderAll.newOrder = result[0].new;
      });

    })
    .then(function() {

      res.render(page,
      dataOrderAll,
      function(err, html){
        if (err) throw new Error(err);
        res.send(JSON.stringify({result: util.replacerSpace(html)})); // Обфускация HTML и отправка подробностей заказа
      });
    });


  } else if (req.body.param1 === "backAllProd"){ // Если нажали НАЗАД, то просто редиректним на ордер
      res.send(JSON.stringify({result: '<script type="text/javascript"> window.location.href = "'+ config.fullDomain +'/power/admin/orders/";</script>'}));
  } else if (req.body.param1 === 'deleteProd') {
      /* Запрос на удаление заказа из БД */
      db.getQuerySafe('checkout', 'id', req.body.idProd, 'deleteProd')
        .then(function(responce){
          res.send(JSON.stringify({result: '<script type="text/javascript"> window.location.href = "'+ config.fullDomain +'/power/admin/orders/";</script>'}));
      });
  }

});

// КАТЕГОРИИ / ГРУППЫ - ТОВАРОВ
router.get('/cat/', function(req, res, next) {

  /* Проверка наличия заказов */
  queryNewOrder(db).then(function(res) {
    optionsPage.countOrder = res.length;
  });

  /* Если пришёл ГЕТ запрос на добавление Категории ПОЗЖЕ СДЕЛАТЬ ПРОВЕРКУ АДМИНА ПО КУКЕ */
  if ('parent_cat' in req.query) {
    if ('update' in req.query && req.query.update == 1) {

      delete req.query.update;// удаление лишнего поля

      db.updateData('category', req.query, req.cookies.updateCat)
      .then(function(result) {
        res.cookie('updatedCat', req.query.name + '__' + result.insertId, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 1100)});
        res.redirect(config.fullDomain + '/power/admin/');
      })
      .catch(function(err) { throw new Error(err); });
      return;
    }

    db.setData('category', req.query)
      .then(function(result) {
        res.cookie('successAddCat', req.query.name + '__' + result.insertId, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 1000)});
        res.redirect(config.fullDomain + '/power/admin/cat/');
      })
      .catch(function(err) { throw new Error(err); });
      return;
  }

  preRanderTableCat(req, res, config.pagesPath + '/adm_show_cat.ejs')
    .then(function(responce){

      optionsPage.showAllProd = responce;
      res.render(config.viewMain + '/admin_index',
          optionsPage,
          function(err, html){
            if (err) throw new Error(err);
            res.send(util.replacerSpace(html)); // Обфускация HTML - del space
          });
    });
});
// Корень админки
router.get('/', function(req, res, next) {

  /* Проверка наличия заказов */
  queryNewOrder(db).then(function(res) {
    optionsPage.countOrder = res.length;
  });

  /* Если пришёл ГЕТ запрос на добавление/редактирование товара */
  if ('title' in req.query) {

    if ('update' in req.query && req.query.update == 1) {

      delete req.query.update;// удаление лишнего поля

      /* Чекаем есть ли размер для БРА в запросе */
     if (!req.query.sizesBra) {
      req.query.sizesBra = null;
     }

      db.updateData('products', req.query, req.cookies.updateProduct)
      .then(function(result) {
        res.cookie('updatedProduct', req.query.title + '__' + result.insertId, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 1100)});
        res.redirect(config.fullDomain + '/power/admin/');
      })
      .catch(function(err) { throw new Error(err); });
      return;
    }

    db.setData('products', req.query)
      .then(function(result) {
        res.cookie('successAddProduct', req.query.title + '__' + result.insertId, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 1100)});
        res.redirect(config.fullDomain + '/power/admin/');
      })
      .catch(function(err) { throw new Error(err); });
      return;
  }

  preRanderTableProd(req, res, config.pagesPath + '/adm_show_product.ejs')
    .then(function(responce){

      optionsPage.showAllProd = responce;

      res.render(config.viewMain + '/admin_index',
      optionsPage,
      function(err, html){
        if (err) throw new Error(err);
        res.send(util.replacerSpace(html)); // Обфускация HTML - del space
      });
    });

});
// GET запорс AJAX фильтрации товаров!
router.get('/filter/', function(req, res) {
    const filter = {}

    for (let field in req.query) {
        if ({}.hasOwnProperty.call(req.query, field)) {
            filter[field.replace(/filter\-/, '')] = req.query[field] != '' ? req.query[field] : undefined;
        }
    }

    db.getQueryManySafe('products', filter).then(function(resultFilter) {
        let r = '';
        res.render(config.pagesPath + '/one_row_table.ejs',
        {
          'table': resultFilter
        },
        function(err, html){
          if (err) throw new Error(err);
          r = util.replacerSpace(html);
        });
        return r;
    })
    .then(function(resultFilter) {
        res.json(resultFilter);
    });
});
// POST запорсы AJAX страничек редактирования товара!
router.post('/update/', function(req, res) {
  if (req.body.qeuryUpdate === 'set') {
    getOneValue(parseInt(req.body.id, 10), 'products').then(function(rr) {
      res.send(JSON.stringify({result: rr}));
    })
  }
});
// POST запорсы AJAX страничек редактирования категории!
router.post('/cat/update/', function(req, res) {
  if (req.body.qeuryUpdate === 'set') {
    getOneValue(parseInt(req.body.id, 10), 'category').then(function(rr) {
      res.send(JSON.stringify({result: rr}));
    })
  }
})
// POST запорсы AJAX страничек добавления/удаления.
router.post('/', function(req, res, next) {

  let page = '';
  let state = {};
  let title = '';

    if (req.body.param1 === 'searchTitleProd') { // Поиск по имени товара
      db.getQuerySafe('products', 'title', req.body.param2)
        .then(function(responce){
          res.send(JSON.stringify({result: responce}));
        });

    } else if (req.body.param1 === 'deleteProd') { // Запрос на удаление товара
      /* Удаление фотографий */
      db.getQuerySafe('products', 'id', req.body.idProd, 'equality')
        .then(function(resFile){
            if (resFile[0].images.length > 2) {
              const arrFile = resFile[0].images.split(',');

                arrFile.forEach(function(file) {
                  fs.unlink(config.dirnameNew + file, function(err) {
                    if (err && err.code == 'ENOENT') {
                        console.info("File doesn't exist, won't remove it.");
                    } else if (err) {
                        // other errors, e.g. maybe we don't have enough permission
                        console.error("Error occurred while trying to remove file");
                    } else {
                        console.info('removed');
                    }
                  });
              });
          }
        })
        .then(function(){
          db.getQuerySafe('products', 'id', req.body.idProd, 'deleteProd')
            .then(function(responce){
              res.send(JSON.stringify({result: '<script type="text/javascript"> window.location.href = "'+ config.fullDomain +'/power/admin/";</script>'}));
            });
        });

    } else if (req.body.param1 === 'searchCat') { // Поиск по категории из списка категорий
      db.getQuerySafe('category', 'name', req.body.param2)
        .then(function(responce){
          res.send(JSON.stringify({result: responce}));
        });

    } else if (req.body.param1 === 'setNewWindowAdd') {
      title = 'Добавление нового товара';
      // Запрос на редактирование, просто ставим куку для следующего запроса
      if (req.body.idProd != null && req.body.idProd!= undefined) {
        res.cookie('updateProduct', req.body.idProd, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 60*60*100)});
      }

      page = fs.readFileSync(config.pagesPath + '/add_product.ejs', 'utf8');
      res.send(JSON.stringify({result: page, state: state, title: title}));

    } else if (req.body.param1 === "backAllProd"){
      preRanderTableProd(req, res, config.pagesPath + '/adm_show_product.ejs')
        .then(function(responce){
          page = responce;
      })
      .then(function(responce){
          res.send(JSON.stringify({result: page, state: state, title: title}));
      });
      return;
    } else {
      page = '<h1 style="color:#000;">good  ' + req.body.param1 + '</h1>';
    }

});

// POST запорсы AJAX страничек добавления/редактирования/удаление категорий
router.post('/cat/',function(req,res) {

  let page = '';
  let state = {};
  let title = '';

  if (req.body.param1 === 'setNewWindowAdd') {
      // Запрос на редактирование, просто ставим куку для следующего запроса
      if (req.body.idProd != null && req.body.idProd!= undefined) {
        res.cookie('updateCat', req.body.idProd, { domain: '.'+config.domain, path: '/', expires: new Date(Date.now() + 60*60*50)});
      }

      page = fs.readFileSync(config.pagesPath + '/add_cat.ejs', 'utf8');
      res.send(JSON.stringify({result: page, state: {}, title: 'Добавление новой категории'}));

  } else if (req.body.param1 === 'deleteProd') { // Запрос на удаление категории
      db.getQuerySafe('category', 'id', req.body.idProd, 'deleteProd')
        .then(function(responce){
          res.send(JSON.stringify({result: '<script type="text/javascript"> window.location.href = "'+ config.fullDomain +'/power/admin/cat/";</script>'}));
        });

  } else if (req.body.param1 === "backAllProd"){
      preRanderTableCat(req, res, config.pagesPath + '/adm_show_cat.ejs')
      .then(function(responce){
          page = responce;
      })
      .then(function(responce){
          res.send(JSON.stringify({result: page, state: state, title: title}));
      });
      return;
}
});
// запрос таблицы категорий
async function preRanderTableCat(req, res, file) {
  let htmlTable = await db.getQuery('SELECT * FROM `category`')
    .then(function(result){
          let r = '';

          res.render(file,
          {
            'table': result
          },
          function(err, html){
            if (err) throw new Error(err);
            r = util.replacerSpace(html);
          });

          return r;
  })
  .catch(function(err) { throw new Error(err); });

  return htmlTable;
};
// Запрос одной позиции товара или категории для редактирования
async function getOneValue(id, table) {
  let r = await db.getQuery('SELECT * FROM `'+table+'` WHERE id = '+ id +';')
    .then(function(result){
         return result
  })
  .catch(function(err) { throw new Error(err); });

  return r;
}

/* Запорс заявок / заказов */
async function preRanderTableOrders(req, res, file) {
  let htmlTable = await db.getQuery('SELECT * FROM `checkout` ORDER BY id DESC').then(function(result){
          let r = '';

          res.render(file,
          {
            'table': result
          },
          function(err, html){
            if (err) throw new Error(err);
            r = util.replacerSpace(html);
          });

          return r;
  })
  .catch(function(err) { throw new Error(err); });

  return htmlTable;
};

// Запрос таблиц товара
async function preRanderTableProd(req, res, file) {
  let htmlTable = await db.getQuery(queryShowAllProd()).then(function(result){
          let r = '';

          res.render(file,
          {
            'table': result
          },
          function(err, html){
            if (err) throw new Error(err);
            r = util.replacerSpace(html);
          });

          return r;
  })
  .catch(function(err) { throw new Error(err); });

  return htmlTable;
};

// Запрос на порверку, есть ли новые заказы
async function queryNewOrder(db) {
  let rows = await db.getQuery('SELECT id, new FROM `checkout` WHERE new="1"')
  return rows;
}
// Текстовой запрос в БД с учётом сортировки
function queryShowAllProd(order) {
  let orderSql = '';
  switch(order) {
    case 'mainEnd':
      orderSql = ' ORDER BY id ASC';
     break;
    case 'titleBegin':
      orderSql = ' ORDER BY title DESC';
     break;
    case 'titleEnd':
      orderSql = ' ORDER BY title ASC';
     break;
    default: orderSql = ' ORDER BY id DESC'; break;
  }
  return 'SELECT * FROM `products`' + orderSql;
};

module.exports = router;
