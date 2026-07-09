/* ============================================================================
   KITOZ BURGER — Site configuration & menu data
   ----------------------------------------------------------------------------
   👉 EDIT THIS FILE to update your business info, menu items and prices.
      Prices are plain numbers (no "$").
      Bilingual text uses { en: "...", es: "..." }. Plain strings (proper
      names like "Mama Luchona") show the same in both languages.
      Each item's `id` is a stable key — don't change it once orders rely on it.
   ========================================================================== */

window.CONFIG = {
  brand: "Kitoz Burger",
  tagline: "Smashed to perfection.",

  /* ------------------------------------------------------------------------
     ⚠️  REQUIRED: your WhatsApp / SMS order number (international format).
     ---------------------------------------------------------------------- */
  phone: "+14088492949",       // WhatsApp order number
  orderMethod: "whatsapp",     // "whatsapp" or "sms"

  currency: "$",

  hours: [
    { days: { en: "Friday & Saturday", es: "Viernes y Sábado" }, time: "4:00 PM – 10:00 PM" }
  ],

  /* Leave a link empty ("") to hide that social icon */
  social: {
    instagram: "https://instagram.com/kitoz__burger",
    facebook: "",   // add if you have one
    tiktok: ""      // add if you have one
  },

  address: ""       // Optional: add your address to show a location line
};

/* ============================================================================
   BURGER EXTRAS — add-ons offered when customizing any burger.
   ⚠️  TODO: confirm these add-on prices (they're editable estimates).
   ========================================================================== */
window.BURGER_EXTRAS = [
  { name: { en: "Extra patty",    es: "Carne extra" },   price: 3 },
  { name: { en: "Extra cheese",   es: "Queso extra" },   price: 1.5 },
  { name: { en: "Bacon",          es: "Tocino" },        price: 2 },
  { name: { en: "Avocado",        es: "Aguacate" },      price: 2 },
  { name: { en: "Grilled onions", es: "Cebolla asada" }, price: 1 },
  { name: { en: "Jalapeños",      es: "Jalapeños" },     price: 1 }
];

/* ============================================================================
   MENU
   ========================================================================== */
