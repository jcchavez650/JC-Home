/* ============================================================================
   KITOZ BURGER — Site configuration & menu data
   ----------------------------------------------------------------------------
   👉 EDIT THIS FILE to update your business info, menu items and prices.
      Nothing else needs to change. Prices are plain numbers (no "$").
   ========================================================================== */

window.CONFIG = {
  brand: "Kitoz Burger",
  tagline: "Smashed to perfection.",

  /* ------------------------------------------------------------------------
     ⚠️  REQUIRED: your WhatsApp / SMS order number.
     Use full international format, digits only after the +, e.g. +13055551234
     Orders will NOT send until this is your real number.
     ---------------------------------------------------------------------- */
  phone: "+10000000000",       // TODO: replace with your real WhatsApp number
  orderMethod: "whatsapp",     // "whatsapp" or "sms"

  currency: "$",

  /* ⚠️  TODO: replace with your real opening hours */
  hours: [
    { days: "Monday – Thursday", time: "11:00 AM – 10:00 PM" },
    { days: "Friday – Saturday", time: "11:00 AM – 12:00 AM" },
    { days: "Sunday",            time: "12:00 PM – 9:00 PM" }
  ],

  /* Leave a link empty ("") to hide that social icon */
  social: {
    instagram: "https://instagram.com/kitoz__burger",
    facebook: "",   // TODO: add if you have one
    tiktok: ""      // TODO: add if you have one
  },

  address: ""       // Optional: add your address to show a location line
};

/* ============================================================================
   MENU
   ----------------------------------------------------------------------------
   Each category has a title and a list of items:
     { name, price, desc, tag }   tag is optional ("Signature", "Spicy", etc.)
   Items with price: null are "market / ask" items (no cart price).
   ⚠️  Prices marked TODO were hidden behind the Instagram UI in your photo —
       please confirm them.
   ========================================================================== */

window.MENU = [
  {
    id: "specials",
    title: "K-Burger Specials",
    kicker: "The stars of the show",
    note: "All burgers served with fries and jalapeño on the side.",
    accent: "hot",
    items: [
      { name: "Mama Luchona", price: 20, tag: "Signature",
        desc: "2 smash patties, 2 cheese slices, 2 ham slices, hot links, pineapple, grilled onions & house sauce. Veggies on the side." },
      { name: "La 4x4", price: 25, tag: "Monster",
        desc: "4 patties, bacon, fries inside, cheese, grilled onions & pineapple. Veggies on the side." },
      { name: "Happy Costa Burger", price: 20, tag: "Fan Favorite",
        desc: "Shrimp, lettuce, red onions, avocado, tomato, pineapple, mozzarella & our mango habanero sauce." },
      { name: "Double Cheese", price: 15, /* TODO: confirm price */
        desc: "2 patties, 2 cheese slices, grilled onions & house sauce. Veggies on the side." },
      { name: "Bacon Special", price: 16, /* TODO: confirm price */
        desc: "2 patties, 2 cheese slices, bacon, grilled onions & house sauce. Veggies on the side." },
      { name: "Surf & Turf", price: 23, /* TODO: confirm price */ tag: "Spicy",
        desc: "Shrimp, 1 smash patty, lettuce, tomato, red onions, avocado, pineapple, mozzarella & mango habanero sauce." }
    ]
  },
  {
    id: "appetizers",
    title: "Appetizers",
    kicker: "Start it right",
    items: [
      { name: "Elote Ribs", price: 10,
        desc: "Deep-fried sweet corn topped with sour cream, queso fresco, tajín & cilantro." },
      { name: "Mozzarella Bars (4)", price: 12,
        desc: "Golden fried mozzarella, served with marinara sauce." },
      { name: "Guacamole & Chips", price: 10,
        desc: "Simple and delicious." },
      { name: "Nachos", price: 15,
        desc: "Corn chips, cheese, fresh pico, sour cream, guac & jalapeño with your choice of meat — Chicken or Carne Asada. Shrimp +$2." },
      { name: "Ta-Kitoz (Flautas) (4)", price: 10,
        desc: "Served with lettuce, pico, sour cream, guac & queso fresco." }
    ]
  },
  {
    id: "sandwiches",
    title: "Sandwiches",
    kicker: "Piled high",
    note: "Comes with your choice of fries, salad or potato chips. Bread: sourdough, white or wheat.",
    items: [
      { name: "BLT", price: 17,
        desc: "Sourdough, bacon, lettuce, tomato & mayo." },
      { name: "Chicken Sandwich", price: 18,
        desc: "Fried chicken, fried mozzarella bar, bacon, lettuce, tomato, onions & mayo." },
      { name: "Club Sandwich", price: 18,
        desc: "Grilled chicken, bacon, lettuce, tomato & mayo." },
      { name: "Ribeye Sandwich", price: 18, tag: "Premium",
        desc: "Sliced juicy ribeye, caramelized onions, sautéed mushrooms & melted provolone." }
    ]
  },
  {
    id: "wings",
    title: "Wings",
    kicker: "Sauced up",
    note: "6 wings, served with carrots & celery. Flavors: A la Diabla · Mango Habanero · Buffalo · Sweet Chili · BBQ.",
    items: [
      { name: "Wings (6)", price: 12,
        desc: "Pick a flavor in your order notes: A la Diabla, Mango Habanero, Buffalo, Sweet Chili or BBQ." }
    ]
  },
  {
    id: "salads",
    title: "Salads",
    kicker: "Fresh & green",
    items: [
      { name: "Caesar Salad", price: 10,
        desc: "Crisp romaine, parmesan & house Caesar dressing." },
      { name: "Mixed Greens", price: 5,
        desc: "Fresh mixed greens. Add protein below." },
      { name: "Add Chicken", price: 5, /* TODO: confirm price */
        desc: "Grilled chicken protein add-on." },
      { name: "Add Shrimp", price: 8,
        desc: "Shrimp protein add-on." }
    ]
  },
  {
    id: "kids",
    title: "Kids Menu",
    kicker: "For the little ones",
    note: "Served with your choice of fries or fruit.",
    items: [
      { name: "Quesadilla", price: 8, desc: "Melted cheese in a warm tortilla." },
      { name: "Chicken Tenders", price: 10, desc: "Crispy tenders." },
      { name: 'La Bendi "Cheese Burger"', price: 10, desc: "Kid-sized smash cheeseburger." },
      { name: "Hot Dog", price: 10, desc: "Classic hot dog." }
    ]
  },
  {
    id: "desserts",
    title: "Desserts",
    kicker: "Sweet finish",
    items: [
      { name: "Cheesecake", price: 8, desc: "Rich & creamy." },
      { name: "Tres Leches Cake", price: 8, desc: "Soft sponge soaked in three milks." }
      /* TODO: two more dessert items were hidden in your photo — add them here. */
    ]
  },
  {
    id: "drinks",
    title: "Drinks",
    kicker: "Wash it down",
    note: "Aguas Frescas & Shirley Temple flavors: Strawberry · Lime · Blue Raspberry · Orange.",
    items: [
      { name: "Fountain Drink", price: 3, /* TODO: confirm price */ desc: "Refillable fountain soda." },
      { name: "Agua Fresca", price: 4, /* TODO: confirm price */ desc: "House-made. Choose your flavor in notes." },
      { name: "Shirley Temple", price: 4, /* TODO: confirm price */ desc: "Choose your flavor in notes." }
    ]
  }
];
