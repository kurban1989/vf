module.paths.push(module.id + '/'); // Добавим в глобал пафф, текущий каталог

const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const config = require('./conf');
const utils = require('./utils');
const util = new utils();
const db = require('mysql_models');
const helmet = require('helmet'); // Устранение уязвимостей
const cookieParser = require('cookie-parser');
const fs = require('fs'); // Модуль для чтения файлов
const app = express();
const adminPanel = require('admin');
const add2cart = require('addcart');
const orders = require('order');
const requireCart = require('require_cart');
const photogallery = require('photogallery');
const photogalleryDel = require('photogalleryDel');
const textPages = require('textPages'); // Текстовые Страницы
const cartPage = require('cartPage'); // Страница Полноразмерной Корзины
const account = require('account'); // Страница Пользователя

const picture = fs.readFileSync(config.viewMain + '/picture.ejs', 'utf8');
const mobileMenu = config.pagesPath + '/menu/mobile_menu.ejs'; // Путь до мобильного меню
const footer = fs.readFileSync(config.viewMain + '/footer.ejs', 'utf8');
let cart = fs.readFileSync(config.pagesPath + '/cart.ejs', 'utf8');

// Опции рендера главной страницы
const optionsMain = {
  title: 'Красивое нижнее бельё по индивидуальным меркам',
  h1: 'Красивое нижнее бельё по индивидуальным меркам',
  nav: '',
  picture: '',
  footer,
  cart,
  mobileMenu : mobileMenu,
  bodyMain : '',
  main : '',
  modalSizes : '',
  discription : 'Красивое нижнее бельё по индивидуальным меркам',
};

app.engine('ejs', require('ejs-locals'));
app.set('views', config.view);
app.set('view engine', 'ejs');

// Промежуточное ПО для парсера ПОСТ запросов
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Парсер печенек
app.use(cookieParser());

app.use(helmet());// Устранение уязвимостей, подмена заголовков
// подключение статики [js, css, шрифты]
app.use('/dist', express.static(config.public));
app.use('/fonts', express.static(config.public + '/fonts'));

// Запрос svg файлов
app.get('/img/svg/:name_svg', (req, res, next) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(config.img + '/svg/' + req.params.name_svg);
});

// Запрос image/jpeg файлов
app.get('/img/jpg/:name_jpg', (req, res, next) => {
  if (path.extname(req.url) == ".gif") {
    fs.readFile(path.basename(req.url), (err, data) => {

      res.writeHead(200, {'content-type':'image/gif'});
      res.end(data);

    });
  } else {
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(config.img + '/jpg/' + req.params.name_jpg);
  }
});

// Запрос image/png файлов
app.get('/img/png/:name_png', (req, res, next) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(config.img + '/jpg/' + req.params.name_jpg);
})

// CRM магазина
app.use('/power/admin/', adminPanel);
// Загрузка фото
app.use('/photogallery/upload/', photogallery);
// Удаление фото
app.use('/photogallery/delete/', photogalleryDel);
// Добавление товара в корзину
app.use('/add2cart/', add2cart);
// Требование карточки товаров в корзине
app.use('/requirecart/', requireCart);
// оформление заказа
app.use('/order/', orders);
// Страница Корзины заказа
app.use('/cart/', cartPage);
// Текстовые Страницы
app.use('/pages/', textPages);
// ЛК юзера
app.use('/account', account);


// Вызов индекс диретории
app.get('/', function (req, res, next) {

  optionsMain.picture = picture;
  optionsMain.h1 = 'Красивое нижнее бельё по индивидуальным меркам';

  preRender(config.pagesPath, null, res)
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
            if (err) { throw new Error("Render Error: " + err); }
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
            }, (err, html) => {
                if (err) { throw new Error("Render Error: " + err); }
                optionsMain.mobileMenu = html;
            });
        });

        return Promise.all([mobMenu]);
    })
    .then((mobMenu) => {
        // Рендер заголовка в майн боди
        res.render(config.pagesPath + '/main.ejs', {
        h1 : optionsMain.h1,
        }, (err, html) => {
            if (err) { throw new Error("Render Error: " + err); }
            optionsMain.bodyMain = html;
        });
    })
    .then(() => {
        // Основной рендер
        res.render(config.viewMain + "/index",
        optionsMain,
        (err, html) => {
          if (err) { throw new Error(err); }
            res.send(util.replacerSpace(html)); // Обфускация HTML - delete space
        });
    })
    .catch((err) => { throw new Error(err) });
});

