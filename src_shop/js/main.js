import $ from "jquery";
import stickybits from 'stickybits'
import "slick-carousel";
import "./scroll_bar.js";
import "./dropZone.js";
import "./globalFunctions/globalFunctions.js";
import "./cart.js";
import "./user.js";
import { inputMaskRus as inputMask } from "./inputMaskRus.js";
import {checkScroll, throttle} from "./scroll.js";

/**
 * Диалоговое окно на подтверждение удаления строки, таблицы и т. д.
 **/
const confirmDelete = (question) => {
    if (confirm("Вы подтверждаете удаление " + question + "?")) {
        return true;
    }
    return false;
}
const checkScrollWindow = throttle(checkScroll, 150);
let initSwitch = true;
window.dom = {};
window.dom.query = $.noConflict(true);

$(window).on('resize', function() {
    if (window.innerWidth >= 980 && !initSwitch) {

        document.addEventListener('scroll', function() {
            $('.Menu__sub--active').removeClass('Menu__sub--active');
        });
       /* document.removeEventListener('touchend', checkScrollEnd);
        document.removeEventListener('touchmove', checkScrollWindow);*/
        $('.js-footerAccordion').slideDown(300);
        $('.js-sidebar').slideDown(300);
        $('.js-imagesSlider').slick('unslick');
        initSwitch = true;
    } else if (window.innerWidth <= 980 && initSwitch) {
        /*document.addEventListener('touchend', checkScrollEnd);
        document.addEventListener('touchmove', checkScrollWindow);*/
        document.removeEventListener('scroll', function() {
            $('.Menu__sub--active').removeClass('Menu__sub--active');
        });
        $('.js-footerAccordion').slideUp(100);
        $('.js-sidebar').slideUp(100);
        initSwitch = false;

        $('.js-imagesSlider').slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            useTransform: true,
            adaptiveHeight: true,
            centerMode: false,
            dots: true,
            arrow: false,
            TouchMove: false,
            infinite: false,
            centerPadding: '0',
            swipeToSlide: false,
            // asNavFor: '.js-imagesSliderNav',
            // vertical: true,
            variableWidth: false,
            // focusOnSelect: true,
            responsive: [
                {
                  breakpoint: 1025,
                  settings: {
                    dots: true,
                    centerMode: true,
                    slidesToShow: 1,
                    vertical: false,
                    TouchMove: true,
                    swipeToSlide: true
                  }
                }
              ]
        });
    }
}).resize();

$(document).on('mouseenter', '.js-mouseSee', function(e) {
    e.preventDefault();
    const text = $(this).text();
    const menu = $(`.Menu__sub[data-name="${text}"]`);

    $('.Menu__sub--active').removeClass('Menu__sub--active');

    setTimeout(function() {
        menu.addClass('Menu__sub--active');
    }, 100)
});

/* Toggle slide in footer information */
$(document).on('click', '.js-toggleSlide', function(e) {
    e.preventDefault();
    const $parent = $(this).data('block');

    if (window.innerWidth >= 981 && $parent !== 'faq') {
        return false;
    }

    if($parent === 'faq') {

        if(!$(this).hasClass('color-active')) {
            /* Закроем сначала предыдущие вкладки */
            $('.Faq .color-active').each(function() {
                $(this).toggleClass('color-active');
                $(this).closest('.Faq__accordion').find('.js-footerAccordion').slideToggle(200);
                $(this).find('.icon-minus').toggle();
                $(this).find('.icon-plus').toggle();
            });
        }

        $(this).toggleClass('color-active');
        $(this).closest('.Faq__accordion').find('.js-footerAccordion').slideToggle(200);
    } else {
        $(this).parent().find('.js-footerAccordion').slideToggle(300);
    }

    $(this).find('.icon-minus').toggle();
    $(this).find('.icon-plus').toggle();

});

$(document).on('mouseout', '.Menu__sub--active', function(e) {
    e.preventDefault();

    let list = '';

    try {
        list = e.relatedTarget.offsetParent.classList;
    } catch (err) {
      $(this).removeClass('Menu__sub--active');
      return false;
    }

    if(list.contains('Menu__sub--active') || list.contains('nav-link--image-block')) {
        return false;
    }

    $(this).removeClass('Menu__sub--active');
});

