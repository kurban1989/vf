import $ from "jquery";
import { testEmail } from "./inputMaskRus.js";

/* запрос на создание юзера */
$(document).on('click', '.js-createUser', function(e) {
    e.preventDefault();
    const requiredData = document.querySelectorAll('input[aria-required]');
    let dataObj = {};
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
        dataObj = Object.assign({}, getFormData($('#formRegistr')));
    }

    if(!testEmail($('#reg_email').val())) {
        $(this).prop('disabled', false);
        $('#reg_email').addClass('Error-input');
        return false;
    } else if(dataObj.regpass != dataObj.regconfirmpass) {
        $(this).prop('disabled', false);
        $('.Fixed-overlay').show();
        $('body').addClass('no-scroll');
        $('.Modal').addClass('active');
        $('.js-differentMsg').html('<b style="color:#D28F3F;">Пароли не совпадают!</b>');
        return false;
    }

    $.post('/account/reguser/', dataObj, (data, textStatus, xhr) => {
        $(this).prop('disabled', false);
        $('.Fixed-overlay').show();
        $('body').addClass('no-scroll');
        $('.Modal').addClass('active');
        $('.js-differentMsg').html('<b style="color:#D8C25C;">Новый аккаунт успешно создан!<br> На ваш email выслано письмо</b>');

        setTimeout(function(args) {
            window.location.href='/account/inside/';
        }, 3000)
    });
});

/* запрос залогинить юзера */
$(document).on('click', '.js-LogIn', function(e) {
    e.preventDefault();
    const requiredData = document.querySelectorAll('input[aria-required]');
    let dataObj = {};
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
        dataObj = Object.assign({}, getFormData($('#formLogin')));
    }

    if(!testEmail($('#reg_email').val())) {
        $(this).prop('disabled', false);
        $('#reg_email').addClass('Error-input');
        return false;
    }

    $.post('/account/login/', dataObj, (data, textStatus, xhr) => {
        $(this).prop('disabled', false);
        data = JSON.parse(data)

        if(data.error) {
            $('.Fixed-overlay').show();
            $('body').addClass('no-scroll');
            $('.Modal').addClass('active');
            $('.js-differentMsg').html('<b style="color:#FFB54C;">Ошибка: '+data.text+'</b>');
        } else if(data.path) {
            window.location.href = data.path;
        }
    })
});

/* запрос на отправку отзыва на странице faq */
$(document).on('click', '.js-faqQuery', function(e) {
    e.preventDefault();
    const faqForm = document.querySelector('#faqQuery');
    const requiredData = faqForm.querySelectorAll('[aria-required]');
    let dataObj = {};
    let err = false;

    $(this).prop('disabled', true);

    [].forEach.call(requiredData, function(item) {
        if(item.value === '' || item.value.length == 1) {
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
        dataObj = Object.assign({}, getFormData($('#faqQuery')));
    }

    if(!testEmail($('#faq_email').val())) {
        $(this).prop('disabled', false);
        $('#faq_email').addClass('Error-input');
        return false;
    }

    $('.js-preloaderFaq').show();

    $.post('/pages/reviews/', dataObj, (data, textStatus, xhr) => {
        data = JSON.parse(data);
        $('.js-preloaderFaq').hide();
        $('#faq_text').val('');

        [].forEach.call(requiredData, function(item) {
            item.value = '';
        });

        openModal();

        $('.js-differentMsg').html(data.result);
        $(this).prop('disabled', false);

        setTimeout(() => {
            closeModal()
        }, 7000)

    });
})
