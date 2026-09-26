/* Static checks on the published files: scripts parse, CDN files are pinned,
   and nothing confidential is in the repository. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const html = readFileSync(join(ROOT, "index.html"), "utf8");

test("both inline scripts parse", () => {
  const blocks = [...html.matchAll(/<script(?: id="core")?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(blocks.length >= 2);
  for (const b of blocks) assert.doesNotThrow(() => new vm.Script(b));
  assert.doesNotThrow(() => new vm.Script(readFileSync(join(ROOT, "sw.js"), "utf8")));
});

test("every CDN library is pinned with an integrity hash", () => {
  const urls = [...html.matchAll(/https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net)\/[^"'\s)]+\.(?:js|css)/g)].map(m => m[0]);
  assert.ok(urls.length >= 5);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const u of new Set(urls)) {
    const tag = html.includes(`src="${u}" integrity="sha384-`) || html.includes(`href="${u}" integrity="sha384-`);
    const dyn = new RegExp(u.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + `"[^\\n]{0,80}sha384-`).test(html);
    const imap = (map.integrity || {})[u];
    assert.ok(tag || dyn || imap, `${u} has no integrity hash`);
  }
});

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    if (f === ".git" || f === "node_modules") continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p); else yield p;
  }
}

test("no private profile or cost files are committed", () => {
  for (const p of walk(ROOT)) {
    const rel = relative(ROOT, p);
    assert.ok(!/PRIVATE/i.test(rel), `${rel} looks like a private file`);
    if (/\.(csv|json)$/i.test(rel) && !rel.startsWith("data/")) assert.fail(`${rel}: profile-like files do not belong in the public repo`);
  }
  assert.ok(!/"accessKey"\s*:\s*"[^"]+"/.test(html), "an access key value is in index.html");
  assert.ok(!/[{,\s"](?:csa|mep)PerMW"?\s*:\s*[1-9]/.test(html), "a build cost value is in index.html");
});

test("site-risk snapshots have the expected shape", () => {
  const g = JSON.parse(readFileSync(join(ROOT, "data/grid-ph.json"), "utf8"));
  const f = JSON.parse(readFileSync(join(ROOT, "data/faults-ph.json"), "utf8"));
  assert.ok(g.subs.length > 100 && g.lines.length > 100);
  assert.ok(g.subs.every(s => s.length === 5 && isFinite(s[0]) && isFinite(s[1])));
  assert.ok(g.lines.every(l => l[0] >= 69 && Array.isArray(l[3]) && l[3].length >= 2));
  assert.ok(f.faults.length > 50 && f.faults.every(x => typeof x.n === "string" && x.c.length >= 2));
});