$(document).on('click', '.js-mobMenu', function(e) {
    e.preventDefault();
    $('.Nav__mob-menu').toggleClass('menu-is-expanded');
    $('.js-mobileNav').toggleClass('menu-is-expanded');
    $('body').toggleClass('no-scroll');

    if($('.Nav__mob-menu').hasClass('menu-is-expanded')) {
        document.removeEventListener('touchend', checkScrollEnd);
        document.removeEventListener('touchmove', checkScrollWindow);
    }
    else {
        document.addEventListener('touchend', checkScrollEnd);
        document.addEventListener('touchmove', checkScrollWindow);
    }
});

$(document).on('click', '.js-cartToggle', function(e) {
    e.preventDefault();
    $('.Cart').toggleClass('cart-is-expanded');
});
/*Запрос для получения странички админки добавления товара*/
$(document).on('click', '.js-btnAddProd', function(e) {
    e.preventDefault();
    let bool = true;
    const tt = $(this).data('src');
    const idProd = $(this).data('product_id') || $('input[name*=\'selected\']:checked').data('product_id') || null;

    if(tt == 'deleteProd' && idProd != '' && idProd != null) {
        bool = confirmDelete('');
        if (!bool) {
            return false;
        }
    }

    $.ajax({
        url: location.href,
        type: 'POST',
        cache: false,
        dataType: "json",
        data: {param1: tt, idProd: idProd},
        beforeSend: function() {
            $(this).prop("disabled", true);
        },
    })
    .done(function(data) {
        $('.js-ajaxContent').html(data.result);
        /* Скролл бар как на apple */
        $('.js-scrollContent').simplebar();

        [].forEach.call(document.querySelectorAll('img[data-src]'), function (img) {
        img.setAttribute('src', img.getAttribute('data-src'));

        img.onload = function () {
            img.removeAttribute('data-src');
        }
    });
    })
    .fail(function(xhr, ajaxOptions, thrownError) {
        console.log("Error: " + thrownError);
    })
    .always(function() {
        $(this).prop("disabled", false);
    });

});

function showModal() {
    $('.Fixed-overlay').show();
    $('.Modal').addClass('active');
    $('body').addClass('no-scroll');
}

