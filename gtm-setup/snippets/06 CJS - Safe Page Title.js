// GTM Variable: "CJS - Safe Page Title"  (type: Custom JavaScript)
//
// The product page <title> is the product name. On sensitive pages send a
// generic title instead. Set as `page_title` in the Google tag.
function () {
  if ({{DLV - page.sensitive_content}} === true) return 'Product Details (redacted) | RedStore';
  return document.title;
}
