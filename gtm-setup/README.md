# RedStore - GA4 data layer & GTM setup guide

Throughout this guide, `GTM-XXXXXXX` is your Google Tag Manager container ID and `G-XXXXXXXXXX` is your GA4 measurement ID. Replace them with your own; the container ID also goes in the GTM snippet in each page's `<head>` and `<body>`.

> This `gtm-setup/` folder is documentation only. You don't need to upload it to the web server.

---

## 1. What changed on the website

| Before | After |
|---|---|
| Product list copy-pasted into every page | One catalogue: `js/catalogue.js` |
| Universal Analytics `impressions` / `detail` / `add` / `checkout` / `purchase.actionField` | GA4 recommended ecommerce events and `items[]` schema |
| Cart stored as comma strings; separate hand-written code for 1, 2, 3, 4 and 5 items | Cart stored as JSON (`localStorage.rs_cart`). Prices always come from the catalogue. |
| 12 near-identical `product-details-N.html` files | One `product-details.html?id=THP001`. The old files now redirect. |
| `document.write` everywhere | Pages render from `js/site.js` |
| Cart page fired a UA `checkout` event; `checkout.html` *was* the thank-you page | Cart → real checkout (delivery → payment, discount code) → `order-confirmation.html` |
| No sale prices; tax added to cart total | Sale prices with strike-through and % badges, a **Sale** filter, discount code **10OFF**, delivery options |
| Username sent as the user ID (personal data) | Random customer number (`C1234567`) sent as the GA4 User-ID |
| `purchase` re-fired on every refresh | `purchase` fires once per order |
| Products page sort did nothing; fake pagination | Working category filter and sort |
| No way to reset | Footer **Reset test data** link; `?debug=1` logs every push to the console |

The site still has **no validation** on purpose. Any (or no) login details work, and checkout fields can be left blank. No payment details are ever asked for.

### Test fixtures built into the catalogue

| Product | Purpose |
|---|---|
| **THP001** Red Printed T-Shirt: $40 (was $50) | On sale, data layer correct |
| **THP004** Navy Puma Polo Shirt: page shows **$20** (was $25) | **Deliberate bug:** the data layer still says **25** |
| **THP008** Black Fossil Watch: $96 (was $120) | On sale, data layer correct |
| **THP010** Black Running Shoes: $67.50 (was $90) | On sale, data layer correct |
| **THP007** Multi-pack Socks: $10 | **`sensitive_product: true`**. Every other product is `false`. |

Discount code: **10OFF** gives 10% off every item. It isn't case-sensitive, and any other code is rejected.

---

## 2. Data layer reference

### 2.1 Page data (every page, pushed *before* the GTM snippet)

```js
dataLayer.push({
  page: {
    type: 'product',              // home | category | product | cart | checkout | purchase | account
    name: 'Product Details',
    sensitive_content: false      // product pages only - true on THP007
  },
  user: {
    login_status: 'logged_in',    // logged_in | logged_out
    user_id: 'C4992116',          // undefined when logged out
    customer_type: 'returning'    // new | returning (has placed an order before)
  }
});
```

### 2.2 Item schema (every `items[]` entry)

```js
{
  item_id: 'THP004',
  item_name: 'Navy Puma Polo Shirt',
  item_brand: 'Puma',
  item_category: 'Clothing',
  item_category2: 'Polo Shirts',
  item_variant: 'Navy',
  price: 20,                 // unit price actually paid (after sale AND coupon)
  discount: 5,               // original_price - price
  quantity: 1,
  original_price: 25,        // custom: pre-sale price
  on_sale: true,             // custom
  item_size: 'M',            // custom: once a size is chosen (cart onwards)
  sensitive_product: false,  // GTM ONLY - stripped before sending to GA4
  index: 0,                  // in lists
  item_list_id: 'featured_products',
  item_list_name: 'Featured Products',
  coupon: '10OFF'            // when a code is applied
}
```

`ecommerce.value` is always the sum of `price × quantity`, so it excludes tax and delivery. On `purchase`, tax and delivery go in `tax` and `shipping`. GA4 "Purchase revenue" is therefore revenue excluding tax and shipping.