;window.onload = function() {
    var inputThisPage = document.querySelectorAll('#checkoutStep1 input');

    inputMask({
        input: $('.js-numberFormat')
    })
    // Скролл бар как на apple
    $('.js-scrollContent').simplebar();
// Проверка добавки нового товара в админке
    if(location.href.search(/admin/) != -1 && getCookie('successAddProduct')) {
        let readyProduct = getCookie('successAddProduct');
        readyProduct = readyProduct.split('__');
        showModal();
        $('.js-resSys').html('Товар "'+ readyProduct[0] +'", успешно добавлен! <br><br> ID товара: '+ readyProduct[1] +' ');
        setCookie('successAddProduct', '', -1);
        setCookie('localStorageInput', '', -1);
        localStorage.clear();
        readyProduct = null;
    }
// Проверка добавки новой категории в админке
    if(location.href.search(/admin\/cat/) != -1 && getCookie('successAddCat')) {
        let readyProduct = getCookie('successAddCat');
        readyProduct = readyProduct.split('__');
        showModal();
        $('.js-resSys').html('Категория "'+ readyProduct[0] +'", успешно добавлена! <br><br> ID категории: '+ readyProduct[1] +' ');
        setCookie('successAddCat', '', -1);
        readyProduct = null;
    }
// Проверка на обновление продукта в админке
    if(location.href.search(/admin/) != -1 && getCookie('updatedProduct')) {
        let readyProduct = getCookie('updatedProduct');
        readyProduct = readyProduct.split('__');
        showModal();
        $('.js-resSys').html('Запись о товаре "'+ readyProduct[0] +'", успешно обновлена! ');
        setCookie('updatedProduct', '', -1);
        setCookie('updateProduct', '', -1);
        readyProduct = null;
    }
// Проверка на обновление категории в админке
    if(location.href.search(/admin/) != -1 && getCookie('updatedCat')) {
        let readyProduct = getCookie('updatedCat');
        readyProduct = readyProduct.split('__');
        showModal();
        $('.js-resSys').html('Запись об категории "'+ readyProduct[0] +'", успешно обновлена! ');
        setCookie('updatedCat', '', -1);
        setCookie('updateCat', '', -1);
        readyProduct = null;
    }
    /**
     * Ленивая загрузка изображений
     */
    [].forEach.call(document.querySelectorAll('img[data-src]'), function (img) {
        img.setAttribute('src', img.getAttribute('data-src'));

        img.onload = function () {
            img.removeAttribute('data-src');
        }
    });

    if(location.href.search(/product/) == -1) {

        $('.js-slickCard').each(function(index, el) {

            if($(this).find('img').length > 1) {

                $(this).slick({
                    useTransform: true,
                    adaptiveHeight: true,
                    lazyLoad: 'progressive',
                    centerMode: true,
                    dots: false,
                    arrow: true,
                    prevArrow: $(this).parents('.Block-item').find('.Block__arrows--left'),
                    nextArrow: $(this).parents('.Block-item').find('.Block__arrows--right'),
                    TouchMove: true,
                    infinite: true,
                    centerPadding: '0',
                    swipeToSlide: true,
                    variableWidth: false
                });
            }
        });
    }
    else {
        var stickybit = stickybits('.sidebar', {
            stickyBitStickyOffset: 110,
            useStickyClasses: true,
            useFixed: true
        })
        // $('.js-imagesSliderNav').slick({
        //     useTransform: true,
        //     adaptiveHeight: true,
        //     centerMode: true,
        //     dots: false,
        //     arrow: false,
        //     slidesToShow: 3,
        //     slidesToScroll: 1,
        //     infinite: false,
        //     centerPadding: '0',
        //     swipeToSlide: true,
        //     asNavFor: '.js-imagesSlider',
        //     vertical: true,
        //     focusOnSelect: true
        // });
        
        /* prevArrow: $('.Block__arrows--left'),
           nextArrow: $('.Block__arrows--right'), */
    }

    /* Восстановление введённых значений из инпута при случайной перезагрузке или прочего фейла */
    if(location.href.search(/order/) > -1 && getCookie('localStorageInputUser') && location.href.search(/admin/) == -1) {
        var forImg = 0;
        for (var i = inputThisPage.length - 1; i >= 0; i--) {
            var strSearch = inputThisPage[i].name

            var getVal = prodStorageGet(strSearch);

            if(getVal != null && getVal != undefined) {
                inputThisPage[i].value = getVal;
            }
        }

        if($('#checkout_shipping_region').val().length > 2) {
            $('#checkout_shipping_city').closest('.Order-step__sections').removeClass('is-hidden');
        }
    };

    if (location.href.search(/order/) == -1 && location.href.search(/admin/) == -1) {
        /* Вывод подитога в карточку корзины */
        if(getCookie('total_sum_in_cart')) {
            $('.js-moneyTotal').text(getCookie('total_sum_in_cart'));
        }
        /* Вывод корзины, если там есть что */
        if(getCookie('total_in_cart') && getCookie('total_in_cart').length > 0) {
            const resultInsert = document.querySelector('.js-insertInCartProd');
            const $iconBag = $('.js-cartIcon');
            $.post('/requirecart', {param1: 'getCart'}, function(data, textStatus, xhr) {
                data = JSON.parse(data);
                $('.js-cartEmpty').hide();
                resultInsert.insertAdjacentHTML("beforeEnd",data.result);
                $iconBag.html('<svg xmlns="http://www.w3.org/2000/svg" width="15" height="17" viewBox="0 0 15 17"><title>icon-bag-items</title><path d="M3.59,4.57V4a3.91,3.91,0,1,1,7.82,0v.62h2.65L15,17H0L.94,4.57Zm1,0h5.82V4A2.91,2.91,0,1,0,4.59,4Z" fill="#daa676"></path></svg><span class="Nav__cart-count">'+ getCookie('total_in_cart') + '</span>');
            });
        }
    }
}