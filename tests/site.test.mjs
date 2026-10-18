// Site build tests: closed build (committed docs/) and an open build (SALES_OPEN=true, temp dir): pages, links,
// JSON-LD (Service + 2 Offers, no rating), vendored scripts identical to octave-checkout, checkout config = catalog.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const DOCS = join(ROOT, 'docs');
const GAS_WEB = process.env.OCTAVE_GAS_WEB || resolve(ROOT, '../octave-checkout/gas/web');
const read = (p) => readFileSync(p, 'utf8');
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

function openBuild() {
  const dir = mkdtempSync(join(tmpdir(), 'acq-site-'));
  const cfg = { ...JSON.parse(read(join(ROOT, 'sales.config.json'))), SALES_OPEN: true };
  writeFileSync(join(dir, 'sales.json'), JSON.stringify(cfg));
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: ROOT, env: { ...process.env, SALES_CONFIG: join(dir, 'sales.json'), SITE_OUT: join(dir, 'out') }, stdio: 'pipe' });
  return join(dir, 'out');
}

test('committed build: offer, legal pages and sample; buy UI only when SALES_OPEN; every internal link resolves', () => {
  for (const f of ['index.html', 'cgv-pro.html', 'mentions-legales.html', 'confidentialite.html', '404.html', 'sitemap.xml', 'robots.txt', 'mesure.js', 'cro.js', 'cro-goals.js']) assert.ok(existsSync(join(DOCS, f)), f);
  const open = JSON.parse(read(join(ROOT, 'sales.config.json'))).SALES_OPEN === true;
  for (const f of ['commander.html', 'commande.html', 'envoyer.html', 'checkout/pay.js']) assert.equal(existsSync(join(DOCS, f)), open, f);
  for (const page of readdirSync(DOCS).filter((f) => f.endsWith('.html'))) {
    const html = read(join(DOCS, page));
    for (const [, href] of html.matchAll(/href="([^"#:?]+\.(?:html|pdf|zip|css|svg|txt))"/g)) assert.ok(existsSync(join(DOCS, href)), `${page} -> ${href}`);
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /[a-zé»)] [?;!]/, `${page}: breaking space before ? ; !`);
  }
});

test('home page: JSON-LD Service with the two prices (249 / 199 EUR, business only), FAQ, no rating or review', () => {
  const html = read(join(DOCS, 'index.html'));
  const [svc, faq] = ld(html);
  assert.equal(svc['@type'], 'Service');
  assert.deepEqual(svc.offers.map((o) => [o.price, o.priceCurrency, o.eligibleCustomerType]), [['249.00', 'EUR', 'https://schema.org/Business'], ['199.00', 'EUR', 'https://schema.org/Business']]);
  assert.equal(faq['@type'], 'FAQPage');
  assert.doesNotMatch(html, /aggregateRating|"review"/);
  assert.match(html, /269 non-conformit|en a causé 269/);
  assert.match(html, /CC BY-SA 4\.0/);
  assert.match(html, /exemple\/acquimetre-evaluations-8-11-exemple-gestion-temps\.zip/);
});

test('tracking: mesure.js = the octave-checkout master with the site id fixed to acquimetre; cro.js byte-identical', { skip: !existsSync(join(GAS_WEB, 'mesure.js')) }, () => {
  const master = read(join(GAS_WEB, 'mesure.js'));
  const ours = read(join(DOCS, 'mesure.js'));
  assert.match(ours, /site:'acquimetre'/);
  assert.match(ours, /v:2/);
  assert.match(ours, /octave_notrack/);
  assert.equal(ours.split('\n').length, master.split('\n').length);
  assert.equal(read(join(DOCS, 'cro.js')), read(join(GAS_WEB, 'cro.js')));
  assert.match(read(join(DOCS, 'index.html')), /<script src="cro\.js" data-site="acquimetre" data-api="https:\/\/script\.google\.com\/macros\/s\/AKfycbzD1IRL8Q[^"]+\/exec" data-hosts="outils\.vread\.fr"/);
});

