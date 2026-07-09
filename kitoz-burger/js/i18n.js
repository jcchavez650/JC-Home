/* ============================================================================
   KITOZ BURGER — Internationalization (English / Spanish)
   ----------------------------------------------------------------------------
   window.i18n.get()  -> current language ("en" | "es")
   window.i18n.set(l) -> change language (persisted)
   window.i18n.t(key) -> UI string for the current language
   window.i18n.L(val) -> resolve a bilingual value {en,es} (or pass strings thru)
   ========================================================================== */
window.i18n = (function () {
  const KEY = "kitoz_lang_v1";

  let lang;
  try { lang = localStorage.getItem(KEY); } catch (e) {}
  if (lang !== "en" && lang !== "es") {
    lang = (navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en";
  }

  /* UI strings. Values with HTML are applied via data-i18n-html. */
  const DICT = {
    // Nav
    "nav.specials": { en: "Specials", es: "Especiales" },
    "nav.menu":     { en: "Menu",     es: "Menú" },
    "nav.about":    { en: "About",    es: "Nosotros" },
    "nav.visit":    { en: "Visit",    es: "Visítanos" },
    "nav.order":    { en: "Order",    es: "Ordenar" },
    "btn.add":      { en: "Add",      es: "Agregar" },

    // Hero
    "hero.eyebrow": { en: "🔥 Fresh · Smashed · Never Frozen", es: "🔥 Fresco · Aplastado · Nunca Congelado" },
    "hero.title":   { en: "Smashed<br><span class=\"grad\">to Perfection</span>", es: "Aplastadas<br><span class=\"grad\">a la Perfección</span>" },
    "hero.sub":     {
      en: "Bold, juicy smash burgers and legendary K-Burger specials — built with love, stacked without limits. Order online, we'll get it sizzling.",
      es: "Hamburguesas smash jugosas y los legendarios especiales K-Burger — hechas con amor, sin límites. Ordena en línea y las ponemos en la plancha."
    },
    "hero.orderNow":    { en: "Order Now", es: "Ordenar Ahora" },
    "hero.seeSpecials": { en: "See the Specials", es: "Ver Especiales" },
    "hero.stat1": { en: "Fresh Beef", es: "Carne Fresca" },
    "hero.stat2": { en: "Signature Specials", es: "Especiales" },
    "hero.stat3": { en: "Local Favorite", es: "Favorito Local" },
    "hero.scroll": { en: "Scroll", es: "Desliza" },

    // Specials section
    "sp.kicker": { en: "The K-Burger Lineup", es: "La Línea K-Burger" },
    "sp.title":  { en: "Specials worth the drive", es: "Especiales que valen el viaje" },
    "sp.sub":    { en: "Every special comes loaded and served with fries and jalapeño on the side.", es: "Cada especial viene bien servido, con papas y jalapeño aparte." },

    // Menu section
    "mn.kicker": { en: "Everything We Serve", es: "Todo lo que Servimos" },
    "mn.title":  { en: "The Full Menu", es: "El Menú Completo" },
    "mn.sub":    { en: "Tap <strong>Add</strong> on anything to build your order, then send it straight to us.", es: "Toca <strong>Agregar</strong> en lo que quieras para armar tu orden y envíanosla directo." },

    // Story
    "st.kicker": { en: "Our Story", es: "Nuestra Historia" },
    "st.title":  { en: "Big flavor, no shortcuts", es: "Mucho sabor, sin atajos" },
    "st.p1": {
      en: "At Kitoz Burger we do one thing and we do it loud — smash fresh beef thin on a screaming-hot flat-top for those crispy, caramelized edges, then stack it with the good stuff. From the over-the-top <strong>La 4x4</strong> to the sweet-heat <strong>Happy Costa Burger</strong>, every order is made to order.",
      es: "En Kitoz Burger hacemos una cosa y la hacemos con ganas — aplastamos carne fresca en la plancha bien caliente para esos bordes crujientes y caramelizados, y la armamos con lo mejor. Desde la exagerada <strong>La 4x4</strong> hasta la dulce-picante <strong>Happy Costa Burger</strong>, todo se prepara al momento."
    },
    "st.p2": { en: "Come hungry. Leave happy. That's the whole plan.", es: "Ven con hambre. Vete feliz. Ese es todo el plan." },
    "st.btn": { en: "Build Your Order", es: "Arma tu Orden" },
    "st.card1": { en: "Smashed on the flat-top", es: "Aplastada en la plancha" },
    "st.card2": { en: "Real melted cheese", es: "Queso derretido de verdad" },
    "st.card3": { en: "Mango habanero heat", es: "Picor de mango habanero" },

    // Visit
    "vs.kicker": { en: "Come Get It", es: "Ven por la Tuya" },
    "vs.title":  { en: "Hours & Ordering", es: "Horario y Pedidos" },
    "vs.hours":  { en: "Opening Hours", es: "Horario" },
    "vs.how":    { en: "How to Order", es: "Cómo Ordenar" },
    "vs.how1": { en: "Browse the menu and tap <strong>Add</strong> on what you want.", es: "Explora el menú y toca <strong>Agregar</strong> en lo que quieras." },
    "vs.how2": { en: "Open your <strong>Order</strong> and add any notes (flavors, bread, meat).", es: "Abre tu <strong>Orden</strong> y agrega notas (sabores, pan, carne)." },
    "vs.how3": { en: "Hit send — your order goes straight to us on WhatsApp.", es: "Presiona enviar — tu pedido nos llega directo por WhatsApp." },
    "vs.how4": { en: "We'll confirm and get it cooking. Pay on pickup.", es: "Confirmamos y lo cocinamos. Pagas al recoger." },
    "vs.startOrder": { en: "Start My Order", es: "Iniciar mi Orden" },
    "vs.follow": { en: "Follow the Flavor", es: "Sigue el Sabor" },
    "vs.followSub": { en: "Specials, drops & behind-the-grill.", es: "Especiales, novedades y detrás de la parrilla." },

    // Footer
    "ft.copy": { en: "Smashed with love.", es: "Hecho con amor." },
    "ft.allergen": {
      en: "Our kitchen handles common allergens (milk, nuts, eggs, wheat, soy, fish, shellfish). Please tell us about any allergies when ordering.",
      es: "Nuestra cocina maneja alérgenos comunes (leche, nueces, huevo, trigo, soya, pescado, mariscos). Avísanos de cualquier alergia al ordenar."
    },

    // Cart
    "cart.title":  { en: "Your Order", es: "Tu Orden" },
    "cart.empty1": { en: "Your order is empty.", es: "Tu orden está vacía." },
    "cart.empty2": { en: "Add something delicious from the menu.", es: "Agrega algo delicioso del menú." },
    "cart.name":   { en: "Your name <em>*</em>", es: "Tu nombre <em>*</em>" },
    "cart.phone":  { en: "Your phone <em>*</em>", es: "Tu teléfono <em>*</em>" },
    "cart.namePh": { en: "e.g. Maria G.", es: "ej. María G." },
    "cart.phonePh": { en: "e.g. (669) 300-7607", es: "ej. (669) 300-7607" },
    "cart.notesLabel": { en: "Order notes (flavors, bread, meat choice, allergies)", es: "Notas del pedido (sabores, pan, tipo de carne, alergias)" },
    "cart.notesPh": { en: "e.g. Wings mango habanero, sandwich on sourdough, no onions", es: "ej. Alitas mango habanero, sándwich en masa madre, sin cebolla" },
    "cart.total": { en: "Total", es: "Total" },
    "cart.disclaimer": { en: "Total is an estimate — we'll confirm your final price on WhatsApp.", es: "El total es un estimado — confirmaremos el precio final por WhatsApp." },
    "cart.send": { en: "Send Order via WhatsApp", es: "Enviar Pedido por WhatsApp" },
    "cart.each": { en: "each", es: "c/u" },
    "cart.priceOnReq": { en: "Price on request", es: "Precio a consultar" },
    "cart.ask": { en: "Ask", es: "Consultar" },

    // Configurator / picker
    "cfg.chooseFlavor": { en: "Choose a flavor", es: "Elige un sabor" },
    "cfg.customize": { en: "Customize", es: "Personalizar" },
    "cfg.remove": { en: "Tap to remove", es: "Toca para quitar" },
    "cfg.extras": { en: "Add extras", es: "Agregar extras" },
    "cfg.total": { en: "Total", es: "Total" },
    "cfg.add": { en: "Add to order", es: "Agregar a la orden" },

    // Order message + toasts
    "msg.title": { en: "New Kitoz Burger Order", es: "Nuevo Pedido de Kitoz Burger" },
    "msg.name":  { en: "Name", es: "Nombre" },
    "msg.phone": { en: "Phone", es: "Teléfono" },
    "msg.total": { en: "Estimated total", es: "Total estimado" },
    "msg.notes": { en: "Notes", es: "Notas" },
    "msg.sentFrom": { en: "(Sent from the Kitoz Burger website)", es: "(Enviado desde el sitio de Kitoz Burger)" },
    "mod.no":  { en: "No ", es: "Sin " },
    "mod.add": { en: "Add ", es: "Con " },
    "toast.added": { en: "Added", es: "Agregado" },
    "toast.sent": { en: "Order sent! We'll confirm on WhatsApp 🍔", es: "¡Pedido enviado! Confirmamos por WhatsApp 🍔" },
    "toast.emptyCart": { en: "Your order is empty", es: "Tu orden está vacía" },
    "toast.needName": { en: "Please add your name", es: "Agrega tu nombre" },
    "toast.badPhone": { en: "Enter a valid phone number", es: "Ingresa un teléfono válido" },
    "toast.needFlavor": { en: "Please choose a flavor", es: "Por favor elige un sabor" },
    "toast.noNumber": { en: "Order number not set yet — see config", es: "Número de pedidos no configurado — revisa la config" }
  };

  return {
    get() { return lang; },
    set(l) { lang = (l === "es" ? "es" : "en"); try { localStorage.setItem(KEY, lang); } catch (e) {} },
    t(key) { const e = DICT[key]; return e ? (e[lang] || e.en) : key; },
    L(v) { return (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] || v.en || "") : v; }
  };
})();
