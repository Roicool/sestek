/* node --test via tsx:  npm run search:test */

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeText, tokenize } from "./normalize";
import { rankDocs } from "./rank";
import { kindForPath, titleFromSlug } from "./kinds";
import type { SearchDoc } from "./types";

const docs: SearchDoc[] = [
  { path: "/agentic-ai", title: "Agentic AI", summary: "Autonomous AI agents for customer service.", kind: "product", locale: "en", priority: 100, keywords: ["ai agent", "voice agent"] },
  { path: "/speech-analytics", title: "Speech Analytics", summary: "Analyze 100% of interactions.", kind: "product", locale: "en", priority: 95 },
  { path: "/why-ai-projects-fail-and-how-to-fix-them-blog", title: "Why AI Projects Fail and How to Fix Them", summary: "Agentic AI projects fail for three reasons.", kind: "blog", locale: "en" },
  { path: "/solutions-for-banking", title: "Solutions for Banking", summary: "AI for banks.", kind: "solution", locale: "en", priority: 90, keywords: ["bank", "finance"] },
  { path: "/tr/speech-analytics", title: "Konuşma Analizi", summary: "Çağrı merkezi kalite yönetimi için konuşma analizi.", kind: "product", locale: "tr", priority: 95 },
  { path: "/tr/musteri-dogrulama", title: "Müşteri Doğrulama", summary: "Ses biyometrisi ile kimlik doğrulama.", kind: "product", locale: "tr", priority: 80 },
  { path: "/tr/iletisim-merkezi-performansi-icin-konusma-zekasi-cozumleri", title: "İletişim Merkezi Performansı için Konuşma Zekâsı Çözümleri", summary: "", kind: "solution", locale: "tr", priority: 80 },
];

test("normalizeText folds Turkish letters both ways", () => {
  assert.equal(normalizeText("Sağlık"), "saglik");
  assert.equal(normalizeText("MÜŞTERİ"), "musteri");
  assert.equal(normalizeText("İLETİŞİM"), "iletisim");
  assert.equal(normalizeText("ILIK"), "ilik");          // dotless I → i, not "ilik" via en-US "ılık"
  assert.equal(normalizeText("Konuşma Zekâsı"), "konusma zekasi");
});

test("tokenize drops short tokens and duplicates", () => {
  assert.deepEqual(tokenize("ai  AI a agent"), ["ai", "agent"]);
});

test("curated product outranks a blog post containing the phrase", () => {
  const r = rankDocs(docs, "agentic ai", { locale: "en" });
  assert.equal(r[0].path, "/agentic-ai");
  assert.ok(r.some((d) => d.path.endsWith("-blog")), "blog still appears");
});

test("keywords give recall for aliases", () => {
  const r = rankDocs(docs, "voice agent", { locale: "en" });
  assert.equal(r[0].path, "/agentic-ai");
  assert.equal(rankDocs(docs, "bank", { locale: "en" })[0].path, "/solutions-for-banking");
});

test("Turkish queries work with and without diacritics", () => {
  assert.equal(rankDocs(docs, "musteri dogrulama", { locale: "tr" })[0].path, "/tr/musteri-dogrulama");
  assert.equal(rankDocs(docs, "Müşteri Doğrulama", { locale: "tr" })[0].path, "/tr/musteri-dogrulama");
  assert.equal(rankDocs(docs, "iletisim", { locale: "tr" })[0].path, "/tr/iletisim-merkezi-performansi-icin-konusma-zekasi-cozumleri");
  assert.equal(rankDocs(docs, "konusma", { locale: "tr" })[0].path, "/tr/speech-analytics");
});

test("locale filter hides the other locale", () => {
  assert.ok(rankDocs(docs, "speech", { locale: "tr" }).every((d) => d.locale === "tr"));
  assert.ok(rankDocs(docs, "speech", { locale: "en" }).every((d) => d.locale === "en"));
});

test("highlight ranges point at the query inside the original title", () => {
  const r = rankDocs(docs, "analytics", { locale: "en" })[0];
  assert.equal(r.title.slice(...r.titleMatches[0]), "Analytics");
});

test("no result for garbage", () => {
  assert.equal(rankDocs(docs, "zzzz qqqq").length, 0);
  assert.equal(rankDocs(docs, "a").length, 0);
});

test("kind classification from path", () => {
  assert.equal(kindForPath("/why-ai-projects-fail-and-how-to-fix-them-blog"), "blog");
  assert.equal(kindForPath("/solutions-for-banking"), "solution");
  assert.equal(kindForPath("/tr/bankalar-icin-cozumler"), "solution");
  assert.equal(kindForPath("/knovvu-agent-copilot"), "product");
  assert.equal(kindForPath("/speech-analytics-knovvu"), "product");
  assert.equal(kindForPath("/fibabanka-automated-collection-operations-with-sestek-virtual-agent"), "case-study");
  assert.equal(kindForPath("/tr/hepsiburada-kalite-yonetiminde-verimliligini-nasil-artirdi"), "case-study");
  assert.equal(kindForPath("/site-reliability-engineer"), "career");
  assert.equal(kindForPath("/sestek-vs-nice"), "page");
  assert.equal(titleFromSlug("/tr/knovvu-agent-copilot"), "Knovvu Agent Copilot");
  assert.equal(titleFromSlug("/conversational-ivr"), "Conversational IVR");
});

test("ranking 500 docs stays well under 16ms", () => {
  const big: SearchDoc[] = [];
  for (let i = 0; i < 500; i++) big.push({ ...docs[i % docs.length], path: docs[i % docs.length].path + "-" + i, title: docs[i % docs.length].title + " " + i });
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) rankDocs(big, "speech analytics kalite", {});
  const per = (performance.now() - t0) / 20;
  assert.ok(per < 16, `rank took ${per.toFixed(2)}ms`);
});

test("quick links parse into groups; {contact} drops without a href", async () => {
  const { parseQuickLinks, defaultQuickLinks } = await import("../../data/quick-links");
  const g = parseQuickLinks("A | One | /one | sum\nA | Two | /two\nB | Contact | {contact}\n# skip", "en");
  assert.deepEqual(g.map((x) => x.label), ["A"]);
  assert.equal(g[0].items.length, 2);
  assert.equal(g[0].items[0].summary, "sum");
  const withContact = parseQuickLinks("B | Contact | {contact}", "en", "/contact");
  assert.equal(withContact[0].items[0].path, "/contact");
  assert.ok(defaultQuickLinks("tr").length >= 4);
  assert.ok(defaultQuickLinks("en").flatMap((x) => x.items).every((d) => d.path.startsWith("/")));
});
