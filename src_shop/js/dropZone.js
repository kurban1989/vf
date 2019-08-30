import $ from "jquery";

let $ajaxHhr = null;
/**
 * Генерим фотки по шаблону
 */
function template(args) {
    return '<div class="Drop-block__gallery-elem"><a class="Drop-block__button Drop-block__button--close js-removeImage" title="Удалить изображение"><span class="icon js-removeImageSpan"></span></a><div class="Drop-block__block"><img src="' + args.src + '" alt=""></div></div>';
}
function preloader(args) {
    return '<div class="Drop-block__gallery-elem" id="load_foto"><div class="Drop-block__block"><div class="loader"></div><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 50 44" enable-background="new 0 0 50 44" xml:space="preserve"><path fill="#E1E1E1" d="M43.75,7.75c2.07,0,3.75,1.68,3.75,3.75v26.25c0,2.07-1.68,3.75-3.75,3.75H6.25c-2.07,0-3.75-1.68-3.75-3.75 V11.5c0-2.07,1.68-3.75,3.75-3.75H43.75 M43.75,5.25H6.25C2.804,5.25,0,8.054,0,11.5v26.25C0,41.196,2.804,44,6.25,44h37.5 c3.446,0,6.25-2.804,6.25-6.25V11.5C50,8.054,47.196,5.25,43.75,5.25L43.75,5.25z"></path><path fill="#E1E1E1" d="M25,37.125c-6.892,0-12.5-5.608-12.5-12.5s5.608-12.5,12.5-12.5s12.5,5.608,12.5,12.5 S31.892,37.125,25,37.125z M25,14.625c-5.514,0-10,4.486-10,10s4.486,10,10,10s10-4.486,10-10S30.514,14.625,25,14.625z"></path><rect x="13.75" y="0.25" fill="#E1E1E1" width="22.5" height="2.5"></rect></svg></div></div>';
}

$(document).on('click', '.js-removeImage', function(e) {
    e.stopPropagation();
    e.preventDefault();

    const Img = $(this).parent().find('img').attr('src');

    $(this).parent().remove();
    $('.readyLoad[value="'+ Img +'"]').val('').removeClass('readyLoad');
    /* Очистка в локальном хранилище значения */
    prodStorageSet($('input[type="hidden"]:not(.readyLoad)')[0].name + '' + $('input[type="hidden"]:not(.readyLoad)').length, '');

     $.ajax({
        url: '/photogallery/delete/',
        type: 'POST',
        cache: false,
        dataType: 'json',
        data: {img: Img},
        success: function(data) {
            console.log(data.result);
        }
    });
    return false;
});
/**
 * Обработчик загрузки
 */
window.upload = function(file) {

    if($('input[type="hidden"]:not(.readyLoad)').length == 0) {
        $('.Fixed-overlay').show();
        $('.Modal').addClass('active');
        $('body').addClass('no-scroll');
        $('.js-resSys').html('Максимально допустимое количество файлов <b>'+ $('.readyLoad').length +'</b>.<br> Сначала удалите одну из фотографий');
        return false;
    }

    // Make sure `file.name` matches our extensions criteria
    if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
        const reader = new FileReader();
        $('.js-change-quantity').addClass('is-hidden');
        $('.js-dropPhotogallery')[0].insertAdjacentHTML("beforeEnd", preloader({}));

        reader.addEventListener("load", function() {

            let dataFile = new FormData();

            dataFile.append('file', file);

            $.ajax({
                url: '/photogallery/upload/',
                type: 'POST',
                cache: false,
                dataType: 'json',
                async: false, // будем выполнять синхронно
                data: dataFile,
                contentType: false,
                processData: false
            })
            .done(function(r) {
                const writeFile = document.querySelector('input[type="hidden"]:not(.readyLoad)');
                // вставляем фото
                $('.js-dropPhotogallery')[0].insertAdjacentHTML("beforeEnd", template({
                    src: r.name,
                }));
                setTimeout(function() {
                    $('#load_foto').remove();
                },90)
                $('#fileFotoCurrent').remove();
                writeFile.value = r.name;
                prodStorageSet(writeFile.name + '' + $('input[type="hidden"]:not(.readyLoad)').length, r.name);
                writeFile.classList.add('readyLoad');
            })
            .fail(function(xhr, ajaxOptions, thrownError) {
                $('#load_foto').remove();
                $('#fileFotoCurrent').remove();
                console.log(thrownError);
                var res = String(xhr.responseText);
                alert(res.replace(/<\/?[^>]+>/g,''));
            })
            .always(function(data) {})
          }, false);

        reader.readAsDataURL(file);
    }
};
/**
 * Обработчик предварительной загрузки файла без отправки на сервер
 */
window.uploadFile = function() {

    if(event.target.classList.contains('js-removeImage') || event.target.classList.contains('js-removeImageSpan')) {
        return false;
    }

    const setMap  = new Map();

    setMap.set('type', 'file'); // Тип инпута
    setMap.set('class', 'is-hidden');
    setMap.set('name', 'fotoCurrent');
    setMap.set('id', 'fileFotoCurrent');
    setMap.set('accept', 'image/*');

    if ($('#fileFotoCurrent').length > 0) {
        /* И откроем диалог */
        $('#fileFotoCurrent').trigger("click");

        return;
    }

    // создаём input на лету.
    let $input = document.createElement("input");

    setMap.forEach(function(value, key){
        $input.setAttribute(key, value);
    });

    let innerIn = $('body');

    innerIn.append($input);

    $input.click(); // открываем диалог

    $input.addEventListener('change', function() {
        [].forEach.call($input.files, upload);
    }, true);
};

