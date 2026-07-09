# Kitoz Burger — 3D Website

A dark, premium single-page site for Kitoz Burger with a real 3D (WebGL/Three.js)
hero burger, parallax/tilt accents, a full menu, and a **cart that sends orders
straight to your WhatsApp** — no backend, no fees.

## 📁 Structure

```
kitoz-burger/
├── index.html        # page markup
├── css/styles.css    # dark & premium theme
└── js/
    ├── data.js       # 👈 YOUR business info + menu (edit this)
    ├── app.js        # menu rendering, cart & WhatsApp ordering
    └── scene.js      # the 3D hero burger (Three.js)
```

## ✏️ What YOU need to fill in (`js/data.js`)

Everything customer-facing lives in **`js/data.js`** — you don't need to touch
any other file.

1. **`CONFIG.phone`** ⚠️ **Required for ordering.**
   Your WhatsApp number in full international format, e.g. `+13055551234`.
   Until this is set, the "Send Order" button shows a reminder instead of sending.
2. **`CONFIG.hours`** — replace the placeholder opening hours.
3. **`CONFIG.social`** — Instagram is filled in (`kitoz__burger`); add Facebook/TikTok if you have them.
4. **`MENU`** — prices/items marked `TODO` were hidden behind the Instagram UI in
   your menu photo. Please confirm:
   - **Double Cheese**, **Bacon Special**, **Surf & Turf** prices
   - **Salad → Add Chicken** price
   - **Fountain Drink / Agua Fresca / Shirley Temple** prices
   - Two **Desserts** were hidden — add them under the `desserts` category.

## ▶️ Run it locally

Because it uses ES modules, open it through a local server (not `file://`):

```bash
cd kitoz-burger
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🌐 Deploy (free, static)

Works as-is on **GitHub Pages**, **Netlify**, or **Vercel** — no build step.
- **GitHub Pages:** push, then Settings → Pages → deploy from branch, folder `/kitoz-burger`.
- **Netlify:** drag-and-drop the `kitoz-burger` folder, or connect the repo.

## 🛒 How ordering works

Customers add items → open the **Order** drawer → add notes (flavor, bread, meat,
allergies) → tap **Send Order via WhatsApp**. Their order arrives in your WhatsApp
pre-formatted. You confirm and collect payment on pickup. To use SMS instead,
set `CONFIG.orderMethod = "sms"`.
