// GTM Variable: "CJS - Safe Page Location"  (type: Custom JavaScript)
//
// The sensitive product's page URL contains its product id
// (product-details.html?id=THP007). On sensitive pages, replace the id.
// Set as `page_location` in the Google tag so every GA4 event uses it.
function () {
  var url = {{Page URL}};
  if ({{DLV - page.sensitive_content}} !== true) return url;
  return url.replace(/([?&]id=)[^&#]*/, '$1redacted');
}
