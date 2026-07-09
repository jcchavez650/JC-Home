/* ============================================================================
   KITOZ BURGER — App logic: menu rendering, cart & WhatsApp ordering
   ========================================================================== */
(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const MENU = window.MENU;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => `${CONFIG.currency}${Number(n).toFixed(2)}`;

  /* ---- Cart state (persisted) ------------------------------------------- */
  const STORE_KEY = "kitoz_cart_v1";
  let cart = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch {} }

  function addToCart(item, choice) {
    // Items with options (e.g. wing flavor) prompt for a choice first
    if (item.options && !choice) { openOptionPicker(item); return; }
    const label = choice ? `${item.name} — ${choice}` : item.name;
    if (cart[label]) cart[label].qty += 1;
    else cart[label] = { name: label, price: item.price || 0, qty: 1 };
    save(); renderCart(); bump();
    toast(`Added ${label}`);
  }
  function setQty(key, delta) {
    if (!cart[key]) return;
    cart[key].qty += delta;
    if (cart[key].qty <= 0) delete cart[key];
    save(); renderCart();
  }
  const cartCount = () => Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotal = () => Object.values(cart).reduce((s, i) => s + i.qty * i.price, 0);

  /* ---- Build the specials spotlight ------------------------------------- */
  const SPOT_EMOJI = ["🍔", "🍟", "🍤", "🧀", "🥓", "🌶️"];
  function renderSpotlight() {
    const specials = MENU.find((c) => c.id === "specials");
    if (!specials) return;
    $("#spotlightGrid").innerHTML = specials.items.map((it, i) => `
      <article class="spot-card tilt">
        ${it.tag ? `<span class="spot-tag">${it.tag}</span>` : ""}
        <div class="spot-emoji">${SPOT_EMOJI[i % SPOT_EMOJI.length]}</div>
        <h3>${it.name}</h3>
        <p class="spot-desc">${it.desc || ""}</p>
        <div class="spot-foot">
          <span class="spot-price"><span>${CONFIG.currency}</span>${it.price ?? "—"}</span>
          <button class="add-btn" data-add="${esc(it.name)}">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg> Add
          </button>
        </div>
      </article>`).join("");
  }

  /* ---- Build the full menu ---------------------------------------------- */
  function renderMenu() {
    // tabs
    $("#menuTabs").innerHTML = MENU.map((c, i) =>
      `<button class="menu-tab${i === 0 ? " active" : ""}" data-tab="${c.id}">${c.title}</button>`
    ).join("");

    // sections
    $("#menuSections").innerHTML = MENU.map((c) => `
      <div class="menu-cat" id="cat-${c.id}">
        <div class="menu-cat-head">
          <h3>${c.title}</h3>
          ${c.kicker ? `<span class="menu-cat-kicker">${c.kicker}</span>` : ""}
        </div>
        ${c.note ? `<p class="menu-cat-note">${c.note}</p>` : ""}
        <div class="item-grid">
          ${c.items.map((it) => `
            <div class="item">
              <div class="item-info">
                <div class="item-top">
                  <span class="item-name">${it.name}</span>
                  ${it.tag ? `<span class="item-tag">${it.tag}</span>` : ""}
                </div>
                ${it.desc ? `<p class="item-desc">${it.desc}</p>` : ""}
              </div>
              <div class="item-right">
                <span class="item-price">${it.price != null ? money(it.price) : "Ask"}</span>
                <button class="add-btn" data-add="${esc(it.name)}">
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg> Add
                </button>
              </div>
            </div>`).join("")}
        </div>
      </div>`).join("");
  }

  const findItem = (name) => {
    for (const c of MENU) { const f = c.items.find((i) => i.name === name); if (f) return f; }
    return null;
  };

  /* ---- Cart drawer rendering -------------------------------------------- */
  function renderCart() {
    const items = Object.values(cart);
    const count = cartCount();
    const badge = $("#cartCount");
    badge.textContent = count;
    badge.hidden = count === 0;

    const empty = $("#cartEmpty");
    const list = $("#cartItems");
    const foot = $("#cartFoot");

    if (items.length === 0) {
      empty.style.display = "block"; list.innerHTML = ""; foot.hidden = true; return;
    }
    empty.style.display = "none"; foot.hidden = false;

    list.innerHTML = items.map((i) => `
      <li class="cart-item">
        <div class="cart-item-main">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-price">${i.price ? money(i.price) : "Price on request"} each</div>
        </div>
        <div class="qty">
          <button data-dec="${esc(i.name)}" aria-label="Decrease">−</button>
          <span>${i.qty}</span>
          <button data-inc="${esc(i.name)}" aria-label="Increase">+</button>
        </div>
        <div class="cart-line-total">${i.price ? money(i.price * i.qty) : "—"}</div>
      </li>`).join("");

    $("#cartTotal").textContent = money(cartTotal());
  }

  /* ---- Customer details (remembered for repeat orders) ------------------ */
  const CUST_KEY = "kitoz_cust_v1";
  function loadCust() {
    try { return JSON.parse(localStorage.getItem(CUST_KEY)) || {}; } catch { return {}; }
  }
  function saveCust(name, phone) {
    try { localStorage.setItem(CUST_KEY, JSON.stringify({ name, phone })); } catch {}
  }
  function fillCust() {
    const c = loadCust();
    if (c.name) $("#custName").value = c.name;
    if (c.phone) $("#custPhone").value = c.phone;
  }

  /* ---- Build & send the WhatsApp order ---------------------------------- */
  function buildOrderText(name, phone) {
    const items = Object.values(cart);
    let msg = `🍔 *New Kitoz Burger Order*\n\n`;
    msg += `👤 Name: ${name}\n`;
    msg += `📞 Phone: ${phone}\n\n`;
    items.forEach((i) => {
      msg += `• ${i.qty}× ${i.name}` + (i.price ? ` — ${money(i.price * i.qty)}` : "") + `\n`;
    });
    msg += `\n*Estimated total: ${money(cartTotal())}*\n`;
    const notes = $("#orderNotes").value.trim();
    if (notes) msg += `\n📝 Notes: ${notes}\n`;
    msg += `\n(Sent from the Kitoz Burger website)`;
    return msg;
  }

  function flagInvalid(el, bad) {
    el.classList.toggle("invalid", bad);
    if (bad) el.focus();
  }

  function sendOrder() {
    if (cartCount() === 0) { toast("Your order is empty"); return; }

    const nameEl = $("#custName"), phoneEl = $("#custPhone");
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const phoneDigits = phone.replace(/[^\d]/g, "");

    // Validate customer details (phone must be missing-or-typo proof)
    const phoneBad = phoneDigits.length < 7;
    flagInvalid(phoneEl, phoneBad);
    flagInvalid(nameEl, !name);
    if (!name || phoneBad) { toast(!name ? "Please add your name" : "Enter a valid phone number"); return; }

    const digits = (CONFIG.phone || "").replace(/[^\d]/g, "");
    if (!digits || digits === "10000000000") {
      toast("Order number not set yet — see config");
      alert("⚠️ The order phone number hasn't been set up yet.\n\nAdd your real WhatsApp number in js/data.js (CONFIG.phone) and orders will send.");
      return;
    }

    saveCust(name, phone);
    const text = encodeURIComponent(buildOrderText(name, phone));
    const url = CONFIG.orderMethod === "sms"
      ? `sms:${CONFIG.phone}?&body=${text}`
      : `https://wa.me/${digits}?text=${text}`;
    window.open(url, "_blank");
  }

  /* ---- Cart open/close --------------------------------------------------- */
  const drawer = $("#cartDrawer");
  const overlay = $("#cartOverlay");
  function openCart() {
    overlay.hidden = false; drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  }
  function closeCart() {
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; setTimeout(() => (overlay.hidden = true), 300);
  }

  /* ---- Option picker (wing flavor, etc.) -------------------------------- */
  let pendingOptionItem = null;
  let optCloseTimer = null;
  function openOptionPicker(item) {
    clearTimeout(optCloseTimer);
    pendingOptionItem = item;
    $("#optKicker").textContent = item.name;
    $("#optTitle").textContent = `Choose a ${(item.options.label || "option").toLowerCase()}`;
    $("#optChoices").innerHTML = item.options.choices.map((c) =>
      `<button class="opt-choice" data-choice="${esc(c)}">${c}<span aria-hidden="true">＋</span></button>`).join("");
    $("#optOverlay").hidden = false; $("#optModal").hidden = false;
    requestAnimationFrame(() => $("#optModal").classList.add("open"));
  }
  function closeOptionPicker() {
    $("#optModal").classList.remove("open");
    $("#optOverlay").hidden = true;
    pendingOptionItem = null;
    clearTimeout(optCloseTimer);
    // Only hide after the fade IF it wasn't reopened in the meantime
    optCloseTimer = setTimeout(() => {
      if (!$("#optModal").classList.contains("open")) $("#optModal").hidden = true;
    }, 220);
  }

  /* ---- Visit section: hours & socials ----------------------------------- */
  function renderVisit() {
    $("#hoursList").innerHTML = CONFIG.hours.map((h) =>
      `<li><span class="days">${h.days}</span><span class="time">${h.time}</span></li>`).join("");

    if (CONFIG.address) {
      const a = $("#addressLine"); a.hidden = false; a.textContent = `📍 ${CONFIG.address}`;
    }

    const s = CONFIG.social || {};
    const icons = {
      instagram: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.1-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.1 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1C2.6 9.9 2.6 10.3 2.6 12s0 2.1.1 3.3c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-3.3s0-2.1-.1-3.3c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4C15.5 4 15.1 4 12 4Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm5.1-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5.8a4.8 4.8 0 0 1-1-.1 4.8 4.8 0 0 1-3-2.9 4.7 4.7 0 0 1-.2-1.3h-3.2v13.2a2.7 2.7 0 1 1-1.9-2.6V8.8a5.9 5.9 0 1 0 5.1 5.8V9.2a8 8 0 0 0 4.3 1.3V7.3a4.8 4.8 0 0 1-.1-1.5Z"/></svg>'
    };
    const labels = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };
    const html = Object.keys(icons).filter((k) => s[k]).map((k) =>
      `<a class="social-link" href="${s[k]}" target="_blank" rel="noopener">${icons[k]} ${labels[k]}</a>`).join("");
    $("#socials").innerHTML = html || `<p class="section-sub" style="margin:0">Follow us soon!</p>`;
  }

  /* ---- Small helpers ---------------------------------------------------- */
  function esc(s) { return String(s).replace(/"/g, "&quot;"); }
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.classList.remove("show"); setTimeout(() => (t.hidden = true), 300); }, 1800);
  }
  function bump() {
    const b = $("#cartCount");
    b.style.transform = "scale(1.4)";
    setTimeout(() => (b.style.transform = ""), 180);
  }

  /* ---- Interactions ----------------------------------------------------- */
  function wire() {
    // add / qty via delegation
    document.addEventListener("click", (e) => {
      const choice = e.target.closest("[data-choice]");
      if (choice) {
        if (pendingOptionItem) addToCart(pendingOptionItem, choice.getAttribute("data-choice"));
        closeOptionPicker(); return;
      }
      const add = e.target.closest("[data-add]");
      if (add) { const it = findItem(add.getAttribute("data-add")); if (it) addToCart(it); return; }
      const inc = e.target.closest("[data-inc]");
      if (inc) { setQty(inc.getAttribute("data-inc"), 1); return; }
      const dec = e.target.closest("[data-dec]");
      if (dec) { setQty(dec.getAttribute("data-dec"), -1); return; }
    });

    $("#openCart").addEventListener("click", openCart);
    $("#startOrder").addEventListener("click", openCart);
    $("#closeCart").addEventListener("click", closeCart);
    $("#cartOverlay").addEventListener("click", closeCart);
    $("#sendOrder").addEventListener("click", sendOrder);
    ["custName", "custPhone"].forEach((id) =>
      $("#" + id).addEventListener("input", (e) => e.target.classList.remove("invalid")));
    $("#optClose").addEventListener("click", closeOptionPicker);
    $("#optOverlay").addEventListener("click", closeOptionPicker);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeOptionPicker(); closeCart(); } });

    // menu tabs -> smooth scroll + active state
    $("#menuTabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".menu-tab"); if (!tab) return;
      const id = tab.getAttribute("data-tab");
      const target = $(`#cat-${id}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // spy active tab on scroll
    const cats = MENU.map((c) => $(`#cat-${c.id}`)).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const id = en.target.id.replace("cat-", "");
          $$(".menu-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === id));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    cats.forEach((c) => spy.observe(c));

    // nav scrolled state
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

    // hamburger
    const burger = $("#hamburger"), mm = $("#mobileMenu");
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      mm.hidden = open;
    });
    $$("#mobileMenu a").forEach((a) => a.addEventListener("click", () => {
      burger.setAttribute("aria-expanded", "false"); mm.hidden = true;
    }));

    // reveal on scroll
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((el) => revObs.observe(el));

    // subtle 3D tilt on spotlight cards
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && matchMedia("(pointer:fine)").matches) {
      $$(".tilt").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `translateY(-6px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
        });
        card.addEventListener("mouseleave", () => (card.style.transform = ""));
      });
    }

    $("#year").textContent = new Date().getFullYear();
  }

  /* ---- Init ------------------------------------------------------------- */
  renderSpotlight();
  renderMenu();
  renderVisit();
  renderCart();
  fillCust();
  wire();
})();
