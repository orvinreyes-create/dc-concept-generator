/* VITRO TestFit offline support.
   - The app page: network first, so updates arrive as soon as you are online; the cached copy is used offline.
   - Libraries (MapLibre, three.js, fonts, PptxGenJS): cache first; they are versioned and do not change.
   - Map tiles: cached as you browse (up to ~1,500), so recently viewed areas still show on a weak connection. */
const V = "vtf-v2";
const PAGE = "vtf-page-" + V, LIBS = "vtf-libs-" + V, TILES = "vtf-tiles-" + V;
const TILE_MAX = 1500;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(PAGE).then(c => c.addAll(["./", "./index.html"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("vtf-") && !k.endsWith(V)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

const isLib = u => /unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host);
const isTile = u => /tile\.openstreetmap\.org|arcgisonline\.com|basemaps\.cartocdn\.com/.test(u.host);

async function trimTiles() {
  const c = await caches.open(TILES), keys = await c.keys();
  for (let i = 0; i < keys.length - TILE_MAX; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);

  if (req.mode === "navigate" || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(PAGE).then(c => c.put("./index.html", cp)); }
      return r;
    }).catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }

  if (u.origin === location.origin && u.pathname.includes("/data/")) {
    /* site-risk snapshots: serve the cached copy instantly, refresh it in the background */
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }

  if (isLib(u)) {
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") c.put(req, r.clone());
      return r;
    }))));
    return;
  }

  if (isTile(u)) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(TILES).then(c => c.put(req, cp)).then(trimTiles); }
      return r;
    }).catch(() => caches.match(req).then(r => r || Response.error())));
  }
});
