/* =====================================================================
   RedStore product catalogue - the single source of truth for every
   product shown on the site and pushed to the data layer.

   price          : the price the customer pays today (shown on the page)
   originalPrice  : the pre-sale price; only set when the product is on sale
   sensitive      : true for products that must never be shared with
                    analytics vendors (see GTM "sensitive product" filter)

   ---------------------------------------------------------------------
   DELIBERATE BUGS (for the GTM validation article - do not "fix"):
   THP004 has `dataLayerPrice` set to its old price. The page shows the
   sale price ($20.00) but the data layer reports $25.00, as if the
   developer forgot to update the data layer when the sale went live.
   ===================================================================== */
window.RS = window.RS || {};

RS.CURRENCY = 'USD';

RS.PRODUCTS = [
    {
        id: 'THP001', name: 'Red Printed T-Shirt', brand: 'Puma',
        category: 'Clothing', subcategory: 'T-Shirts', variant: 'Red',
        price: 40.00, originalPrice: 50.00, sensitive: false,
        image: 'images/product-0.jpg', rating: 4, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        description: 'A soft cotton tee with a bold red print. Breathable enough for the gym and smart enough for the weekend.'
    },
    {
        id: 'THP002', name: 'Black Shoes', brand: 'HRX',
        category: 'Footwear', subcategory: 'Trainers', variant: 'Black',
        price: 70.00, sensitive: false,
        image: 'images/product-1.jpg', rating: 3.5, sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        description: 'Lightweight everyday trainers with a cushioned sole and a knit upper that moves with your foot.'
    },
    {
        id: 'THP003', name: 'Grey Trousers', brand: 'Benetton',
        category: 'Clothing', subcategory: 'Trousers', variant: 'Grey',
        price: 30.00, sensitive: false,
        image: 'images/product-2.jpg', rating: 4.5, sizes: ['28', '30', '32', '34', '36'],
        description: 'Tapered stretch trousers in a versatile grey that work as well with trainers as they do with shoes.'
    },
    {
        id: 'THP004', name: 'Navy Puma Polo Shirt', brand: 'Puma',
        category: 'Clothing', subcategory: 'Polo Shirts', variant: 'Navy',
        price: 20.00, originalPrice: 25.00, sensitive: false,
        dataLayerPrice: 25.00, // DELIBERATE BUG - see header comment
        image: 'images/product-3.jpg', rating: 4, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        description: 'A classic pique polo with a ribbed collar and embroidered logo. Smart, simple and easy to wear.'
    },
    {
        id: 'THP005', name: 'Grey Hi-Tops', brand: 'HRX',
        category: 'Footwear', subcategory: 'Trainers', variant: 'Grey',
        price: 100.00, sensitive: false,
        image: 'images/product-4.jpg', rating: 4, sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        description: 'Retro-inspired high-top trainers with a padded collar for extra ankle support.'
    },
    {
        id: 'THP006', name: 'Black Puma T-Shirt', brand: 'Puma',
        category: 'Clothing', subcategory: 'T-Shirts', variant: 'Black',
        price: 15.00, sensitive: false,
        image: 'images/product-5.jpg', rating: 3.5, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        description: 'An essential black crew-neck tee in quick-drying fabric.'
    },
    {
        id: 'THP007', name: 'Multi-pack Socks', brand: 'HRX',
        category: 'Accessories', subcategory: 'Socks', variant: 'Multicolour',
        price: 10.00, sensitive: true, // the one sensitive product - see GTM filter
        image: 'images/product-6.jpg', rating: 4.5, sizes: ['One Size'],
        description: 'A pack of three cushioned sports socks with arch support.'
    },
    {
        id: 'THP008', name: 'Black Fossil Watch', brand: 'Fossil',
        category: 'Accessories', subcategory: 'Watches', variant: 'Black',
        price: 96.00, originalPrice: 120.00, sensitive: false,
        image: 'images/product-7.jpg', rating: 4, sizes: ['One Size'],
        description: 'A matte black chronograph with a stainless steel case and silicone strap.'
    },
    {
        id: 'THP009', name: 'Black Roadster Watch', brand: 'Roadster',
        category: 'Accessories', subcategory: 'Watches', variant: 'Black',
        price: 75.00, sensitive: false,
        image: 'images/product-8.jpg', rating: 4, sizes: ['One Size'],
        description: 'A minimalist analogue watch with a leather strap and scratch-resistant glass.'
    },
    {
        id: 'THP010', name: 'Black Running Shoes', brand: 'HRX',
        category: 'Footwear', subcategory: 'Running', variant: 'Black',
        price: 67.50, originalPrice: 90.00, sensitive: false,
        image: 'images/product-9.jpg', rating: 3.5, sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        description: 'Responsive running shoes with a breathable mesh upper and grippy outsole.'
    },
    {
        id: 'THP011', name: 'Grey Pumps', brand: 'HRX',
        category: 'Footwear', subcategory: 'Casual', variant: 'Grey',
        price: 40.00, sensitive: false,
        image: 'images/product-10.jpg', rating: 4.5, sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        description: 'Slip-on canvas pumps with an elasticated tongue for an easy fit.'
    },
    {
        id: 'THP012', name: 'Black Nike Jogging Bottoms', brand: 'Nike',
        category: 'Clothing', subcategory: 'Joggers', variant: 'Black',
        price: 35.00, sensitive: false,
        image: 'images/product-11.jpg', rating: 4, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        description: 'Fleece-lined joggers with zip pockets and tapered cuffs.'
    }
];

RS.LISTS = {
    featured: { id: 'featured_products', name: 'Featured Products', products: ['THP001', 'THP002', 'THP003', 'THP004'] },
    latest:   { id: 'latest_products',   name: 'Latest Products',   products: ['THP005', 'THP006', 'THP007', 'THP008', 'THP009', 'THP010', 'THP011', 'THP012'] },
    all:      { id: 'all_products',      name: 'All Products' },
    related:  { id: 'related_products',  name: 'Related Products' }
};

// Discount codes accepted at checkout. Applied per item so that the
// data layer `price` is always the unit price actually paid.
RS.COUPONS = {
    '10OFF': { rate: 0.10, label: '10% off your order' }
};

RS.TAX_RATE = 0.10;

RS.SHIPPING = {
    standard: { label: 'Standard delivery (3-5 days)', cost: 0 },
    express:  { label: 'Express delivery (next day)', cost: 9.99 }
};

RS.getProduct = function (id) {
    return RS.PRODUCTS.find(function (p) { return p.id === id; }) || null;
};
