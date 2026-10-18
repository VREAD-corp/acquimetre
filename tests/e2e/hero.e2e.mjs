// POOLED-READING-01 (rd-hero) in a real browser: ?hero=a hides the excerpt, ?hero=b shows it, the primary CTA stays in
// the first screen on mobile (375×667), no horizontal scroll. Local static server on docs/; ?octave_notrack=1 always.
// BASE=https://outils.vread.fr/acquimetre/ runs the same checks on the live site.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

const DOCS = resolve(import.meta.dirname, '../../docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

test('rd-hero variants a and b, mobile and desktop', async () => {
  let server, base = process.env.BASE;
  if (!base) {
    server = createServer(async (req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/acquimetre\//, '/');
      if (p.endsWith('/')) p += 'index.html';
      try { res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(await readFile(join(DOCS, p))); } catch { res.writeHead(404); res.end(); }
    }).listen(0);
    base = `http://localhost:${server.address().port}/acquimetre/`;
  }
  const browser = await chromium.launch();
  try {
    for (const vp of [{ width: 375, height: 667 }, { width: 1440, height: 900 }]) {
      for (const v of ['a', 'b']) {
        const page = await browser.newPage({ viewport: vp });
        await page.goto(`${base}?hero=${v}&octave_notrack=1`);
        const r = await page.evaluate(() => {
          const f = document.querySelector('[data-hero-excerpt]'), c = document.querySelector('.hero a.btn-primary').getBoundingClientRect();
          return { xp: document.documentElement.getAttribute('data-xp-rd-hero'), shown: getComputedStyle(f).display !== 'none', ctaBottom: c.bottom, sw: document.documentElement.scrollWidth };
        });
        assert.equal(r.xp, v); assert.equal(r.shown, v === 'b', `${vp.width} ${v}`);
        assert.ok(r.ctaBottom <= vp.height, `CTA in first screen at ${vp.width} (${r.ctaBottom})`);
        assert.ok(r.sw <= vp.width, `no horizontal scroll at ${vp.width}`);
        await page.close();
      }
    }
  } finally { await browser.close(); server?.close(); }
});
