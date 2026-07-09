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
    title:  { en: "K-Burgers", es: "K-Burgers" },
    kicker: { en: "The K-Burger Lineup", es: "La Línea K-Burger" },
    note:   { en: "All burgers are served with fries!", es: "¡Todas las hamburguesas se sirven con papas!" },
    accent: "hot",
    items: [
      { id: "la-bendi", name: "La Bendi", price: 10,
        customize: { removable: [ { en: "cheese", es: "queso" }, { en: "mayo", es: "mayonesa" } ] },
        desc: { en: "One patty, one slice of cheese, and mayo.",
                es: "Una carne, una rebanada de queso y mayonesa." } },
      { id: "double-cheese", name: "Double Cheese", price: 13,
        customize: { removable: [
          { en: "grilled onions", es: "cebolla asada" }, { en: "house sauce", es: "salsa de la casa" },
          { en: "lettuce", es: "lechuga" }, { en: "tomato", es: "tomate" }, { en: "jalapeño", es: "jalapeño" } ] },
        desc: { en: "Two patties, two slices of cheese, grilled onions & house sauce — with lettuce, tomato and jalapeño on the side.",
                es: "Dos carnes, dos rebanadas de queso, cebolla asada y salsa de la casa — con lechuga, tomate y jalapeño aparte." } },
      { id: "bacon-special", name: "Bacon Special", price: 16,
        customize: { removable: [
          { en: "bacon", es: "tocino" }, { en: "grilled onions", es: "cebolla asada" }, { en: "house sauce", es: "salsa de la casa" },
          { en: "lettuce", es: "lechuga" }, { en: "tomato", es: "tomate" }, { en: "jalapeño", es: "jalapeño" } ] },
        desc: { en: "Two patties, two slices of cheese, two slices of bacon, grilled onions & house sauce — with lettuce, tomato and jalapeño on the side.",
                es: "Dos carnes, dos rebanadas de queso, dos de tocino, cebolla asada y salsa de la casa — con lechuga, tomate y jalapeño aparte." } },
      { id: "mama-luchona", name: "Mama Luchona", price: 20, tag: { en: "Signature", es: "De la Casa" },
        customize: { removable: [
          { en: "ham", es: "jamón" }, { en: "hot-links", es: "salchicha picante" }, { en: "bacon", es: "tocino" },
          { en: "grilled onions", es: "cebolla asada" }, { en: "grilled pineapple", es: "piña asada" },
          { en: "house sauce", es: "salsa de la casa" }, { en: "lettuce", es: "lechuga" },
          { en: "tomato", es: "tomate" }, { en: "jalapeño", es: "jalapeño" } ] },
        desc: { en: "Two patties, two cheese slices, two ham slices, hot-links, two slices of bacon, grilled onions, grilled pineapple & house sauce — with lettuce, tomato and jalapeño on the side.",
                es: "Dos carnes, dos rebanadas de queso, dos de jamón, salchicha picante, dos de tocino, cebolla asada, piña asada y salsa de la casa — con lechuga, tomate y jalapeño aparte." } },
      { id: "la-costa-happy", name: "La Costa Happy", price: 20, tag: { en: "Spicy", es: "Picante" },
        customize: { removable: [
          { en: "lettuce", es: "lechuga" }, { en: "tomato", es: "tomate" }, { en: "red onions", es: "cebolla morada" },
          { en: "avocado", es: "aguacate" }, { en: "pineapple", es: "piña" }, { en: "mango habanero sauce", es: "salsa de mango habanero" } ] },
        desc: { en: "Shrimp, lettuce, tomato, red onions, avocado, pineapple, mozzarella cheese & our mango habanero sauce.",
                es: "Camarón, lechuga, tomate, cebolla morada, aguacate, piña, queso mozzarella y nuestra salsa de mango habanero." } },
      { id: "surf-turf", name: "Surf & Turf", price: 25, tag: { en: "Spicy", es: "Picante" },
        customize: { removable: [
          { en: "lettuce", es: "lechuga" }, { en: "tomato", es: "tomate" }, { en: "red onions", es: "cebolla morada" },
          { en: "avocado", es: "aguacate" }, { en: "pineapple", es: "piña" }, { en: "mango habanero sauce", es: "salsa de mango habanero" } ] },
        desc: { en: "Shrimp, one meat patty, lettuce, tomato, red onions, avocado, pineapple, mozzarella cheese & our mango habanero sauce.",
                es: "Camarón, una carne, lechuga, tomate, cebolla morada, aguacate, piña, queso mozzarella y nuestra salsa de mango habanero." } },
      { id: "la-del-viejon", name: "La Del Viejón", price: 17, tag: { en: "New", es: "Nuevo" },
        customize: { removable: [
          { en: "bacon", es: "tocino" }, { en: "grilled onions", es: "cebolla asada" }, { en: "tomato", es: "tomate" },
          { en: "lettuce", es: "lechuga" }, { en: "red onions", es: "cebolla morada" }, { en: "house sauce", es: "salsa de la casa" } ] },
        desc: { en: "One patty wrapped in mozzarella cheese with bacon & grilled onions, plus tomato, lettuce, red onions and house sauce.",
                es: "Una carne envuelta en queso mozzarella con tocino y cebolla asada, más tomate, lechuga, cebolla morada y salsa de la casa." } }
    ]
  },
  {
    id: "appetizers",
    title:  { en: "Appetizers", es: "Entradas" },
    kicker: { en: "Start it right", es: "Para empezar" },
    items: [
      { id: "elote-ribs", name: "Elote Ribs", price: 10,
        customize: { removable: [
          { en: "sour cream", es: "crema" }, { en: "queso fresco", es: "queso fresco" },
          { en: "tajín", es: "tajín" }, { en: "cilantro", es: "cilantro" } ] },
        desc: { en: "Deep-fried sweet corn, garnished with our sour cream, queso fresco, tajín & cilantro.",
                es: "Elote frito, cubierto con nuestra crema, queso fresco, tajín y cilantro." } },
      { id: "kitoz-fries", name: "Kitoz Fries", price: 12, tag: { en: "Loaded", es: "Cargadas" },
        customize: { removable: [
          { en: "pineapple", es: "piña" }, { en: "grilled onions", es: "cebolla asada" },
          { en: "house sauce", es: "salsa de la casa" } ] },
        desc: { en: "Crispy french fries, one meat patty, pineapple, grilled onions & our house sauce.",
                es: "Papas fritas crujientes, una carne, piña, cebolla asada y nuestra salsa de la casa." } },
      { id: "wings-6", name: { en: "Wings", es: "Alitas" }, price: 12,
        options: { label: { en: "Flavor", es: "Sabor" }, choices: ["Mango Habanero", "Buffalo", "Sweet Chili", "BBQ"] },
        customize: { removable: [
          { en: "carrots", es: "zanahoria" }, { en: "celery", es: "apio" }, { en: "ranch", es: "ranch" } ] },
        desc: { en: "Six crispy chicken wings with carrots, celery & ranch. Pick a flavor: Mango Habanero, Buffalo, Sweet Chili or BBQ.",
                es: "Seis alitas de pollo crujientes con zanahoria, apio y ranch. Elige un sabor: Mango Habanero, Buffalo, Sweet Chili o BBQ." } }
    ]
  },
  {
    id: "drinks",
    title:  { en: "Drinks", es: "Bebidas" },
    kicker: { en: "Wash it down", es: "Para acompañar" },
    items: [
      { id: "can-soda",     name: { en: "Can Soda", es: "Refresco en Lata" }, price: 3,
        desc: { en: "Ice-cold canned soda.", es: "Refresco en lata bien frío." } },
      { id: "bottle-soda",  name: { en: "Bottle Soda", es: "Refresco en Botella" }, price: 4,
        desc: { en: "Bottled soda.", es: "Refresco en botella." } },
      { id: "bottle-water", name: { en: "Bottled Water", es: "Agua en Botella" }, price: 2,
        desc: { en: "Purified bottled water.", es: "Agua purificada en botella." } },
      { id: "sunny-d",      name: "Sunny D", price: 2,
        desc: { en: "Classic Sunny D.", es: "Sunny D clásico." } }
    ]
  }
];
