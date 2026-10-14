#!/usr/bin/env node
/**
 * Lot perf 1 (14/10/2026) : sonde de laboratoire de la vitesse d'apparition
 * des annonces, sur un téléphone simulé (390 x 844, 150 ms d'aller-retour,
 * 1,6 Mbit/s, processeur divisé par 4).
 *
 * Mesure, pour chaque adresse, la première vraie carte d'annonce
 * ([data-testid="search-card-real"]), la photo de la première carte, ou le
 * titre d'une fiche (h1). Chaque adresse porte ?perf_lab=1 : la visite
 * n'entre ni dans la mesure d'audience ni dans la mesure de vitesse
 * (src/lib/labTraffic.ts).
 *
 * Usage :
 *   node scripts/perf/measure-listings.mjs [--runs 3] [--fast] [--budget budget.json] url...
 * Sans url : /annonces et /annonces?ville=Lyon&zone=radius sur guardiens.fr.
 * Sortie : JSON des médianes ; code 1 si une médiane dépasse son budget.
 * Les machines de mesure sont loin de la France : lecture relative seulement.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i === -1) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const runs = Number(opt("--runs", "3"));
const budgetFile = opt("--budget", null);
const fast = flag("--fast");
const urls = args.length ? args : [
  "https://guardiens.fr/annonces",
  "https://guardiens.fr/annonces?ville=Lyon&zone=radius",
];
const budgets = budgetFile ? JSON.parse(readFileSync(budgetFile, "utf8")) : {};

const withLab = (u) => {
  const url = new URL(u);
  url.searchParams.set("perf_lab", "1");
  return url.toString();
};

async function measure(browser, url) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 GuardiensPerfProbe",
  });
  const page = await ctx.newPage();
  if (!fast) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1638 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const t0 = Date.now();
  const out = { url };
  try {
    await page.goto(withLab(url), { waitUntil: "domcontentloaded", timeout: 90_000 });
    const isFiche = /\/(annonces|sits)\/[^/?]+/.test(new URL(url).pathname) && !/\/annonces\/international/.test(url);
    if (isFiche) {
      out.content = await page.waitForSelector("main h1", { timeout: 90_000 }).then(() => Date.now() - t0).catch(() => null);
    } else {
      out.content = await page.waitForSelector('[data-testid="search-card-real"]', { timeout: 90_000 }).then(() => Date.now() - t0).catch(() => null);
      out.photo = await page.waitForFunction(() => {
        const img = document.querySelector('[data-testid="search-card-real"] img');
        return !!img && img.complete && img.naturalWidth > 0;
      }, null, { timeout: 90_000, polling: 100 }).then(() => Date.now() - t0).catch(() => null);
    }
  } finally {
    await ctx.close();
  }
  return out;
}

const median = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const report = [];
let failed = false;
try {
  for (const url of urls) {
    const samples = [];
    for (let i = 0; i < runs; i++) samples.push(await measure(browser, url));
    const row = { url, runs, content_ms: median(samples.map((s) => s.content)), photo_ms: median(samples.map((s) => s.photo)), samples };
    const budget = budgets[new URL(url).pathname + new URL(url).search];
    if (budget && (row.content_ms === null || row.content_ms > budget)) { row.over_budget = budget; failed = true; }
    report.push(row);
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ throttled: !fast, report }, null, 2));
process.exit(failed ? 1 : 0);
