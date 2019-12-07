import $ from "jquery";
import { testEmail } from "./inputMaskRus.js";
let changedSize = 0

$(document).ready(function() {
    /* ОБщая сумма товара в корзине у юзера */
    if(!getCookie('total_sum_in_cart')) {
        setCookie('total_sum_in_cart', '0', 5);
    }
});
/* Закрытие модалки для выбора размеров */
$(document).on('click', '.action-close', function(event) {
    event.preventDefault();
    closeModal();
});
/* ВЫбор размера */
$(document).on('change', '#optionOfSize', function() {
    $('.js-add2cart').prop('disabled', true);

    if ($(this).val() != 'none' && $(this).val() != '') {

        $('#optionOfBra').length > 0 ? changedSize++ : changedSize = changedSize + 2;
        changedSize >= 2 ? $('.js-add2cart').prop('disabled', false) : $('js-add2cart').prop('disabled', true);
        $(this).siblings('.is-selected').removeClass('is-hidden');

    } else {
        $(this).siblings('.is-selected').addClass('is-hidden');
        changedSize--;
    }
});
/*  Выбор размера лифчика  */
$(document).on('change', '#optionOfBra', function() {
    $('.js-add2cart').prop('disabled', true);

    if ($(this).val() != 'none' && $(this).val() != '') {

        changedSize++;
        changedSize === 2 ? $('.js-add2cart').prop('disabled', false) : $('js-add2cart').prop('disabled', true);
        $(this).siblings('.is-selected').removeClass('is-hidden');

    } else {
        $(this).siblings('.is-selected').addClass('is-hidden');
        changedSize--;
    }
});
/* Открытие модалки с размерами */
$(document).on('click', '.js-getSize', function(e) {
    $('.Fixed-overlay').show();
    $('body').addClass('no-scroll');
    $('.Modal').addClass('active');
});
/* Добавление товара в корзину */
$(document).on('click', '.js-add2cart', function(e) {
    if(!getCookie('add2cart_for_users')) {
        setCookie('add2cart_for_users', new String(new Date().getTime()).hashCode(), 5);
    }
    /* ОБщее количество товара в корзине у юзера */
    if(!getCookie('total_in_cart')) {
        setCookie('total_in_cart', 1, 5);
    } else {
        setCookie('total_in_cart', parseInt(getCookie('total_in_cart'), 10) + 1, 5);
    }

    if(getCookie('total_sum_in_cart').length == 0) {
        setCookie('total_sum_in_cart', '0', 5);
    }

    $('.js-getSize').prop('disabled', true);
    closeModal();

    const $iconBag = $('.js-cartIcon');
    const resultInsert = document.querySelector('.js-insertInCartProd');
    const id = $(this).data('product_id');
    const size = $('#optionOfSize').val() + String(!!$('#optionOfBra').val() ? ' / Bra: ' + $('#optionOfBra').val() : '');
    let insertID = 0;

    $('.js-getSize').html('<span>В корзине</span>').addClass('inCart');
    $(this).addClass('inCart');

    $iconBag.html('<svg xmlns="http://www.w3.org/2000/svg" width="15" height="17" viewBox="0 0 15 17"><title>icon-bag-items</title><path d="M3.59,4.57V4a3.91,3.91,0,1,1,7.82,0v.62h2.65L15,17H0L.94,4.57Zm1,0h5.82V4A2.91,2.91,0,1,0,4.59,4Z" fill="#daa676"></path></svg><span class="Nav__cart-count">'
    + getCookie('total_in_cart') + '</span>');

    $.post('/add2cart/', {user: getCookie('add2cart_for_users'), product: id, size: size}, function(data, textStatus, xhr) {
        data = JSON.parse(data);

        $('.js-cartEmpty').hide();

        insertID = data.result.insertId;

        $.post('/add2cart/get_info/', {product: id}, function(data, textStatus, xhr) {
            data = JSON.parse(data);

            let img = data.result[0].images.split(',');

            setCookie('total_sum_in_cart', String(parseInt(getCookie('total_sum_in_cart'), 10) + parseInt(data.result[0].price, 10)), 5);

            resultInsert.insertAdjacentHTML("beforeEnd", templateCart({
                img: img[0],
                title: data.result[0].title,
                price: data.result[0].price,
                id: data.result[0].id,
                size: size,
                insertID: insertID
            }));

            $('.js-moneyTotal').text(getCookie('total_sum_in_cart')); /* Вывод подитога в карточку корзины */

            if($('.cart-is-expanded').length == 0) {
                $('.js-cartToggle').trigger('click');
            }
        });
    });
});
// Удаление товара из корзины
$(document).on('click', '.js-removeFromCart', function(e) {
    e.preventDefault();
    const userId = getCookie('add2cart_for_users');
    const idProd = $(this).data('product_id');
    const cost = $(this).closest('.cart-item').find('.js-money').text() || $(this).closest('.Product-table__cart').find('.js-money').text();
    const count = $(this).closest('.cart-item').find('.js-quantity').val() || $(this).closest('.Product-table__cart').find('.js-quantity').val();

    $.post('/add2cart/remove/', {product: idProd, user: userId}, function(data, textStatus, xhr) {
        $('.cart-item[data-cart="'+idProd+'"]').remove();
        /* Минусуем удалённое из куков */
        setCookie('total_sum_in_cart', String(parseInt(getCookie('total_sum_in_cart'), 10) - parseInt(cost * count, 10)), 5);
        setCookie('total_in_cart', parseInt(getCookie('total_in_cart'), 10) - parseInt(count, 10), 5);
        $('.js-moneyTotal').text(getCookie('total_sum_in_cart')); /* Вывод подитога в карточку корзины */
        $('.js-getSize[data-product_id="' + idProd + '"]')
        .prop('disabled', false)
        .html('<span>Выбрать размеры</span>')
        .removeClass('inCart');
        $('.Nav__cart-count').text(getCookie('total_in_cart')); /* Общее кол-во единиц товара в корзине */
        if (getCookie('total_sum_in_cart') == '0') {
            $('.js-cartEmpty').show();
        }

        setTimeout(function() {
            if (location.href.search(/cart/) > -1) {
                window.location.href = location.href;
            }
        }, 100);
    });
});
// Minus-Plus
$(document).on('click', '.js-crement', function(e) {
    e.preventDefault();
    minusPlus($(this));
});
// Minus-Plus
$(document).on('keyup', '.js-quantity', function(e) {
    e.preventDefault();
    const userId = getCookie('add2cart_for_users');
    const cost = $(this).closest('.cart-item').find('.js-money').text() || $(this).closest('.Product-table__cart').find('.js-money').text();
    let val = $(this).val();
    let oldVal = parseInt($(this).attr('data-old_val'), 10) || 1; /*Старое значение кол-ва.*/
    let plus = true;
    let diff = 1;
    let idProd = $(this).closest('.cart-item').find('.js-removeFromCart').data('product_id');
    idProd = $('.cart-item[data-cart="' + idProd + '"]').data('insert_id') || $(this).data('product_id');

    if(val == '' || val == 0) {
        $(this).attr('data-old_val', '0');
        return;
    } else if(val <= -1) {
        $(this).closest('.cart-item').find('.js-removeFromCart').trigger('click');
        return false;
    }
    /* Проверяем старое значение */
    plus = parseInt(oldVal, 10) > parseInt(val, 10) ? false : true;
    diff = parseInt(oldVal, 10) > parseInt(val, 10) ? oldVal - val : oldVal == val ? 0 : val - oldVal;
    /* Запоминаем новое старое значение инпута */
    $(this).attr('data-old_val', val);

    setNewQuantity(idProd, userId, val, cost, plus, diff );
});
// Minus-Plus
function minusPlus(el) {
    const action = $(el).data('action');
    const $input = $(el).siblings('.js-quantity');
    const userId = getCookie('add2cart_for_users');
    const cost = $(el).closest('.cart-item').find('.js-money').text() || $(el).closest('.Product-table__cart').find('.js-money').text();
    let idProd = $(el).closest('.cart-item').find('.js-removeFromCart').data('product_id') || $(el).data('product_id');
    let val = $input.val();
    let plus = true;
    idProd = $('.cart-item[data-cart="' + idProd + '"]').data('insert_id');

    if(action == 'plus') {
        val++;
    } else {
        val--;
        plus = false;
    }

    if(val == 0) {
        $(el).attr('data-old_val', '0');
        return;
    }

    if(val <= -1) {
        $(el).closest('.cart-item').find('.js-removeFromCart').trigger('click');
        return false;
    }

    /* Запоминаем новое старое значение инпута */
    $(el).siblings('.js-quantity').attr('data-old_val', val);
    $input.val(val);
    setNewQuantity(idProd, userId, val, cost, plus);
}
/* Функция обновления количества товара в бд */
function setNewQuantity(idProd, userId, quantity, cost, plus, diffSum = 1) {
    /*console.log(idProd, userId, quantity, cost, plus, diffSum);*/
    const nowSum = parseInt(getCookie('total_sum_in_cart'), 10);

    $.post('/add2cart/quantity/', {product: idProd, user: userId, quantity: quantity}, function(data, textStatus, xhr) {
        if(!plus)
        {
            setCookie('total_sum_in_cart', String(nowSum - parseInt(cost * diffSum, 10)), 5);
            setCookie('total_in_cart', parseInt(getCookie('total_in_cart'), 10) - parseInt(diffSum, 10), 5);
        } else {
            setCookie('total_sum_in_cart', String(nowSum + parseInt(cost * diffSum, 10)), 5);
            setCookie('total_in_cart', parseInt(getCookie('total_in_cart'), 10) + parseInt(diffSum, 10), 5);
        }

        $('.js-moneyTotal').text(getCookie('total_sum_in_cart')); /* Вывод подитога в карточку корзины */
        $('.Nav__cart-count').text(getCookie('total_in_cart'));  /* Общее кол-во единиц товара в корзине */

        setTimeout(function() {
            if (location.href.search(/cart/) > -1) {
                window.location.href = location.href;
            }
        }, 100);
    });
}
/* Шаблон товара в корзине */
function templateCart(args) {
return `<div class="cart-item" data-cart="${args.id}" data-insert_id="${args.insertID}">
        <div class="cart-item__inner">
            <div class="cart-item__image">
                    <a href="/product/${args.title}/${args.id}/"><img src="${args.img}" alt=""></a>
                </div>
                <div class="cart-item__content">
                    <div>
                        <div class="cart-item__title">
                            <p><a href="/product/${args.title}/${args.id}/">${args.title}</a></p>
                            <div class="cart-item__remove small">
                                <button class="js-removeFromCart" data-product_id="${args.id}">
                                <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="7.79" height="7.79" viewBox="0 0 7.79 7.79"><path d="M4.6,3.9l3-3,0,0a.49.49,0,0,0,0-.68l0,0a.49.49,0,0,0-.68,0L3.9,3.2.85.15l0,0a.49.49,0,0,0-.68,0l0,0a.49.49,0,0,0,0,.68l3,3.05-3,3h0a.5.5,0,0,0,0,.71.5.5,0,0,0,.7,0L3.9,4.6l3,3.05a.5.5,0,0,0,.7,0h0a.5.5,0,0,0,0-.71Z" transform="translate(0 0)"></path></svg>
                                </button>
                            </div>
                        </div>
                            <div class="cart-item__description">${args.size}</div>
                    </div>

                <div class="cart-item__footer">
                    <div>
                        <div class="quantity-selector">
                            <button type="button" class="quantity-selector__decrement js-crement" data-action="minus">
                                <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 1.02" class="icon-minus"><path d="M.31,6.51C.14,6.51,0,6.29,0,6s.14-.49.31-.49l11.37,0c.18,0,.32.23.32.5s-.14.5-.32.5h0Z" transform="translate(0 -5.49)"></path></svg>
                            </button>
                            <input type="number" class="quantity-selector__quantity js-quantity" value="1" disabled>
                            <button type="button" class="quantity-selector__increment js-crement" data-action="plus">
                                <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" class="icon-plus"><path d="M.31,6.51C.14,6.51,0,6.29,0,6s.14-.49.31-.49l11.37,0c.18,0,.32.23.32.5s-.14.5-.32.5h0Z" transform="translate(0 0)"></path><path d="M5.49.32C5.49.14,5.71,0,6,0H6c.28,0,.5.14.5.31l0,11.38c0,.17-.22.31-.5.31s-.5-.14-.5-.32h0Z" transform="translate(0 0)"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="cart-item__price"><span class="money js-money">${args.price}</span></div>
                </div>
            </div>
        </div>
    </div>`;
};