### 2.3 Events

Every ecommerce event is preceded by `dataLayer.push({ ecommerce: null })`.

| Event | Where / when | Extra parameters |
|---|---|---|
| `view_item_list` | Home (Featured + Latest), Products (on load, filter or sort), PDP (Related) | `item_list_id`, `item_list_name` |
| `select_item` | Click on any product card | `item_list_id`, `item_list_name` |
| `view_promotion` / `select_promotion` | Home sale banner (items = all sale products) | `promotion_id`, `promotion_name`, `creative_name`, `creative_slot` |
| `view_item` | Product page | |
| `add_to_cart` | PDP add, cart **+** | |
| `remove_from_cart` | Cart **−** / Remove | |
| `view_cart` | Cart page | `coupon` |
| `begin_checkout` | Checkout page load | `coupon` |
| `add_shipping_info` | "Continue to payment" | `shipping_tier` (`standard` / `express`), `coupon` |
| `add_payment_info` | "Place order" | `payment_type`, `coupon` |
| `purchase` | Order confirmation (once per order) | `transaction_id`, `tax`, `shipping`, `coupon`, `customer_type` |
| `apply_coupon` | Discount code submitted | `coupon`, `coupon_status` (`valid` / `invalid`) |
| `remove_coupon` | Discount removed | `coupon` |
| `login` / `sign_up` | Account forms | `method: 'email'`, updated `user` object |
| `logout` | Logout link/button | |
| `site_error` | e.g. more than 10 of one item | `error_type`, `error_message` |

---

## 3. GA4 setup (Admin)

1. **Data streams → Web → your stream → Enhanced measurement.** Keep page views, scrolls and outbound clicks. Turn **off Form interactions**: it adds `form_start` / `form_submit` noise on checkout and login, which you already track properly.
2. **Data settings → Data retention:** set to **14 months**.
3. **Custom definitions → Create custom dimension:**

   | Dimension name | Scope | Parameter |
   |---|---|---|
   | Page type | Event | `page_type` |
   | Login status | Event | `login_status` |
   | Price check | Event | `price_check` |
   | Coupon status | Event | `coupon_status` |
   | Login method | Event | `method` |
   | Error type | Event | `error_type` |
   | Error message | Event | `error_message` |
   | Item on sale | Item | `on_sale` |
   | Item original price | Item | `original_price` |
   | Item size | Item | `item_size` |

   `coupon`, `discount`, `shipping_tier`, `payment_type`, `customer_type`, promotions and lists are built-in GA4 dimensions. Don't register those.
   **Never** register `sensitive_product`. It never reaches GA4.
4. **Key events:** `purchase` is a key event by default. Also mark `sign_up` (and `begin_checkout` if you want a funnel KPI).
5. **Reporting identity:** Blended, so the User-ID is used.
6. While testing, use **Admin → DebugView**. GTM Preview sends `debug_mode` automatically.

---

## 4. GTM setup

### 4.0 Before you start
Linking the container to GA4 may have already created a Google tag for your measurement ID. If so, **edit that tag** to match tag 1 in section 4.5. Don't add a second one, or every page view will be counted twice.

### 4.1 Built-in variables
**Variables → Configure:** make sure **Page URL**, **Referrer** and **Event** are enabled.

### 4.2 Data Layer Variables (Version 2)

| Variable name | Data Layer Variable Name |
|---|---|
| `DLV - ecommerce` | `ecommerce` |
| `DLV - page.type` | `page.type` |
| `DLV - page.sensitive_content` | `page.sensitive_content` |
| `DLV - user.user_id` | `user.user_id` |
| `DLV - user.login_status` | `user.login_status` |
| `DLV - method` | `method` |
| `DLV - coupon` | `coupon` |
| `DLV - coupon_status` | `coupon_status` |
| `DLV - error_type` | `error_type` |
| `DLV - error_message` | `error_message` |

### 4.3 Custom JavaScript variables
Create each one exactly as named. Paste the code from [`snippets/`](snippets/) without the leading comment block (keeping it is fine too).

