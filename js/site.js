/* =====================================================================
   RedStore shared site code: formatting, cart, user session,
   GA4 data layer helpers and the shared header / footer.
   Load order on every page:  catalogue.js -> site.js -> page script.
   ===================================================================== */
window.RS = window.RS || {};
window.dataLayer = window.dataLayer || [];

(function () {
    'use strict';

    /* ---------------------------------------------------------------
       Utilities
       --------------------------------------------------------------- */
    RS.round = function (n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; };

    RS.money = function (n) { return '$' + RS.round(n).toFixed(2); };

    RS.escape = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };

    RS.param = function (name) { return new URLSearchParams(window.location.search).get(name); };

    function store(area, key, value) {
        try {
            if (value === undefined) return JSON.parse(area.getItem(key));
            if (value === null) area.removeItem(key);
            else area.setItem(key, JSON.stringify(value));
        } catch (e) { return null; }
    }
    RS.local = function (key, value) { return store(window.localStorage, key, value); };
    RS.session = function (key, value) { return store(window.sessionStorage, key, value); };

    // ?debug=1 logs every data layer push to the console, ?debug=0 turns it off
    if (RS.param('debug') !== null) RS.local('rs_debug', RS.param('debug') === '1' ? true : null);
    RS.debug = !!RS.local('rs_debug');

    /* ---------------------------------------------------------------
       User session (no real authentication - this is a test shop)
       --------------------------------------------------------------- */
    RS.user = {
        get: function () { return RS.local('rs_user'); },

        // user_id is a random customer number, never the username or email,
        // so it is safe to send to GA4 as the User-ID.
        signIn: function (username, isNew) {
            var existing = RS.local('rs_user');
            var user = {
                user_id: existing && existing.user_id ? existing.user_id : 'C' + Math.floor(1000000 + Math.random() * 9000000),
                username: username || (existing && existing.username) || 'Test User',
                is_new: !!isNew
            };
            RS.local('rs_user', user);
            return user;
        },

        signOut: function () { RS.local('rs_user', null); },

        orderCount: function () { return RS.local('rs_order_count') || 0; }
    };

    /* ---------------------------------------------------------------
       Cart - stored as product ids, sizes and quantities only. Prices are
       always looked up from the catalogue so they can never go stale.
       --------------------------------------------------------------- */
    RS.MAX_QTY = 10;

    RS.cart = {
        get: function () {
            var c = RS.local('rs_cart');
            return c && Array.isArray(c.lines) ? c : { lines: [], coupon: null };
        },
        save: function (cart) { RS.local('rs_cart', cart); RS.updateCartBadge(); },
        clear: function () { RS.local('rs_cart', null); RS.updateCartBadge(); },

        count: function () {
            return RS.cart.get().lines.reduce(function (n, l) { return n + l.quantity; }, 0);
        },

        // Returns the quantity actually added (may be capped by MAX_QTY)
        add: function (id, size, quantity) {
            var cart = RS.cart.get();
            var line = cart.lines.find(function (l) { return l.id === id && l.size === size; });
            if (!line) { line = { id: id, size: size, quantity: 0 }; cart.lines.push(line); }
            var added = Math.max(0, Math.min(quantity, RS.MAX_QTY - line.quantity));
            line.quantity += added;
            if (!line.quantity) cart.lines.splice(cart.lines.indexOf(line), 1);
            RS.cart.save(cart);
            return added;
        },

        setQuantity: function (index, quantity) {
            var cart = RS.cart.get();
            var line = cart.lines[index];
            if (!line) return null;
            var before = line.quantity;
            line.quantity = Math.max(0, Math.min(RS.MAX_QTY, quantity));
            var delta = line.quantity - before;
            var snapshot = { id: line.id, size: line.size };
            if (!line.quantity) cart.lines.splice(index, 1);
            RS.cart.save(cart);
            return { line: snapshot, delta: delta };
        },

        setCoupon: function (code) {
            var cart = RS.cart.get();
            cart.coupon = code;
            RS.cart.save(cart);
        },

        // Builds the priced view of a set of lines - used by cart, checkout
        // and the order confirmation page so they always agree.
        summarise: function (lines, couponCode, shippingKey) {
            var coupon = couponCode && RS.COUPONS[couponCode] ? couponCode : null;
            var rate = coupon ? RS.COUPONS[coupon].rate : 0;
            var priced = lines.map(function (l) {
                var p = RS.getProduct(l.id);
                if (!p) return null;
                var unit = RS.round(p.price * (1 - rate));
                return {
                    product: p, size: l.size, quantity: l.quantity,
                    listUnitPrice: p.price, unitPrice: unit, lineTotal: RS.round(unit * l.quantity)
                };
            }).filter(Boolean);

            var subtotal = RS.round(priced.reduce(function (s, l) { return s + l.listUnitPrice * l.quantity; }, 0));
            var itemsTotal = RS.round(priced.reduce(function (s, l) { return s + l.lineTotal; }, 0));
            var shipping = shippingKey && RS.SHIPPING[shippingKey] ? RS.SHIPPING[shippingKey].cost : 0;
            var tax = RS.round(itemsTotal * RS.TAX_RATE);
            return {
                lines: priced, coupon: coupon, subtotal: subtotal,
                discount: RS.round(subtotal - itemsTotal), itemsTotal: itemsTotal,
                tax: tax, shipping: shipping, total: RS.round(itemsTotal + tax + shipping)
            };
        }
    };

    /* ---------------------------------------------------------------
       Data layer helpers (GA4 recommended ecommerce schema)
       --------------------------------------------------------------- */
    RS.dl = {
        push: function (obj) {
            if (RS.debug) console.log('%cdataLayer.push', 'color:#fff;background:#ff523b;padding:2px 6px;border-radius:3px', obj);
            window.dataLayer.push(obj);
        },

        // Push, then run `next` once GTM has processed the event (or after a
        // timeout if GTM is blocked). Used before navigating away.
        pushThen: function (obj, next) {
            var done = false;
            function go() { if (!done) { done = true; next(); } }
            obj.eventCallback = go;
            obj.eventTimeout = 1500;
            RS.dl.push(obj);
            setTimeout(go, 1800);
        },

        /* One GA4 item. `opts` may contain quantity, index, list, size and coupon.
           Custom item parameters (register in GA4 as item-scoped dimensions):
             original_price, on_sale, item_size
           sensitive_product is for GTM only and must NOT be sent to GA4. */
        item: function (p, opts) {
            opts = opts || {};
            var rate = opts.coupon && RS.COUPONS[opts.coupon] ? RS.COUPONS[opts.coupon].rate : 0;
            // DELIBERATE BUG (see catalogue.js): stale price leaks into the data layer
            var base = p.dataLayerPrice !== undefined ? p.dataLayerPrice : p.price;
            var price = RS.round(base * (1 - rate));
            var original = p.originalPrice || p.price;

            var item = {
                item_id: p.id,
                item_name: p.name,
                item_brand: p.brand,
                item_category: p.category,
                item_category2: p.subcategory,
                item_variant: p.variant,
                price: price,
                discount: RS.round(original - price),
                quantity: opts.quantity || 1,
                original_price: original,
                on_sale: !!p.originalPrice,
                sensitive_product: !!p.sensitive
            };
            if (opts.size) item.item_size = opts.size;
            if (opts.index !== undefined) item.index = opts.index;
            if (opts.list) { item.item_list_id = opts.list.id; item.item_list_name = opts.list.name; }
            if (rate) item.coupon = opts.coupon;
            return item;
        },

        value: function (items) {
            return RS.round(items.reduce(function (s, i) { return s + i.price * i.quantity; }, 0));
        },

        // Clears the previous ecommerce object then pushes a GA4 ecommerce event
        ecommerce: function (event, items, extra, next) {
            var ecommerce = { currency: RS.CURRENCY, value: RS.dl.value(items) };
            Object.keys(extra || {}).forEach(function (k) { ecommerce[k] = extra[k]; });
            ecommerce.items = items;
            RS.dl.push({ ecommerce: null });
            var obj = { event: event, ecommerce: ecommerce };
            if (next) RS.dl.pushThen(obj, next); else RS.dl.push(obj);
        },

        listItems: function (products, list) {
            return products.map(function (p, i) { return RS.dl.item(p, { index: i, list: list }); });
        },

        // Page-level data: pushed in <head> BEFORE the GTM snippet
        pageData: function (page) {
            var user = RS.user.get();
            RS.dl.push({
                page: page,
                user: {
                    login_status: user ? 'logged_in' : 'logged_out',
                    user_id: user ? user.user_id : undefined,
                    customer_type: RS.user.orderCount() > 0 ? 'returning' : 'new'
                }
            });
        },

        error: function (type, message) {
            RS.dl.push({ event: 'site_error', error_type: type, error_message: message });
        }
    };

    /* ---------------------------------------------------------------
       Shared rendering
       --------------------------------------------------------------- */
    RS.stars = function (rating) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            html += rating >= i ? '<i class="fas fa-star"></i>'
                : rating >= i - 0.5 ? '<i class="fas fa-star-half-alt"></i>'
                : '<i class="far fa-star"></i>';
        }
        return '<div class="rating" aria-label="Rated ' + rating + ' out of 5">' + html + '</div>';
    };

    // Every rendered price uses .js-unit-price so GTM can read it back
    RS.priceHtml = function (p) {
        return '<span class="price-current js-unit-price' + (p.originalPrice ? ' on-sale' : '') + '">' + RS.money(p.price) + '</span>' +
            (p.originalPrice ? ' <s class="price-original">' + RS.money(p.originalPrice) + '</s>' : '');
    };

    RS.productCard = function (p, index) {
        var url = 'product-details.html?id=' + p.id;
        return '<div class="col-4 product-card" data-item-id="' + p.id + '" data-index="' + index + '">' +
            '<a href="' + url + '" class="js-select-item">' +
                '<div class="product-img">' +
                    '<img src="' + p.image + '" alt="' + RS.escape(p.name) + '" loading="lazy">' +
                    (p.originalPrice ? '<span class="badge-sale">-' + Math.round((1 - p.price / p.originalPrice) * 100) + '%</span>' : '') +
                '</div>' +
                '<h4>' + RS.escape(p.name) + '</h4>' +
            '</a>' +
            RS.stars(p.rating) +
            '<p class="price">' + RS.priceHtml(p) + '</p>' +
        '</div>';
    };

    /* Renders a product grid and wires up GA4 list tracking:
       view_item_list on render, select_item on click. */
    RS.renderProductList = function (container, products, list) {
        container.innerHTML = products.map(RS.productCard).join('');
        container.dataset.listId = list.id;
        if (products.length) RS.dl.ecommerce('view_item_list', RS.dl.listItems(products, list), { item_list_id: list.id, item_list_name: list.name });

        container.onclick = function (e) {
            var link = e.target.closest('.js-select-item');
            if (!link) return;
            var card = link.closest('[data-item-id]');
            var item = RS.dl.item(RS.getProduct(card.dataset.itemId), { index: Number(card.dataset.index), list: list });
            var extra = { item_list_id: list.id, item_list_name: list.name };
            // Let new-tab clicks through untouched; otherwise wait for GTM
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return RS.dl.ecommerce('select_item', [item], extra);
            e.preventDefault();
            RS.dl.ecommerce('select_item', [item], extra, function () { window.location.href = link.href; });
        };
    };

    RS.updateCartBadge = function () {
        var badge = document.getElementById('cartCount');
        if (!badge) return;
        var n = RS.cart.count();
        badge.textContent = n;
        badge.hidden = n === 0;
    };

    RS.toast = function (html) {
        var t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
        t.innerHTML = html;
        t.classList.add('show');
        clearTimeout(RS._toastTimer);
        RS._toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
    };

    function renderHeader() {
        var el = document.getElementById('site-nav');
        if (!el) return;
        var user = RS.user.get();
        el.innerHTML =
            '<div class="navbar">' +
                '<div class="logo"><a href="index.html"><img src="images/logo.png" width="125" alt="RedStore"></a></div>' +
                '<nav aria-label="Main">' +
                    '<ul id="MenuItems">' +
                        '<li><a href="index.html">Home</a></li>' +
                        '<li><a href="products.html">Products</a></li>' +
                        '<li><a href="products.html?filter=sale">Sale</a></li>' +
                        (user
                            ? '<li><a href="account.html">Hi, ' + RS.escape(user.username) + '</a></li><li><a href="#" id="logoutLink">Logout</a></li>'
                            : '<li><a href="account.html">Account</a></li>') +
                    '</ul>' +
                '</nav>' +
                '<a href="cart.html" class="cart-link" aria-label="Cart"><img src="images/cart.png" width="30" height="30" alt=""><span id="cartCount" class="cart-count" hidden>0</span></a>' +
                '<button class="menu-icon" id="menuToggle" aria-label="Menu"><img src="images/menu.png" alt=""></button>' +
            '</div>';

        var menu = document.getElementById('MenuItems');
        document.getElementById('menuToggle').addEventListener('click', function () { menu.classList.toggle('open'); });

        var logout = document.getElementById('logoutLink');
        if (logout) logout.addEventListener('click', function (e) {
            e.preventDefault();
            RS.user.signOut();
            RS.dl.pushThen({ event: 'logout' }, function () { window.location.href = 'index.html'; });
        });
        RS.updateCartBadge();
    }

    function renderFooter() {
        var el = document.getElementById('site-footer');
        if (!el) return;
        el.innerHTML =
            '<div class="footer">' +
                '<div class="container">' +
                    '<div class="row">' +
                        '<div class="footer-col-1"><h3>Download Our App</h3><p>Download App for Android and iOS</p>' +
                            '<div class="app-logo"><img src="images/play-store.png" alt="Google Play"><img src="images/app-store.png" alt="App Store"></div></div>' +
                        '<div class="footer-col-2"><img src="images/logo-white.png" alt="RedStore">' +
                            '<p>Our Purpose Is To Sustainably Make the Pleasure and Benefits of Sports Accessible to everyone.</p></div>' +
                        '<div class="footer-col-3"><h3>Useful Links</h3><ul><li>Coupons</li><li>Blog</li><li>Return Policy</li><li><a href="#" id="resetData">Reset test data</a></li></ul></div>' +
                        '<div class="footer-col-4"><h3>Follow Us</h3><ul><li>Facebook</li><li>Twitter</li><li>Instagram</li><li>YouTube</li></ul></div>' +
                    '</div>' +
                    '<hr>' +
                    '<p class="copyright">&copy; ' + new Date().getFullYear() + ' RedStore - a demo shop for analytics testing</p>' +
                '</div>' +
            '</div>' +
            (RS.local('rs_notice_ok') ? '' :
            '<div class="stickyfooter" id="stickyfooter"><p>This website is not an actual shop and is simply used for testing. ' +
                'No payment is ever taken. <button id="noticeOk">Understood!</button></p></div>');

        var ok = document.getElementById('noticeOk');
        if (ok) ok.addEventListener('click', function () {
            RS.local('rs_notice_ok', true);
            document.getElementById('stickyfooter').remove();
        });

        document.getElementById('resetData').addEventListener('click', function (e) {
            e.preventDefault();
            ['rs_cart', 'rs_user', 'rs_order_count'].forEach(function (k) { RS.local(k, null); });
            RS.session('rs_last_order', null);
            window.location.href = 'index.html';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderHeader();
        renderFooter();
    });
})();
