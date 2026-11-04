// GTM Variable: "CJS - Ecommerce Clean"  (type: Custom JavaScript)
//
// Takes the price-validated ecommerce object and removes every item flagged
// as sensitive (sensitive_product: true / 1 / "true" / "1"). The event value
// is reduced by the removed items, and tax is reduced in proportion, so the
// totals GA4 receives only describe the products it is allowed to see.
// Internal-only keys (sensitive_product, _price_check) are stripped.
//
// This is the object the GA4 Event tag sends:
//   More Settings > Ecommerce > Send Ecommerce data
//   Data source: Object Variable > {{CJS - Ecommerce Clean}}
function () {
  var source = {{CJS - Ecommerce Validated}};
  if (!source || !source.items) return source;

  var ecom = JSON.parse(JSON.stringify(source));
  delete ecom._price_check;

  var round = function (n) { return Math.round(n * 100) / 100; };
  var isSensitive = function (item) {
    var s = item.sensitive_product;
    return s === true || s === 1 || s === 'true' || s === '1';
  };

  var kept = [];
  var removedValue = 0;
  for (var i = 0; i < ecom.items.length; i++) {
    var item = ecom.items[i];
    if (isSensitive(item)) {
      removedValue += Number(item.price || 0) * (item.quantity || 1);
    } else {
      delete item.sensitive_product;
      kept.push(item);
    }
  }

  if (kept.length !== ecom.items.length) {
    var before = Number(ecom.value) || 0;
    ecom.value = round(Math.max(0, before - removedValue));
    if (ecom.tax && before) ecom.tax = round(ecom.tax * ecom.value / before);
  }
  ecom.items = kept;
  return ecom;
}
