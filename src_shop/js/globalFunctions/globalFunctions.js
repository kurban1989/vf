import $ from "jquery";

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};
/**
 * Конвертация данных в число с плавающей точкой
 * Если завершилось неудачей, то вернём оригинальную строку
 */
window.toNumber = function(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n
}
// закрытие модалки
;window.closeModal = function() {
    $('.Fixed-overlay').removeAttr('style');
    $('body').removeClass('no-scroll');
    $('.Modal').removeClass('active');
};
/* Открытие модалки */
window.openModal = function() {
    $('.Fixed-overlay').show();
    $('body').addClass('no-scroll');
    $('.Modal').addClass('active');
}
/**
 * Установка/удаление cookie
 */
window.setCookie = function(name, value, days) {

    var expires = "";
    if (typeof days == "number" && days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/" + "; domain=." + window.location.host;
};

/**
 * Получаем cookie
 */
window.getCookie = function(name) {
    var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}
/**
 * Определение класса
 * @param  {[эни]} object [любой объект или строка, или литерал]
 * @return {[type]}       [тип принадлежащего родного класса js]
 */
window.classOf = (object) => {
   return Object.prototype.toString.call(object).slice(8, -1);
};
/* Показываем/скрываем алерты  */
window.alerts = function(text, timeout = 5350, style = 'red') {
    const obj = $('.Alert-wrapper');
    obj.addClass('Alert-wrapper--animate-w');
    $('.js-alertText').text(text);

    if (style === 'green')
    {
        $('.Alert-overlay__container--window').addClass('Alert-overlay__container--good-news');
    }

    setTimeout(function() {

        $('.Alert-overlay__container--good-news').removeClass('Alert-overlay__container--good-news');
        obj.removeClass('Alert-wrapper--animate-w');

    }, timeout);
};

// Плавная и красивая анимация чисел по возрастанию
window.sumAnimate = function(selector, number) {

    number = parseInt(number, 10);
    const $obj = $(selector);
    let current = toNumber($obj.text());
    let intervalObj = undefined;
    let diff = number - current;
    let text = '';
    const step = Math.ceil(diff / 10);

    intervalObj = setInterval(function() {

        text = String(current + step);

        current = toNumber($obj.text());

        $obj.text(text);

        if (current >= number) {

            $obj.text(number);
            clearInterval(intervalObj);
        }

    }, 20);
};

/* Преобразуем данные формы из массива в объект */
window.getFormData = function($form) {
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function(n, i) {
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}
/* Функция сохранения в локальное хранилище данных */
window.prodStorageSet = function(inputName, data) {
    localStorage.setItem(inputName, data);
}

/* Функция получения данных из локального хранилища товара */
window.prodStorageGet = function(inputName) {
   return localStorage.getItem(inputName);
}