// GTM Variable: "CJS - Price Check Result"  (type: Custom JavaScript)
//
// "ok", "not_checked" or e.g. "corrected: THP004 25>20".
// Sent as the event parameter `price_check` so you can build a GA4 report
// (or alert) showing how often - and for which products - the data layer
// disagreed with the page.
function () {
  var ecom = {{CJS - Ecommerce Validated}};
  return ecom ? ecom._price_check : undefined;
}
