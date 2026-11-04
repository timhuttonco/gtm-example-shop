// GTM Variable: "CJS - Safe Page Referrer"  (type: Custom JavaScript)
//
// Redacts the referrer when the previous page was a sensitive page.
// Set as `page_referrer` in the Google tag.
function () {
  var ref = {{Referrer}};
  var urls = [];
  try { urls = JSON.parse(sessionStorage.getItem('gtm_sensitive_urls') || '[]'); } catch (e) {}
  if (ref && urls.indexOf(ref) > -1) return ref.replace(/([?&]id=)[^&#]*/, '$1redacted');
  return ref;
}