test('open build: commander (2 offers, rights attestation, kit proof, CSP), commande (upload link), envoyer; checkout config = catalog prices and terms', () => {
  const out = openBuild();
  const c = read(join(out, 'commander.html'));
  assert.match(c, /name="product" value="eval-8-11" checked/);
  assert.match(c, /name="product" value="eval-8-11-kit"/);
  assert.match(c, /name="rightsAttested" data-octave-extra="bool" required/);
  assert.match(c, /name="kitDeclared" data-octave-extra="bool"/);
  assert.match(c, /name="courses" data-octave-extra min="1" max="10"/);
  assert.match(c, /Content-Security-Policy" content="default-src 'self'; script-src 'self' https:\/\/js\.stripe\.com/);
  assert.match(c, /version du 13 octobre 2026/);
  const cfgJs = read(join(out, 'checkout/checkout-config.js'));
  const cfg = JSON.parse(cfgJs.slice(cfgJs.indexOf('=') + 1).trim().replace(/;$/, ''));
  assert.deepEqual(cfg.offers, { 'eval-8-11': { amount: 24900, termsVersion: 'cgv-pro-eval-2026-10-13' }, 'eval-8-11-kit': { amount: 19900, termsVersion: 'cgv-pro-eval-2026-10-13' } });
  assert.equal(cfg.orderPage, 'commande.html');
  const order = read(join(out, 'commande.html'));
  assert.ok(order.indexOf('checkout/eval-order.js') < order.indexOf('checkout/order.js'), 'eval-order.js must read the secret before order.js removes it');
  assert.match(read(join(out, 'envoyer.html')), /id="upload-done"/);
  if (existsSync(join(GAS_WEB, 'pay.js'))) for (const f of ['pay.js', 'order.js']) assert.equal(read(join(out, 'checkout', f)), read(join(GAS_WEB, f)), f);
});

test('CRO pass 2026-10-18: rd-hero (POOLED-READING-01), real excerpt, breadcrumbs, no Jalonel link, sitemap lastmod', async () => {
  const xp = read(join(ROOT, 'site/assets/xp.js'));
  const OCTAVE_XP = new Function('window', xp + '; return window.OCTAVE_XP;')({});
  const rd = OCTAVE_XP.find((e) => e.id === 'rd-hero');
  assert.deepEqual([rd.variants, rd.mode, rd.param], [['a', 'b'], 'tab', 'hero']);
  assert.ok(new RegExp(rd.pages).test('/acquimetre/') && new RegExp(rd.pages).test('/acquimetre/index.html') && !new RegExp(rd.pages).test('/acquimetre/commander.html'));
  const home = read(join(DOCS, 'index.html'));
  // xp.js then cro.js, both blocking in <head>, so <html data-xp-rd-hero> is set before the first paint.
  const head = home.slice(0, home.indexOf('</head>'));
  assert.ok(head.indexOf('<script src="xp.js"></script>') > 0 && head.indexOf('<script src="xp.js"></script>') < head.indexOf('<script src="cro.js"'));
  assert.doesNotMatch(head, /<script src="cro\.js"[^>]*defer/);
  assert.match(home, /<figure class="hero-excerpt" data-hero-excerpt>/);
  // The excerpt is verbatim from the sample's draft (questions, key, quotes).
  const { HERO_EXCERPT: x } = await import('../site/content.mjs');
  const draft = JSON.parse(read(join(ROOT, 'samples/gestion-temps/work/C01/draft.json')));
  const [i1, i2] = draft.positioning.items;
  assert.equal(x.q1, i1.question); assert.equal(x.q2, i2.question);
  assert.deepEqual([...x.q1choices].sort(), [...i1.choices].sort());
  assert.equal(x.q1choices['abcd'.indexOf(x.q1key)], i1.answer);
  assert.equal(x.q2key, i2.answer); assert.equal(x.q1quote, i1.source_quote); assert.equal(x.q2quote, i2.source_quote);
  for (const page of readdirSync(DOCS).filter((f) => f.endsWith('.html'))) assert.doesNotMatch(read(join(DOCS, page)), /jalonel/i, page);
  assert.match(home, /href="https:\/\/outils\.vread\.fr\/a-propos\/"/);
  const cgv = read(join(DOCS, 'cgv-pro.html'));
  assert.match(cgv, /<nav class="crumbs wrap" aria-label="Fil d’Ariane">/);
  assert.ok(ld(cgv).some((j) => j['@type'] === 'BreadcrumbList' && j.itemListElement.length === 3));
  const faq = ld(home).find((j) => j['@type'] === 'FAQPage');
  const visible = [...home.matchAll(/<details id="q-[a-z]+"><summary>([^<]+)<\/summary>/g)].map((m) => m[1]);
  assert.equal(faq.mainEntity.length, visible.length);
  for (const [, d] of read(join(DOCS, 'sitemap.xml')).matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) assert.match(d, /^2026-\d\d-\d\d$/);
});
