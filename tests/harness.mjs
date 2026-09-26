/* Loads the solver (the <script id="core"> block of index.html) into a sandbox so it
   can be tested in Node with the public placeholder values. No private data is used. */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) throw new Error("core script not found in index.html");
const ctx = vm.createContext({ Math, Date, JSON, Object, Array, Number, String, Set, Map, WeakMap, Uint8Array, Int32Array, Infinity, isNaN, isFinite, console });
vm.runInContext(m[1] + "\n;globalThis.__core={solve,PLACEHOLDER,buildingSpec,polyArea};", ctx);
export const core = ctx.__core;
export const B0 = core.PLACEHOLDER;

/* Solver options as the app builds them from the sidebar defaults (readOpts + profileValue). */
export function optsFor(profile = "metro", density = "ent", over = {}) {
  const B = B0, P = B.profile[profile], D = B.density[density];
  return Object.assign({
    profile, elec: "EROOM", density, targetMW: P.targetMW, kw: D.kw, setback: P.setback, maxH: P.maxH, maxCov: P.maxCov,
    storeys: P.storeys, sqmRack: D.sqmRack, pue: B.pue[profile][density], liquid: D.liquid, rackKg: D.rackKg, hrPerMW: D.hr,
    bldgMax: P.bldgMax, pond: P.pond, road: P.road, dockApron: B.dockApron, circulation: "auto", oneSide: false, hrLoc: "roof",
    massing: "auto", faceGate: true, ecPos: "auto", padInSetback: true, fenceOn: true, fenceInset: B.fenceInset, clearZone: B.clearZone,
    bandAxis: "auto", mix: null, adminSqm: 0, supportSqm: P.supportSqm, subSqm: B.subSqm || 0, subMargin: B.subMargin,
    roofTiers: B.roofTiers, yardClear: B.yardClear, subAspect: 4, subMinSide: 30, pins: [], subPin: null, customRoads: null, frontPoint: null
  }, over);
}

export const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];

export function solveSite(poly, o, coarse = false) {
  return core.solve(JSON.parse(JSON.stringify(o)), poly, JSON.parse(JSON.stringify(B0)), coarse, null);
}