| Variable | File | What it does |
|---|---|---|
| `CJS - Ecommerce Validated` | `01 …js` | Compares each item's data layer `price` with `[data-item-id="…"] .js-unit-price` on the page. If they differ, it corrects `price`, `discount` and `value`. |
| `CJS - Ecommerce Clean` | `02 …js` | Removes `sensitive_product` items and reduces `value` (and `tax` in proportion). Strips internal keys. **This is what GA4 receives.** |
| `CJS - Ecommerce Has Items` | `03 …js` | `true` when anything is left to send |
| `CJS - Price Check Result` | `04 …js` | `ok` / `not_checked` / `corrected: THP004 25>20` |
| `CJS - Safe Page Location` | `05 …js` | Replaces `?id=THP007` with `?id=redacted` on sensitive pages |
| `CJS - Safe Page Title` | `06 …js` | Generic title on sensitive pages |
| `CJS - Safe Page Referrer` | `08 …js` | Redacts the referrer when the previous page was sensitive |

The order of operations matters: **validate first, then filter**. If you filtered first, the value you subtract for a removed item could itself be wrong.

### 4.4 Triggers

| Trigger | Type | Settings |
|---|---|---|
| `CE - GA4 Ecommerce` | Custom Event | Event name (regex ✔): `^(view_item_list\|select_item\|view_item\|add_to_cart\|remove_from_cart\|view_cart\|begin_checkout\|add_shipping_info\|add_payment_info\|purchase\|view_promotion\|select_promotion)$`. Fires on **Some Custom Events**: `CJS - Ecommerce Has Items` **equals** `true` |
| `CE - GA4 Site Events` | Custom Event | Event name (regex ✔): `^(login\|sign_up\|logout\|apply_coupon\|remove_coupon\|site_error)$` |
| `Init - Sensitive Page` | Initialization | Some Initialization Events: `DLV - page.sensitive_content` **equals** `true` |

The `CE - GA4 Ecommerce` regex to paste:

```
^(view_item_list|select_item|view_item|add_to_cart|remove_from_cart|view_cart|begin_checkout|add_shipping_info|add_payment_info|purchase|view_promotion|select_promotion)$
```

The `CE - GA4 Site Events` regex to paste:

```
^(login|sign_up|logout|apply_coupon|remove_coupon|site_error)$
```

### 4.5 Tags

**1. `Google Tag - GA4`** (type: Google Tag)
- Tag ID: `G-XXXXXXXXXX` (your measurement ID)
- Configuration settings → Configuration parameters:

  | Parameter | Value |
  |---|---|
  | `page_location` | `{{CJS - Safe Page Location}}` |
  | `page_title` | `{{CJS - Safe Page Title}}` |
  | `page_referrer` | `{{CJS - Safe Page Referrer}}` |
  | `user_id` | `{{DLV - user.user_id}}` |
  | `page_type` | `{{DLV - page.type}}` |
  | `login_status` | `{{DLV - user.login_status}}` |

- Trigger: **Initialization - All Pages**

Because these are set on the Google tag, every GA4 event on the page uses the safe URL, title and referrer, not just `page_view`.

**2. `GA4 Event - Ecommerce`** (type: Google Analytics: GA4 Event)
- Measurement ID: `G-XXXXXXXXXX`
- Event name: `{{Event}}`
- Event parameters: `price_check` = `{{CJS - Price Check Result}}`
- More settings → Ecommerce: ✔ **Send Ecommerce data**. Data source: **Object Variable**, set to `{{CJS - Ecommerce Clean}}`
- Trigger: `CE - GA4 Ecommerce`

**3. `GA4 Event - Site Events`** (type: Google Analytics: GA4 Event)
- Measurement ID: `G-XXXXXXXXXX`
- Event name: `{{Event}}`
- Event parameters: `method` = `{{DLV - method}}`, `coupon` = `{{DLV - coupon}}`, `coupon_status` = `{{DLV - coupon_status}}`, `error_type` = `{{DLV - error_type}}`, `error_message` = `{{DLV - error_message}}`
- Trigger: `CE - GA4 Site Events`

