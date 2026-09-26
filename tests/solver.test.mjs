/* Solver regression tests, run with `node --test tests/` (Node 20+).
   They use the public placeholder values only. */
import test from "node:test";
import assert from "node:assert/strict";
import { optsFor, rect, solveSite, B0 } from "./harness.mjs";

const SHAPES = {
  "60x80 m": rect(60, 80),
  "100x150 m": rect(100, 150),
  "150x200 m": rect(150, 200),
  "300x400 m": rect(300, 400),
  "triangle": [[0, 0], [220, 0], [0, 180]],
  "L-shape": [[0, 0], [200, 0], [200, 70], [70, 70], [70, 200], [0, 200]],
  "trapezoid": [[0, 0], [260, 0], [200, 140], [40, 140]],
  "60x400 m strip": rect(60, 400),
};
const best = r => r.options[0];
const bldgs = op => (op.placed || []).filter(q => q.kind === "bldg").length;

test("public placeholder profile holds no private data", () => {
  assert.equal(B0.placeholder, true);
  assert.equal(B0.accessKey, undefined);
  assert.equal(B0.cost, undefined, "build cost belongs in the private profile only");
});

/* The first sketch must always show capacity: never a plan of just a
   substation, parking and retention. */
for (const profile of ["metro", "campus"])
  for (const massing of ["auto", "modular"])
    for (const [name, poly] of Object.entries(SHAPES))
      for (const coarse of [true, false])
        test(`${profile} ${massing} ${name}${coarse ? " (quick solve)" : ""} shows capacity`, () => {
          const r = solveSite(poly, optsFor(profile, "ent", { massing }), coarse);
          assert.ok(r.options.length > 0, "at least one option");
          const op = best(r);
          assert.ok(op.it > 0, `best option has IT load (got ${op.it} MW, ${op.type})`);
          assert.ok(op.infill || bldgs(op) > 0, "a campus option places at least one building");
          for (const o of r.options) assert.ok(o.it > 0 || r.options.length === 1, "no zero-MW option ranks among the shown ones");
        });

test("large campus site fits the full target with its substation", () => {
  const o = optsFor("campus");
  const op = best(solveSite(rect(300, 400), o));
  assert.equal(op.it, o.targetMW);
  assert.equal(op.subOK, true);
  assert.equal(op.infill, false);
});

test("small plot recommends infill and flags what is not laid out", () => {
  const op = best(solveSite(rect(100, 150), optsFor("metro")));
  assert.equal(op.type, "infill");
  assert.ok(op.flags.some(f => /^Infill recommended/.test(f)), "infill recommendation flag");
  assert.ok(op.flags.some(f => /substation .* is not laid out/i.test(f)), "substation flag");
  assert.ok(op.flags.some(f => /retention and parking are not laid out/i.test(f)), "retention and parking flag");
});

test("campus modules downsize a building that does not fit at full size", () => {
  const op = best(solveSite(rect(200, 300), optsFor("campus", "ent", { massing: "modular" })));
  assert.ok(op.it > 0 && op.it < 96);
  assert.ok(op.built.some(s => s.downFrom), "a building was reduced");
  assert.ok(op.flags.some(f => /reduced to fit/.test(f)));
  for (const s of op.built) assert.equal(s.m % B0.moduleMW, 0, "reduced sizes are whole modules");
});

test("a building mix is never downsized", () => {
  const mix = [{ mw: 48, dens: "ent", st: 0 }];
  const r = solveSite(rect(150, 200), optsFor("campus", "ent", { massing: "modular", mix }));
  for (const op of r.options) for (const s of op.built) assert.ok(!s.downFrom);
});

test("infill respects the storeys cap when load fits under it", () => {
  const o = optsFor("metro", "ent", { massing: "infill", storeys: 2 });
  const op = best(solveSite(rect(100, 150), o));
  assert.ok(op.it > 0);
  assert.ok(parseInt(op.storeys) <= 2, `storeys ${op.storeys}`);
});

test("infill shows capacity, flagged, when nothing fits under the storeys cap", () => {
  const op = best(solveSite(rect(60, 80), optsFor("metro", "ent", { massing: "infill", storeys: 1 })));
  assert.ok(op.it > 0, "shows the load at the fewest floors that hold any");
  assert.ok(op.flags.some(f => /Storeys cap exceeded/.test(f)));
  assert.equal(op.subOK, true);
});

test("coarse and full solves agree on the headline for a simple site", () => {
  const o = optsFor("campus");
  assert.equal(best(solveSite(rect(300, 400), o, true)).it, best(solveSite(rect(300, 400), o, false)).it);
});

test("spec rows carry the keys the one-pager and Compare read", () => {
  const op = best(solveSite(rect(300, 400), optsFor("campus")));
  const keys = new Set(op.rows.map(r => r[2]));
  for (const k of ["siteArea", "itLoad", "facLoad", "racks", "gfa", "coverageRow", "storeysRow", "subRow", "pondRow", "supportRow"])
    assert.ok(keys.has(k), k);
});
