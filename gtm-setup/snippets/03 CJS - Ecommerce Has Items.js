// GTM Variable: "CJS - Ecommerce Has Items"  (type: Custom JavaScript)
//
// true when at least one non-sensitive item is left after filtering.
// Used as a trigger condition so that, for example, viewing ONLY the sensitive
// product (view_item / select_item) sends nothing at all to GA4.
function () {
  var ecom = {{CJS - Ecommerce Clean}};
  return !!(ecom && ecom.items && ecom.items.length);
}
