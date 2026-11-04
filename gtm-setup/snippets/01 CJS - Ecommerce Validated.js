// GTM Variable: "CJS - Ecommerce Validated"  (type: Custom JavaScript)
//
// Checks every item's data layer price against the price the customer can
// actually see on the page. If they differ, the on-page price wins: the item
// price, item discount and the event value are corrected before anything is
// sent to GA4. The result of the check is stored in `_price_check` so it can
// be reported (see "CJS - Price Check Result"). This key is removed again by
// "CJS - Ecommerce Clean", so GA4 never receives it.
//
// The page contract (RedStore): every rendered product has a container with
//   data-item-id="THP004"   and inside it an element   .js-unit-price
// whose text is the unit price, for example "$20.00".
function () {
  var source = {{DLV - ecommerce}};
  if (!source || !source.items || !source.items.length) return source;

  // Work on a copy - never modify the object that lives in the data layer
  var ecom = JSON.parse(JSON.stringify(source));
  var round = function (n) { return Math.round(n * 100) / 100; };
  var checked = 0;
  var corrections = [];
  var valueDelta = 0;

  for (var i = 0; i < ecom.items.length; i++) {
    var item = ecom.items[i];
    var el = document.querySelector('[data-item-id="' + item.item_id + '"] .js-unit-price');
    if (!el) continue; // item isn't on this page, nothing to compare against

    var pagePrice = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
    if (isNaN(pagePrice)) continue;
    checked++;

    var dlPrice = Number(item.price);
    if (Math.abs(pagePrice - dlPrice) < 0.005) continue; // matches - all good

    corrections.push(item.item_id + ' ' + dlPrice + '>' + pagePrice);
    valueDelta += (pagePrice - dlPrice) * (item.quantity || 1);
    item.price = pagePrice;
    if (item.original_price) item.discount = round(item.original_price - pagePrice);
  }

  if (valueDelta) ecom.value = round(Number(ecom.value) + valueDelta);

  ecom._price_check = !checked ? 'not_checked'
    : corrections.length ? 'corrected: ' + corrections.join(', ')
    : 'ok';
  return ecom;
}