window.MENU = [
  {
    id: "specials",
    title:  { en: "K-Burger Specials", es: "Especiales K-Burger" },
    kicker: { en: "The stars of the show", es: "Las estrellas del menú" },
    note:   { en: "All burgers served with fries and jalapeño on the side.", es: "Todas las hamburguesas se sirven con papas y jalapeño aparte." },
    accent: "hot",
    items: [
      { id: "mama-luchona", name: "Mama Luchona", price: 20, tag: { en: "Signature", es: "De la Casa" },
        customize: { removable: [
          { en: "ham", es: "jamón" }, { en: "hot links", es: "salchicha picante" },
          { en: "pineapple", es: "piña" }, { en: "grilled onions", es: "cebolla asada" },
          { en: "house sauce", es: "salsa de la casa" } ] },
        desc: { en: "2 smash patties, 2 cheese slices, 2 ham slices, hot links, pineapple, grilled onions & house sauce. Veggies on the side.",
                es: "2 carnes smash, 2 rebanadas de queso, 2 de jamón, salchicha picante, piña, cebolla asada y salsa de la casa. Vegetales aparte." } },
      { id: "la-4x4", name: "La 4x4", price: 25, tag: { en: "Monster", es: "Monstruo" },
        customize: { removable: [
          { en: "bacon", es: "tocino" }, { en: "fries inside", es: "papas adentro" },
          { en: "grilled onions", es: "cebolla asada" }, { en: "pineapple", es: "piña" } ] },
        desc: { en: "4 patties, bacon, fries inside, cheese, grilled onions & pineapple. Veggies on the side.",
                es: "4 carnes, tocino, papas adentro, queso, cebolla asada y piña. Vegetales aparte." } },
      { id: "happy-costa", name: "Happy Costa Burger", price: 20, tag: { en: "Fan Favorite", es: "Favorita" },
        customize: { removable: [
          { en: "lettuce", es: "lechuga" }, { en: "red onions", es: "cebolla morada" },
          { en: "avocado", es: "aguacate" }, { en: "tomato", es: "tomate" },
          { en: "pineapple", es: "piña" }, { en: "mango habanero sauce", es: "salsa de mango habanero" } ] },
        desc: { en: "Shrimp, lettuce, red onions, avocado, tomato, pineapple, mozzarella & our mango habanero sauce.",
                es: "Camarón, lechuga, cebolla morada, aguacate, tomate, piña, mozzarella y nuestra salsa de mango habanero." } },
      { id: "double-cheese", name: "Double Cheese", price: 15,
        customize: { removable: [ { en: "grilled onions", es: "cebolla asada" }, { en: "house sauce", es: "salsa de la casa" } ] },
        desc: { en: "2 patties, 2 cheese slices, grilled onions & house sauce. Veggies on the side.",
                es: "2 carnes, 2 rebanadas de queso, cebolla asada y salsa de la casa. Vegetales aparte." } },
      { id: "bacon-special", name: "Bacon Special", price: 16,
        customize: { removable: [ { en: "bacon", es: "tocino" }, { en: "grilled onions", es: "cebolla asada" }, { en: "house sauce", es: "salsa de la casa" } ] },
        desc: { en: "2 patties, 2 cheese slices, bacon, grilled onions & house sauce. Veggies on the side.",
                es: "2 carnes, 2 rebanadas de queso, tocino, cebolla asada y salsa de la casa. Vegetales aparte." } },
      { id: "surf-turf", name: "Surf & Turf", price: 23, tag: { en: "Spicy", es: "Picante" },
        customize: { removable: [
          { en: "lettuce", es: "lechuga" }, { en: "tomato", es: "tomate" },
          { en: "red onions", es: "cebolla morada" }, { en: "avocado", es: "aguacate" },
          { en: "pineapple", es: "piña" }, { en: "mango habanero sauce", es: "salsa de mango habanero" } ] },
        desc: { en: "Shrimp, 1 smash patty, lettuce, tomato, red onions, avocado, pineapple, mozzarella & mango habanero sauce.",
                es: "Camarón, 1 carne smash, lechuga, tomate, cebolla morada, aguacate, piña, mozzarella y salsa de mango habanero." } }
    ]
  },
  {
    id: "appetizers",
    title:  { en: "Appetizers", es: "Entradas" },
    kicker: { en: "Start it right", es: "Para empezar" },
    items: [
      { id: "elote-ribs", name: "Elote Ribs", price: 10,
        desc: { en: "Deep-fried sweet corn topped with sour cream, queso fresco, tajín & cilantro.",
                es: "Elote frito cubierto con crema, queso fresco, tajín y cilantro." } },
      { id: "mozzarella-bars", name: { en: "Mozzarella Bars (4)", es: "Barras de Mozzarella (4)" }, price: 12,
        desc: { en: "Golden fried mozzarella, served with marinara sauce.",
                es: "Barras de mozzarella fritas, servidas con salsa marinara." } },
      { id: "guac-chips", name: { en: "Guacamole & Chips", es: "Guacamole y Totopos" }, price: 10,
        desc: { en: "Simple and delicious.", es: "Simple y delicioso." } },
      { id: "nachos", name: "Nachos", price: 15,
        desc: { en: "Corn chips, cheese, fresh pico, sour cream, guac & jalapeño with your choice of meat — Chicken or Carne Asada. Shrimp +$2.",
                es: "Totopos, queso, pico de gallo, crema, guacamole y jalapeño con tu elección de carne — pollo o carne asada. Camarón +$2." } },
      { id: "ta-kitoz", name: { en: "Ta-Kitoz (Flautas) (4)", es: "Ta-Kitoz (Flautas) (4)" }, price: 10,
        desc: { en: "Served with lettuce, pico, sour cream, guac & queso fresco.",
                es: "Servidas con lechuga, pico de gallo, crema, guacamole y queso fresco." } }
    ]
  },
  {
    id: "sandwiches",
    title:  { en: "Sandwiches", es: "Sándwiches" },
    kicker: { en: "Piled high", es: "Bien servidos" },
    note:   { en: "Comes with your choice of fries, salad or potato chips. Bread: sourdough, white or wheat.",
              es: "Incluye papas, ensalada o papas de bolsa. Pan: masa madre, blanco o integral." },
    items: [
      { id: "blt", name: "BLT", price: 17,
        desc: { en: "Sourdough, bacon, lettuce, tomato & mayo.", es: "Pan de masa madre, tocino, lechuga, tomate y mayonesa." } },
      { id: "chicken-sandwich", name: { en: "Chicken Sandwich", es: "Sándwich de Pollo" }, price: 18,
        desc: { en: "Fried chicken, fried mozzarella bar, bacon, lettuce, tomato, onions & mayo.",
                es: "Pollo frito, barra de mozzarella, tocino, lechuga, tomate, cebolla y mayonesa." } },
      { id: "club-sandwich", name: { en: "Club Sandwich", es: "Club Sándwich" }, price: 18,
        desc: { en: "Grilled chicken, bacon, lettuce, tomato & mayo.", es: "Pollo a la parrilla, tocino, lechuga, tomate y mayonesa." } },
      { id: "ribeye-sandwich", name: { en: "Ribeye Sandwich", es: "Sándwich de Ribeye" }, price: 18, tag: { en: "Premium", es: "Premium" },
        desc: { en: "Sliced juicy ribeye, caramelized onions, sautéed mushrooms & melted provolone.",
                es: "Ribeye jugoso en rebanadas, cebolla caramelizada, champiñones salteados y provolone derretido." } }
    ]
  },
  {
    id: "wings",
    title:  { en: "Wings", es: "Alitas" },
    kicker: { en: "Sauced up", es: "Con salsa" },
    note:   { en: "6 wings, served with carrots & celery. One flavor per order.",
              es: "6 alitas, servidas con zanahoria y apio. Un sabor por orden." },
    items: [
      { id: "wings-6", name: { en: "Wings (6)", es: "Alitas (6)" }, price: 12,
        options: { label: { en: "Flavor", es: "Sabor" }, choices: ["A la Diabla", "Mango Habanero", "Buffalo", "Sweet Chili", "BBQ"] },
        desc: { en: "Pick your flavor when you add: A la Diabla, Mango Habanero, Buffalo, Sweet Chili or BBQ.",
                es: "Elige tu sabor al agregar: A la Diabla, Mango Habanero, Buffalo, Sweet Chili o BBQ." } }
    ]
  },
  {
    id: "salads",
    title:  { en: "Salads", es: "Ensaladas" },
    kicker: { en: "Fresh & green", es: "Frescas y verdes" },
    items: [
      { id: "caesar", name: { en: "Caesar Salad", es: "Ensalada César" }, price: 10,
        desc: { en: "Crisp romaine, parmesan & house Caesar dressing.", es: "Lechuga romana, parmesano y aderezo César de la casa." } },
      { id: "mixed-greens", name: { en: "Mixed Greens", es: "Ensalada Verde" }, price: 5,
        desc: { en: "Fresh mixed greens. Add protein below.", es: "Mezcla de verdes frescos. Agrega proteína abajo." } },
      { id: "add-chicken", name: { en: "Add Chicken", es: "Agregar Pollo" }, price: 5,
        desc: { en: "Grilled chicken protein add-on.", es: "Proteína extra de pollo a la parrilla." } },
      { id: "add-shrimp", name: { en: "Add Shrimp", es: "Agregar Camarón" }, price: 8,
        desc: { en: "Shrimp protein add-on.", es: "Proteína extra de camarón." } }
    ]
  },
  {
    id: "kids",
    title:  { en: "Kids Menu", es: "Menú Infantil" },
    kicker: { en: "For the little ones", es: "Para los pequeños" },
    note:   { en: "Served with your choice of fries or fruit.", es: "Servido con papas o fruta." },
    items: [
      { id: "quesadilla", name: "Quesadilla", price: 8,
        desc: { en: "Melted cheese in a warm tortilla.", es: "Queso derretido en tortilla caliente." } },
      { id: "tenders", name: { en: "Chicken Tenders", es: "Dedos de Pollo" }, price: 10,
        desc: { en: "Crispy tenders.", es: "Crujientes dedos de pollo." } },
      { id: "kids-cheeseburger", name: 'La Bendi "Cheese Burger"', price: 10,
        desc: { en: "Kid-sized smash cheeseburger.", es: "Hamburguesa smash con queso, tamaño infantil." } },
      { id: "hot-dog", name: "Hot Dog", price: 10,
        desc: { en: "Classic hot dog.", es: "Hot dog clásico." } }
    ]
  },
  {
    id: "desserts",
    title:  { en: "Desserts", es: "Postres" },
    kicker: { en: "Sweet finish", es: "Final dulce" },
    items: [
      { id: "cheesecake", name: { en: "Cheesecake", es: "Pay de Queso" }, price: 8,
        desc: { en: "Rich & creamy.", es: "Cremoso y delicioso." } },
      { id: "tres-leches", name: { en: "Tres Leches Cake", es: "Pastel de Tres Leches" }, price: 8,
        desc: { en: "Soft sponge soaked in three milks.", es: "Bizcocho suave bañado en tres leches." } }
    ]
  },
  {
    id: "drinks",
    title:  { en: "Drinks", es: "Bebidas" },
    kicker: { en: "Wash it down", es: "Para acompañar" },
    note:   { en: "Aguas Frescas & Shirley Temple flavors: Strawberry · Lime · Blue Raspberry · Orange.",
              es: "Sabores de aguas frescas y Shirley Temple: fresa · limón · frambuesa azul · naranja." },
    items: [
      { id: "fountain", name: { en: "Fountain Drink", es: "Refresco" }, price: 3,
        desc: { en: "Refillable fountain soda.", es: "Refresco de máquina con recarga." } },
      { id: "agua-fresca", name: "Agua Fresca", price: 4,
        desc: { en: "House-made. Choose your flavor in notes.", es: "Hecha en casa. Elige tu sabor en las notas." } },
      { id: "shirley-temple", name: "Shirley Temple", price: 4,
        desc: { en: "Choose your flavor in notes.", es: "Elige tu sabor en las notas." } }
    ]
  }
];
