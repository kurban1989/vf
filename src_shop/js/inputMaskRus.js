import $ from "jquery";
/**
* Инициализация форматирования ввода телефона
* @param {$input} - инпут для телефонов
*/
export const inputMaskRus = (args) => {

   /*
   * Входные данные
   */
  const $input = args.input; // Контейнер для телефона
  const regex = /\+?[()\-\s]{1,2}$/;
  const selector = $input.selector;

  /* отмечаем инициализированные инпуты */
  $input.addClass('js-inputMaskRusInit');

  /**
   * Обработка нажатия кнопки
   */
  $input.on('keyup blur', function(e) {
      const $typeNumber = $(this).attr('data-type');
      const key = e.keyCode;
      let val = $(this).val();
      let buf = '';

      if ($typeNumber === 'number') {
          for (let i = 0; i < val.length; i++) {
              if (/[0-9]/.test(val.charAt(i))) {
                  buf += val.charAt(i);
              }
          }

          if (val !== buf) {
               $(this).val(buf);
          }

          return false;
      }

      if (val == '') {
          return false;
      } else if (key === 8 || key === 229) {
          val = val.replace(regex, '');
          $(this).val(val);
          return false;
      }

      // форматируем телефон
      buf = format(val, key);

      $(this).val(buf);
  });

  /**
   * Форматирование номера телефона
   */
  function format(value, key) {
      value = value.replace(/[^0-9]/g, '');
      let buf = '';
      let len = value.length > 11 ? 11 : value.length;

      if (value.charAt(0) === '7' || value.charAt(0) === '8') {
          value = value.substring(1, len);
      }

      for (let i = 0; i < len; i++) {
          switch (i) {
              case 3:
                  buf += ') ' + value.charAt(i);
                  break;
              case 6:
              case 8:
                  buf += '-' + value.charAt(i);
                  break;
              default:
                  buf += value.charAt(i);
          }
      }

      buf = '+7 (' + buf;

      return buf;
  }

}

export const testEmail = (email) => {

  let reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,6})$/;

   if (reg.test(email) === false) {
      alert('Введите корректный e-mail');
      return false;
   }
   else {
      return true;
   }
}
