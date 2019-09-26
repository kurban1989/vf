const thisUtils = (function() {
    'use strict';

    function thisUtils(args) {
        // enforces new
        if (!(this instanceof thisUtils)) {
            return new thisUtils(args);
        }
        // constructor body
    }

    thisUtils.prototype.replacerSpace = function(str) {
        const regex = /\s+/gm;
        const regexRN = /(>\s<)/gm;
        str = str.replace(regex, ' ');
        str = str.replace(regexRN, '><');
        return str;
    };

    thisUtils.prototype.templateCart = function(args) {
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
                                <input type="number" class="quantity-selector__quantity js-quantity" value="${args.quantity}" disabled>
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

    thisUtils.prototype.renderCart = async function(req, db) {
        // Ссылка самого на себя, ебучий контекст THIS
        const obj = this;

        return new Promise(function(resolve, reject){
            let template = '<div class="js-insertInCartProd">';
            let templateArr = {};
            let user_token = req.cookies.add2cart_for_users || '';

            db.getQueryManySafe('cart', {user_token: user_token, success: 0})
                .then(function(r){
                    return templateArr = r;
                }).then(function(templateArr){

                    let generateCart = templateArr.map(function(item) {
                        return db.getQuerySafe('products', 'id', item.id_prod, 'equality')
                        .then(function(responce){

                            let img = responce[0].images.length > 3 ? responce[0].images.split(',') : [];

                            template += obj.templateCart({
                                img: img[0],
                                title: responce[0].title,
                                price: responce[0].price,
                                id: responce[0].id,
                                insertID: item.id,
                                quantity: item.quantity,
                                size: item.size,
                            });
                        });
                    });

                    return Promise.all(generateCart);

                }).then(function(generateCart){
                    return resolve(template + '</div>');
                });
        });
    };

    return thisUtils;
}());

module.exports = thisUtils