**4. `HTML - Remember Sensitive Pages`** (type: Custom HTML)
- HTML: [`snippets/07 HTML - Remember Sensitive Pages.html`](snippets/07%20HTML%20-%20Remember%20Sensitive%20Pages.html)
- Trigger: `Init - Sensitive Page`

---

## 5. Test plan (GTM Preview + GA4 DebugView)

Click **Reset test data** in the site footer first. Add `?debug=1` to any URL to see each push in the console.

| # | Do this | Expect in GTM Preview / DebugView |
|---|---|---|
| 1 | Open Home | `view_item_list` ×2 and `view_promotion`. `price_check` = `corrected: THP004 25>20` (THP004 is in Featured). GA4 item THP004 has price **20**. |
| 2 | Open **Navy Puma Polo Shirt** (THP004) | Data layer `view_item` price **25**. The GA4 hit has price **20**, discount 5, value 20. |
| 3 | Open **Black Fossil Watch** (THP008) | `price_check` = `ok`, price 96, discount 24 |
| 4 | Open **Multi-pack Socks** (THP007) | `page_view` has `page_location` …`?id=redacted` and a redacted title. **No** `view_item` tag fires (Has Items = false). Related products still send `view_item_list`. |
| 5 | Add socks to cart | `add_to_cart` tag does **not** fire |
| 6 | Click to another page | `page_referrer` …`?id=redacted` |
| 7 | Add the polo ×2, T-shirt ×1 and joggers ×1; open the cart | Data layer `view_cart` value 135 (4 lines). GA4 receives value **115**: 3 items, polo corrected to 20. |
| 8 | Checkout, enter `nope` then `10off` | `apply_coupon` invalid, then valid |
| 9 | Express delivery → Continue → Place order | `add_shipping_info` (`express`), `add_payment_info` (`Credit Card`), then `purchase` |
| 10 | Check `purchase` | Data layer value **121.50**, 4 items. GA4 value **103.50**, 3 items (no THP007), polo price 18, tax 10.35, shipping 9.99, coupon 10OFF. |
| 11 | Refresh the confirmation page | No second `purchase` |
| 12 | Account → Login / Register / Logout | `login` / `sign_up` with `method`, `user_id` on following hits, `logout` |

---

## 6. Notes for the article

**Validating the data layer against the page.**
- The validation relies on a page contract: the container has `data-item-id` and the price element is `.js-unit-price`. Agree one with your developers. Reading visible text is the most honest source of "what the customer saw", but it depends on locale. Swap the `parseFloat` line for `,` decimal separators.
- The push must happen **after** the price is rendered, otherwise there's nothing to compare against (`not_checked`). Here, `view_item` is pushed after the product is on the page.
- Treat the correction as a stopgap and report on it. Build a GA4 Exploration with dimensions **Price check** and **Item ID**, filtered on Price check *begins with* "corrected". That gives your developers a to-do list. You could also fire a separate alert tag on the same condition.
- Custom JavaScript variables must have no side effects, because GTM may evaluate them several times per event. That's why the snippets copy the object and never modify `dataLayer`.

**Filtering sensitive products.**
- The site still pushes everything. The decision about what leaves the browser is made in one place in GTM, so the same data layer could feed a different tool that *is* allowed to see sensitive items.
- The product isn't only in `items`. It also leaks through the **URL**, **page title** and **referrer**, which is why snippets 05–08 exist.
- Dropping an item vs. redacting it: this setup drops it and adjusts the totals. The alternative is to keep a placeholder item (`item_id: 'redacted'`) so revenue totals stay complete without identifying the product. Choose based on your policy.
- If the basket contains *only* sensitive items, the `purchase` is not sent at all. If you'd rather still count the transaction, change the `CE - GA4 Ecommerce` condition for `purchase` and send it with `items: []` and value 0.
- For a stronger guarantee, do the same filtering in a server-side GTM container. That way the browser-side hits can't be inspected or replayed with the original data.

**Consent.** The site has no consent banner. For a real UK/EU site you'd add a CMP with Google Consent Mode v2 before going live.