/* Сохраняем в локалСторадж введённые данные юзера для доставки */
$('#checkoutStep1 input').on('blur', function(e) {
   if(e.target.value == '') return false;

    prodStorageSet(e.target.name, e.target.value);
    setCookie('localStorageInputUser', encodeURIComponent(e.target), 3);
});

/* Переход к Следующему шагу по оформлению заказа*/
$(document).on('click', '.js-nextCheckout', function(e) {
    e.preventDefault();
    const requiredData = document.querySelectorAll('input[aria-required]');
    let dataArr = undefined;
    let err = false;
    $(this).prop('disabled', true);

    [].forEach.call(requiredData, function(item) {
        if(item.value == '' || item.value.length == 1) {
            item.classList.add('Error-input');
            err = true;
        } else {
            item.classList.remove('Error-input');
        }
    });

    if(err) {
        $(this).prop('disabled', false);
        return false;
    } else {
        dataArr = getFormData($('#checkoutStep1'));
        dataArr.checkoutRegionCode = $('input[name="checkoutRegionCode"]').val();
    }

    if(!testEmail($('#checkout_email').val())) {
        $(this).prop('disabled', false);
        $('#checkout_email').addClass('Error-input');
        return false;
    }

    $('.js-preloaderOrder').show();

    $.post('/order/delivery/', dataArr, function(data, textStatus, xhr) {
        data = JSON.parse(data);
        let totalSum = 0;

        if (data.status && data.status == 'error' || data.error) {
            openModal();
           $('.js-differentMsg').html(data.msg || data.error[0].text);
        } else {
            $('.Order-main__content').addClass('is-hidden');
            $('.Order-breadcrumb__item').eq(0).addClass('Order-breadcrumb__ready');
            $('.Order-breadcrumb__item').eq(1).removeClass('Order-breadcrumb__item--blank');
            $('.Order-breadcrumb__item').eq(1).addClass('Order-breadcrumb__item--current');
            $('.Order-main__step2').removeClass('is-hidden');
            $('.js-contentEmail').text(dataArr.checkoutEmail);
            $('.js-contentPhone').text(dataArr.checkoutPhone);
            $('.js-costDelivery').text(data.result[0].result.priceByCurrency + ' ₽');
            $('.js-dayDelivery').text('( ' + data.result[0].result.deliveryPeriodMin +' - '+ data.result[0].result.deliveryPeriodMax + ' ' + num2str(data.result[0].result.deliveryPeriodMax, ['дня', 'дней']) + ' ) ');
            $('.js-contentDelivery').text('Россия, ' + dataArr.checkoutRegion + ', ' + dataArr.checkoutCity);
            $('.js-totalSumAfter').html(data.totalSum + '&nbsp;');
            $('#totalSum').val(data.totalSum);
            $('#em').val(data.email);
            $('#sign').val(data.sign);
            $('#id_order').val(data.idOrder);
        }

        $('.js-nextCheckout').prop('disabled', false);
        $('.js-preloaderOrder').hide();
    });

    /*
    postData(`http://integration.cdek.ru/v1/location/cities/json?size=5&page=0&cityName=${dataArr.checkoutCity}&regionCodeExt=${dataArr.checkoutRegionCode}`, {})
          .then(data => console.log(JSON.stringify(data))) // JSON-строка полученная после вызова `response.json()`
          .catch(error => console.error(error));

        function postData(url = '', data = {}) {
          // Значения по умолчанию обозначены знаком *
            return fetch(url, {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, cors, *same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json',
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: 'follow', // manual, *follow, error
                referrer: 'no-referrer', // no-referrer, *client
                body: JSON.stringify(data), // тип данных в body должен соответвовать значению заголовка "Content-Type"
            })
            .then(response => response.json()); // парсит JSON ответ в Javascript объект
        }*/
});