/* Поиск категории по нажатию клавиши, начиная со второй */
$(document).on('keyup', '.js-keyPopup', function(e) {
    e.stopPropagation();
    const $insert = $(this).parent().find('.js-categoryPopup');
    const val = $(this).val();
    const ids = $(this).attr('id');
    let search = 'searchCat';

    if(ids == 'input-title') {
        search = 'searchTitleProd';
    }

    if(ids == 'checkout_shipping_city') {
        search = 'searchCity';
    }

    if(val.length < 2) {
        if (location.href.search(/order/) > -1 && ids == 'checkout_shipping_region') {
            $('#checkout_shipping_city').val('');
        }

        return false;
    }

    if(ids == 'checkout_shipping_city' && e.type == 'focusout' ) {
        return false;
    }
    /* Тормозим лишний Аякс запрос */
    if ($ajaxHhr != null){
        $ajaxHhr.abort();
        $ajaxHhr = null;
    }

    $insert.html('');
    $insert.hide();

    $ajaxHhr = $.ajax({
        url: location.href,
        type: 'POST',
        cache: false,
        dataType: 'json',
        data: {param1: search, param2: val, param3: $('#checkout_shipping_region').val()},
    })
    .done(function(data) {
        $insert.show();
        if(data.result.length == 0) {
            $insert.hide();
        }

        [].forEach.call(data.result, function(item) {
            let codeRegion = item.regionCodeExt || '';
            let checkRegionClass = '';
            let hide = '';

            item.name = item.name || item.title || item.city || item.region;

            if(ids === 'checkout_shipping_region') {
                checkRegionClass = ' js-codeRegionExtension';
                $('input[name="checkoutRegionCode"]').val(codeRegion)

                if (e.type == 'focusout' && data.result.length > 0 && data.result.length < 2) {
                    hide = ' class="is-hidden"';
                }
            }


            $insert.append(`<li${hide}><a href="" class="js-insertSearchRes">${item.name}</a><span class="is-hidden${checkRegionClass}">${codeRegion}</span></li>`);

        })
    })
    .fail(function(xhr, ajaxOptions, thrownError) {
        console.log(thrownError);
    })
    .always(function() {
    });
});
/**
 *   Отлавливаем клик вне области выпадашки
 */
$(document).mouseup(function(e) {
    if (!$('.js-categoryPopup').is(e.target) && $('.js-categoryPopup').has(e.target).length === 0) {
        $('.js-categoryPopup').hide();
    }
});

/* Вставка в инпут найденного текста категории */
$(document).on('click', '.js-insertSearchRes', function(e) {
    e.preventDefault();
    let $input = $(this).closest('.Content-table__filter--form-group').find('.js-keyPopup');
    let codeRegion = $(this).siblings('span.js-codeRegionExtension').text();

    if($input.length == 0) {
        $input = $(this).closest('.Order-step__sections').find('.js-keyPopup');
    }

    $input.val($(this).text());

    if(codeRegion) {
        $('input[name="checkoutRegionCode"]').val(codeRegion);
    }

    setTimeout(function() {
        $input.focus();
        $input[0].selectionStart = $input[0].value.length;
    }, 50)
    $(this).parents('.js-categoryPopup').hide();

    if (location.href.search(/order/) > -1) {
        $('#checkout_shipping_city').closest('.Order-step__sections').removeClass('is-hidden');
    }
});

/*
 * Запрос на обновление записи товара
 */
 $(document).on('click', '#submitFormProd', function(event) {
    event.preventDefault();
    const requiredData = document.querySelectorAll('input[required]');
    let typeBtn = $(this).attr('type');
    let err = false;

    [].forEach.call(requiredData, function(item) {
        if(item.value == '') {
            item.classList.add('Error-input');
            err = true;
        } else {
            item.classList.remove('Error-input');
        }
    });

    if(err) {
        $('.Fixed-overlay').show();
        $('.Modal').addClass('active');
        $('body').addClass('no-scroll');
        $('.js-resSys').html('ОШИБКА: Не все обязательные поля заполнены! ');
        return false;
    }

    if(typeBtn == 'submit') {
        $('#addNewProd').trigger('submit'); return;
    }

    let arrData = $('#addNewProd').serialize();

    $('#addNewProd input[type="checkbox"').each(function(index, el) {
        if(!$(el).is(':checked')) {
           arrData += '&' + $(el).attr('name') + '=0';
        }
    });

    $.get(location.href + '?' + arrData + '&update=1', function(data) {
        location.href = location.href;
    });
 });
 /*
 * Запрос на обновление записи Категори
 */
 $(document).on('click', '#submitFormCat', function(event) {
    event.preventDefault();
    let typeBtn = $(this).attr('type');

    if(typeBtn == 'submit') {
        $('#addNewProd').trigger('submit'); return;
    }

    let arrData = $('#addNewProd').serialize();

    $.get(location.href + '?' + arrData + '&update=1', function(data) {
        location.href = location.href;
    });
 });
 /**
  *     Функция фильтрации
  **/
  $(document).on('click', '#button-filter', function(e) {
      e.preventDefault();
      let filter = $('#filter_group').serialize();
      let test = '';
      $('#filter_group').serializeArray().forEach(function(item){ test += item.value; });

      if(test.length < 2) {
        $('.Fixed-overlay').show();
        $('.Modal').addClass('active');
        $('body').addClass('no-scroll');
        $('.js-resSys').html('В фильтрах - Необходимо заполнить хотя бы одно поле или поставить одну "галочку"! ');
        return false;
      }

      $.get(location.href + 'filter/?' + filter, function(data) {
            $('.js-removeRow').remove();
            const target = document.querySelector('#header_row_table');
            target.insertAdjacentHTML("afterEnd", data);
      });
  });