// Запрос карточки продукта /product/
app.get('/product/:type/:id', (req, res, next) => {
  const optionsCol = optionsMain;
  const userToken = req.cookies.add2cart_for_users || 'none';
  let inCart = null;
  let disabled = '';
  let textInBtnCart = 'Выбрать размеры';
  let classInCart = '';

  optionsCol.picture = '';

    preRender(config.pagesPath, null, res)
    .then(async (result) => {
        let checkNewCat = false;
        const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

        if (checkNew.length > 0) {
          checkNewCat = true;
        }
        // Рендер пунктов выпадашек
        let f1 = res.render(config.viewMain + '/nav.ejs', {
          checkNewCat: checkNewCat,
          items : result,
          list: await db.getQuery('SELECT * FROM `category`'),
        },
        (err, html) => {
            if (err) { console.log("Render Error: " + err); }
            optionsCol.nav  = html;
        });

        return Promise.all([f1]);
    })
    .then((f1) => {

      // Рендер всей инфы на странице товара в майн боди
      let renderByMainBody = db.getQuerySafe('products', 'id', req.params.id, 'equality').then(async (rr) => {

        let resultInCart = null;
        optionsCol.title = rr[0].category + ' -> ' + rr[0].title;

        /* Проверка наличия товара в корзине */
        await (async () => {
          resultInCart = await db.getQueryManySafe('cart', { id_prod: req.params.id, user_token: userToken, success: 0 });
        })();

        if (resultInCart.length || resultInCart.length) {
            disabled = 'disabled="true"';
            textInBtnCart = 'В корзине';
            classInCart = ' inCart';
        }

        /* Рендер модалки выбора размеров */
        await ( (sizes, sizesBra, id) =>  {
          res.render(config.modalPath + '/modalSizes.ejs', {
            sizes: sizes,
            sizesBra: sizesBra,
            pid: id
          },
          (err, html) => {
            if (err) { throw new Error(err); }
            optionsCol.modalSizes = html;
          })
        })(rr[0].sizes.split(','), rr[0].sizesBra ? rr[0].sizesBra.split(',') : [], req.params.id);

        /* Рендер самой страницы товара */
        res.render(config.pagesPath + '/card.ejs', {
          h1 : rr[0].title,
          price: rr[0].price,
          old_price: rr[0].old_price,
          id_prod: rr[0].id,
          images: rr[0].images,
          list_primary: rr[0].list_primary,
          descr: rr[0].discription,
          disabled,
          textInBtnCart,
          classInCart
        }, (err, html) => {
            if (err) { throw new Error("Render Error: " + err); }
            optionsCol.bodyMain = html;
        });
      });

      return Promise.all([renderByMainBody]);

    })
    .then((renderByMainBody) => {
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
            }, (err, html) => {
                if (err) { throw new Error("Render Error: " + err); }
                optionsMain.mobileMenu = html;
            });
        });

        return Promise.all([mobMenu]);
    })
    .then((mobMenu) => {
        // Основной рендер
        res.render(config.viewMain + "/index",
        optionsCol,
        (err, html) => {
            res.status(200).send(util.replacerSpace(html)); // Обфускация HTML - delete space
        });
    })
    .catch(err => { throw new Error(err) } );
});
// Запрос КОЛЛЕКЦИИ
app.get('/collection/:query', (req, res, next) => {

  const optionsCol = optionsMain;
    optionsCol.h1 = req.params.query;
    optionsCol.picture = '';

    if (req.params.query === 'new') {
      optionsMain.title = optionsCol.h1 = 'Новая коллекция';
      optionsMain.discription = 'Новая коллекция в интенет магазине vflingerie.com';
    } else {
      db.getQuerySafe('category', 'name', req.params.query, 'equality').then((result) => {
        optionsMain.title = optionsMain.discription = result[0].description;
      })
    }

    preRender(config.pagesPath, null, res)
    .then(async (result) => {
        let checkNewCat = false;
        const checkNew = await db.getQuery('SELECT * FROM `products` WHERE `new`=1');

        if (checkNew.length > 0) {
          checkNewCat = true;
        }

        // Рендер пунктов выпадашек
        res.render(config.viewMain + '/nav.ejs', {
          checkNewCat: checkNewCat,
          items : result,
          list: await db.getQuery('SELECT * FROM `category`'),
        },
        (err, html) => {
            if (err) { console.log("Render Error: " + err); }
            optionsCol.nav  = html;
        });
    })
    .then(() => {
        // РЕНДЕР МОБИЛЬНОГО МЕНЮ
        let mobMenu = db.getQuery('SELECT * FROM `category`')
        .then(async (result) => {
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
              if (err) { throw new Error("Render Error: " + err); }
              optionsMain.mobileMenu = html;
          });
        });

        return Promise.all([mobMenu]);
    })
    .then((mobMenu) => {
      // РЕНДЕР СТРАНИЦЫ ТОВАРОВ В ЗАВИСИМОСТИ ОТ КАТЕГОРИИ
      const objModel = { /* объект для выборки из бд */
        new: 1,
        category: req.params.query,
        visible: 1
      };

      if (req.params.query == 'new') {
        delete objModel.category;
      } else {
        delete objModel.new;
      }
      // Сам запрос на получение данных для мини карточек товара + Рендер заголовка в майн боди
      db.getQueryManySafe('products', objModel).then((result) => {

          res.render(config.pagesPath + '/collection.ejs',
          {
            h1 : optionsCol.h1,
            table: result
          },
          (err, html) => {
            if (err) { console.log("Render Error: " + err); }
            optionsCol.bodyMain = html;
          });

      })
      .then(() => {
          // Основной рендер
          res.render(config.viewMain + "/index",
          optionsCol,
          (err, html) => {
              res.send(util.replacerSpace(html)); // Обфускация HTML
          });
      });
    // конец всех рендеров страницы коллекции
    })
    .catch((err) => { throw new Error("Render Error: " + err) });
});
// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).send("<p>Sorry can't find that you want!</p> <p><b>Error 404 </b></p><br><br><a href='/'>HOME<a>");
  //res.status(404).render(error.ejs, {})
});

app.listen(4000);

// Рендер Десктопного Меню ( Для 'выпадашек' )
function preRender (path, args = [], res) {

  let template = [];

  return new Promise(async (resolve, reject) => {

    args = await db.getQuery('SELECT * FROM `category`');

    args.forEach(async item => {

      await (() => {
         res.render(path + '/menu/desktop_menu.ejs',
         {
           link: item.name,
           description: item.description,
           img: item.images
         },
         (err, html) => {
            if (err) { throw new Error("Render Error: " + err) }
            template.push(util.replacerSpace(html)); // Обфускация HTML
         });
      })();

    });

    return resolve(template);
  });
}