$(document).on('click', '.js-returnInfo', function(e) {
    e.preventDefault();
    $('.Order-main__content').removeClass('is-hidden');
    $('.Order-breadcrumb__item').eq(0).removeClass('Order-breadcrumb__ready');
    $('.Order-breadcrumb__item').eq(1).addClass('Order-breadcrumb__item--blank');
    $('.Order-breadcrumb__item').eq(1).removeClass('Order-breadcrumb__item--current');
    $('.Order-main__step2').addClass('is-hidden');
});
/* Развернуть/Свернуть детали заказа в ORDER */
$(document).on('click', '.js-toggleSidebar', function(e) {
    $('.js-sidebar').slideToggle(300);
    $('.js-textShow1').toggleClass('is-hidden');
    $('.js-textShow2').toggleClass('is-hidden');
    $('.js-toggleIcon').toggleClass('Order-sidebar__mobile--arrow-up');
});

/* Для модалка что статус заказа изменён */
$(document).on('click', '#orderSuccess', function(e) {
    e.preventDefault();
    $(this).hide();
    $('.js-statusOrder').text('Обработан');
    $('.Fixed-overlay').show();
    $('.Modal').addClass('active');
    $('body').addClass('no-scroll');
    $('.js-resSys').html('Статус заказа успешно изменён! ');
});

/* склонение слов в зависимости от числового значения (дня/дней) */
function num2str(n, text_forms) {
    n = Math.abs(n) % 100; var n1 = n % 10;
    if (n > 10 && n < 20) { return text_forms[1]; }
    if (n1 > 1 && n1 < 5) { return text_forms[0]; }
    if (n1 == 1) { return text_forms[0]; }
    return text_forms[1];
}