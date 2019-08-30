import $ from "jquery";
let latestScroll = 10;
/**
 *   Фунция определения появился ли объек в области просмотра
 */
export const testScroll = (element) => {
    let stop = 0;
    $(window).on('scroll', function(e) {
        e.preventDefault();
        let el = $(element);
        let viewObj = getElemementOffset(el);
        let viewWin = getViewportOffset();
        let viewPort = window.innerHeight + viewWin.top;

        if (viewPort >= viewObj.top && stop === 0) {
            console.log('Нужный элемент достигнут!');
            stop++;
        } else if (viewPort < viewObj.top && stop === 1) {
            console.log('Нужный элемент скрылся за кадром!');
            stop--;
        }
    });
}
/**
 * Функция для отложенного вызова другой функции
 */
export const throttle = (func, timeout) => {
    let inThrottle = false;

    return function() {
        const args = arguments;
        const context = this;

        if (!inThrottle) {
            inThrottle = true;
            func.apply(context, args);
            setTimeout(() => {
                inThrottle = false;
            }, timeout);
        }
    };
}


const getViewportOffset = () => {
    return {
        top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
    };
}
const getElemementOffset = (el) => {
        return {
            top: el.offset().top,
            left: el.offset().left
        };
    }
/**
 * Срабатывает когда элемент в поле зрения
 */
const isVisible = (tag) => {
        var t = tag;
        var w = $(window);
        var wt = w.scrollTop();
        var tt = t.offset().top;
        var tb = tt + t.height();
        return ((tb <= wt + w.height()) && (tt >= wt));
    }

export const checkScroll = () => {
    const $navPanel = $('.Nav-bg');
    let nowScroll  = getViewportOffset();

    if(latestScroll < nowScroll.top + 5) {
        $navPanel.addClass('Nav-bg--min-h');
        $('.Menu__sub--active').removeClass('Menu__sub--active');
        latestScroll = nowScroll.top;
    }else{
        $navPanel.removeClass('Nav-bg--min-h');
        latestScroll = nowScroll.top;
    }

    if(getViewportOffset().top == 0 ){
        $navPanel.removeClass('Nav-bg--min-h');
        latestScroll = nowScroll.top;
    }
}

const checkScrollEnd = () => {
    if(getViewportOffset().top == 0 ){
        $navPanel.removeClass('Nav-bg--min-h');
        latestScroll = 0
    } else {
        checkScroll();
    }
}