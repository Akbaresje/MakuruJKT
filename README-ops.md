# makuru. — Simple Stock & Orders

One file: **`makuru-ops.html`**. Open it in any browser. No login, no server. Data is saved in the browser (localStorage) and **starts empty**.

Base kitchen: **Belmore NSW 2192**.

## Pages

| Page | What you can do |
| :--- | :--- |
| **Home** | See packs in kitchen, packs in shops, open orders, low raw materials. |
| **Dimsum Stock** | Add a product (name, pack size, price). Per product: **Add** packs (after cooking), **Remove** packs, **Send to shop**, Edit, **Delete**. |
| **Raw Materials** | Add a material (name, unit, minimum). Per material: **Add** (bought), **Use** (cooked), Edit, **Delete**. Shows Low / Out. |
| **Shops** | Add a shop (name, suburb, phone, commission %). Each shop card shows packs per product with **Sold** and **Take back**. Shop sales list with **Delete**. Shop **Delete** returns its packs to the kitchen. |
| **Orders** | New order (customer, phone, suburb or pickup, date, items). Saving takes packs out of kitchen stock. Buttons: **Paid** (PayID / bank transfer / cash), **Delivered**, **Delete** (open orders put packs back). Filters: Open / Delivered / All. |

Sidebar: **Exit** (back to start screen) and **Clear all data**.

## Motion
- **The `makuru.` wordmark** on the start screen: each letter rises out of the paper one after another (blurred, slightly turned), the full stop lands last with a small bounce, a thin gold-to-red rule draws itself underneath, then the wordmark floats slowly and a warm halo behind it breathes. Exit → start screen plays it again.
- **Enter** on the start screen → the landing screen pinches down into the bottom edge and Home rises up.
- **Every page change** → the page you leave is copied, squeezed and dropped toward the bottom edge (the sidebar stays put), then the new page rises in.
- **Headline numbers** count up from 0 to the real value on every page.
- **Buttons** lift 2px on hover with a soft shadow, a light sweep and a glow that follows the cursor; they press down when clicked.
- Everything is turned off automatically when the device asks for reduced motion.

## Mascot
A small cartoon dimsum bun sits in the bottom-right corner (120px, 88px on phones) on every page.
- Eyes follow the pointer, then wander on their own when the mouse rests; random blinks (sometimes twice).
- Click him: squash, jump and a happy face. He hops when you save a product or an order, and wiggles when something is deleted.
- He hides while a dialog is open and lifts for a moment when a toast shows, so he never covers a button.
- Everyone respects reduced motion. No images, no emoji: inline SVG only.

## Rules kept
Cream `#FAF5EB`, red `#9E2A2B`, dark text `#241E1E`, white cards. No emoji, no photos, no avatars. Simple English. AUD, phones shown as `04xx xxx xxx`.

## Source & tests
- `ops-simple/app.js`, `ops-simple/styles.css` → `python3 ops-simple/build.py`
- `node ops-simple/tests/smoke.mjs` — 33 checks (add/remove/send/sold/take back/order/paid/deliver/delete/clear).
- `ops-simple/mascot/` — `mascot.css`, `mascot.js` (inlined by `build.py`), plus `preview.html` + `build_preview.py` → `/home/user/mascot-preview.html` (the standalone preview used to pick the placement).
- `node ops-simple/tests/mascot.mjs` — 18 checks for the mascot (placement, eyes, reactions, dialogs, toasts, mobile, reduced motion).
- `node ops-simple/tests/anim.mjs` — 14 checks for the pinch transition, count-up, hover and reduced motion (needs `npm i playwright-core playwright` + `npx playwright install chromium`).
- `node ops-simple/tests/shot.mjs` — screenshots into `shots-ops/`.
- Previous, more complex version is kept in `archive/ops-src-v1-complex/`.
