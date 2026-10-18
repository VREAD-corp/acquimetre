#!/usr/bin/env node
// Static build of the Acquimètre site: site/ -> docs/ (GitHub Pages, served at https://outils.vread.fr/acquimetre/).
// The buy UI (commander, commande, envoyer pages and the checkout scripts) exists only when sales.config.json has
// SALES_OPEN true. SALES_CONFIG and SALES_ALLOW_TEST=1 let the e2e tests build against a sandbox endpoint (pk_test_).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ABOUT_LABEL, ABOUT_URL, BRAND, CONTACT, SITE, SITE_BASE, SITE_ORIGIN, TERMS_DATE, TERMS_VERSION, UPDATED, commandeBody, commanderBody, envoyerBody, faqItems, homeBody } from '../site/content.mjs';
import { execFileSync } from 'node:child_process';
import { cgvBody, mentionsBody, privacyBody } from '../site/legal.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(process.env.SITE_OUT || join(ROOT, 'docs'));
const ENDPOINT_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/;

export function loadSalesConfig() {
  const file = process.env.SALES_CONFIG || join(ROOT, 'sales.config.json');
  const c = JSON.parse(readFileSync(file, 'utf8'));
  const fail = (m) => { throw new Error(`${file}: ${m}`); };
  if (typeof c.SALES_OPEN !== 'boolean') fail('SALES_OPEN must be true or false');
  if (c.VAT !== 'franchise293B') fail("VAT must be 'franchise293B' (prices are net)");
  if (!c.products || c.products['eval-8-11'] !== 24900 || c.products['eval-8-11-kit'] !== 19900) fail('products must be {eval-8-11: 24900, eval-8-11-kit: 19900} (Config.js of octave-checkout is the authority)');
  if (c.product !== 'eval-8-11' || c.amount !== c.products['eval-8-11']) fail('product/amount must be the default offer eval-8-11');
  if (c.SALES_OPEN) {
    const test = process.env.SALES_ALLOW_TEST === '1';
    if (!ENDPOINT_RE.test(c.endpoint ?? '') && !(test && /^https?:\/\/[^\s"'<>]+\/exec$/.test(c.endpoint ?? ''))) fail('SALES_OPEN=true needs the Apps Script /exec endpoint');
    if (!/^pk_live_[A-Za-z0-9]+$/.test(c.publishableKey ?? '') && !(test && /^pk_test_[A-Za-z0-9]+$/.test(c.publishableKey ?? ''))) fail('SALES_OPEN=true needs a live publishable key');
  }
  return c;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** French typography in TEXT nodes only (never inside tags, scripts or styles): no-break space before ? : ; ! » and after «. */
export function frType(html) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/g).map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(/ ([?:;!»])/g, ' $1').replace(/« /g, '« ');
  }).join('');
}

const SALES = loadSalesConfig();
const OPEN = SALES.SALES_OPEN === true;
const CRO_API = OPEN || ENDPOINT_RE.test(SALES.endpoint ?? '') ? SALES.endpoint : 'https://script.google.com/macros/s/AKfycbzD1IRL8QALluKGZxgGiORFP6-DkC_qFJYR9aOxZiimxa06nbCqpzUI-9iLblp6V2VY/exec';
const CRO_CTA = "[data-cta],a[href*='commander'],#pay-button,#upload-done";
const origin = (u) => { try { return new URL(u).origin; } catch { return ''; } };
const extraOrigin = (() => { const o = origin(SALES.endpoint); return o && o !== 'https://script.google.com' ? ` ${o}` : ''; })();
const CHECKOUT_CSP = `default-src 'self'; script-src 'self' https://js.stripe.com https://*.js.stripe.com; frame-src https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://link.com https://*.link.com; connect-src 'self' https://script.google.com https://script.googleusercontent.com${extraOrigin} https://api.stripe.com https://link.com https://*.link.com; img-src 'self' data: https://*.stripe.com https://*.link.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`;
const PLAIN_CSP = `default-src 'self'; script-src 'self'; connect-src 'self' https://script.google.com https://script.googleusercontent.com${extraOrigin}; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`;

// The sample deliverable (built by `npm run sample`) and its input support are published under /exemple/.
const SAMPLE_DIR = join(ROOT, 'samples/gestion-temps');
const manifest = JSON.parse(readFileSync(join(SAMPLE_DIR, 'output/manifest.json'), 'utf8'));
const sampleOut = join(SAMPLE_DIR, 'output', manifest.zip.replace(/\.zip$/, ''));
const zipBytes = statSync(join(SAMPLE_DIR, 'output', manifest.zip)).size;
const check = JSON.parse(readFileSync(join(SAMPLE_DIR, 'work/C01/check.json'), 'utf8'));
const extract = JSON.parse(readFileSync(join(SAMPLE_DIR, 'work/C01/extract.json'), 'utf8'));
const sample = {
  zip: manifest.zip,
  zipKb: Math.round(zipBytes / 1024),
  files: manifest.files.length,
  questions: check.items.length,
  words: extract.files.find((f) => f.kind === 'pdf').words.toLocaleString('fr-FR').replace(/\s/g, ' '),
};
const prices = { full: SALES.products['eval-8-11'], kit: SALES.products['eval-8-11-kit'], open: OPEN, sample };

const HUB = 'https://outils.vread.fr/';
/** Breadcrumb trail: outils.vread.fr > Acquimètre > page (crumb = page label, '' on the home). */
function crumbs(path, crumb) {
  const items = [['outils.vread.fr', HUB], [BRAND, SITE]];
  if (crumb) items.push([crumb, SITE + path]);
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) };
  const html = crumb ? `<nav class="crumbs wrap" aria-label="Fil d’Ariane"><a href="${HUB}">outils.vread.fr</a> › <a href="./">${BRAND}</a> › <span aria-current="page">${esc(crumb)}</span></nav>\n` : '';
  return { ld, html };
}

function layout({ path, title, description, body, jsonld = [], noindex = false, head = '', tail = '', crumb = '' }) {
  const url = SITE + path;
  const bc = crumbs(path, crumb);
  if (!noindex) jsonld = [...jsonld, bc.ld];
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#0f5c4d">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="styles.css">
${head}<script src="mesure.js" defer></script>
<script src="xp.js"></script>
<script src="cro.js" data-site="acquimetre" data-api="${CRO_API}" data-hosts="outils.vread.fr" data-cta="${CRO_CTA}"></script>
<script src="cro-goals.js" defer></script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="top"><div class="wrap">
  <a class="brand" href="./"><img src="favicon.svg" width="28" height="28" alt="">${BRAND}<span class="by">par READ FRANCE</span></a>
  <nav class="main" aria-label="Navigation principale"><a href="./#exemple">Exemple</a><a href="./#prix">Prix</a><a href="./#questions">Questions</a>${OPEN ? '<a href="commander.html">Commander</a>' : ''}</nav>
</div></header>
<main id="main">
${bc.html}${frType(body)}
</main>
<footer class="foot"><div class="wrap">
  <p><strong>${BRAND}</strong> : évaluations Qualiopi indicateurs 8 et 11 rédigées à partir de vos supports. Un service de READ FRANCE SAS (SIREN 988 741 773), 11 rue Rouvet, 75019 Paris. Contact : <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
  <p class="foot-links"><a href="mentions-legales.html">Mentions légales</a><a href="cgv-pro.html">CGV professionnels</a><a href="confidentialite.html">Confidentialité</a><a href="${ABOUT_URL}">${ABOUT_LABEL}</a><a href="https://outils.vread.fr/">Autres outils de lecture de READ FRANCE</a></p>
  <p class="small">« Qualiopi » est une marque de l’État, citée à titre descriptif. Ni ce site ni ses documents ne sont édités ou validés par l’État ou par un certificateur.</p>
</div></footer>
${tail}</body>
</html>
`;
}

const serviceLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': SITE + '#service',
  name: 'Acquimètre : évaluations Qualiopi indicateurs 8 et 11',
  serviceType: 'Rédaction de tests de positionnement et d’évaluations des acquis pour organismes de formation',
  description: 'Pour 1 à 10 formations : test de positionnement, évaluation de fin de formation et évaluation à J+30 rédigés à partir des supports de cours du client, avec corrigés, barèmes, passages cités et dossier de preuves. Livraison par e-mail sous 5 jours ouvrés.',
  url: SITE,
  areaServed: { '@type': 'Country', name: 'France' },
  audience: { '@type': 'BusinessAudience', name: 'Organismes de formation certifiés ou candidats Qualiopi' },
  provider: { '@type': 'Organization', '@id': 'https://outils.vread.fr/#org', name: 'READ FRANCE SAS', url: 'https://outils.vread.fr/', email: CONTACT, address: { '@type': 'PostalAddress', streetAddress: '11 rue Rouvet', postalCode: '75019', addressLocality: 'Paris', addressCountry: 'FR' } },
  offers: [
    { '@type': 'Offer', name: 'Tarif standard, 1 à 10 formations', price: (prices.full / 100).toFixed(2), priceCurrency: 'EUR', availability: OPEN ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder', url: SITE + (OPEN ? 'commander.html' : ''), eligibleCustomerType: 'https://schema.org/Business', seller: { '@type': 'Organization', name: 'READ FRANCE SAS' } },
    { '@type': 'Offer', name: 'Tarif acheteurs du Kit Qualiopi, 1 à 10 formations', price: (prices.kit / 100).toFixed(2), priceCurrency: 'EUR', availability: OPEN ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder', url: SITE + (OPEN ? 'commander.html?offre=kit' : ''), eligibleCustomerType: 'https://schema.org/Business', seller: { '@type': 'Organization', name: 'READ FRANCE SAS' } },
  ],
};
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems(prices).map(([, q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

const PAGES = [
  { path: '', file: 'index.html', src: ['site/content.mjs'], title: 'Évaluations Qualiopi 8 et 11 sur vos supports | Acquimètre', description: `Test de positionnement, évaluation de fin de formation et à J+30, avec corrigés et sources, pour 1 à 10 formations. ${prices.full / 100} € net, livraison sous 5 jours ouvrés. Exemple complet téléchargeable.`, body: homeBody(prices), jsonld: [serviceLd, faqLd] },
  { path: 'cgv-pro.html', file: 'cgv-pro.html', src: ['site/legal.mjs'], crumb: 'CGV professionnels', title: 'Conditions générales de vente aux professionnels – Acquimètre', description: `CGV B2B de la prestation Acquimètre (évaluations Qualiopi indicateurs 8 et 11), version du ${TERMS_DATE}, référence ${TERMS_VERSION}.`, body: cgvBody(prices) },
  { path: 'mentions-legales.html', file: 'mentions-legales.html', src: ['site/legal.mjs'], crumb: 'Mentions légales', title: 'Mentions légales – Acquimètre', description: 'Éditeur, hébergement et licences du site Acquimètre (READ FRANCE SAS).', body: mentionsBody() },
  { path: 'confidentialite.html', file: 'confidentialite.html', src: ['site/legal.mjs'], crumb: 'Confidentialité', title: 'Confidentialité – Acquimètre', description: 'Données de commande, supports de cours (supprimés 90 jours après la livraison) et mesure d’audience sans cookie.', body: privacyBody(prices) },
  { path: '404.html', file: '404.html', title: 'Page introuvable – Acquimètre', description: 'Page introuvable.', body: '<section class="wrap"><h1>Page introuvable</h1><p><a href="./">Retour à l’accueil d’Acquimètre</a></p></section>', noindex: true },
];
if (OPEN) {
  PAGES.push(
    { path: 'commander.html', file: 'commander.html', crumb: 'Commander', title: 'Commander Acquimètre (vente aux professionnels)', description: `Commande des évaluations Qualiopi indicateurs 8 et 11 : ${prices.full / 100} € net, ou ${prices.kit / 100} € pour les acheteurs du Kit Qualiopi. Paiement par carte avec Stripe.`, body: commanderBody(prices), noindex: true, head: `<meta http-equiv="Content-Security-Policy" content="${CHECKOUT_CSP}">\n`, tail: '<script src="checkout/checkout-config.js"></script>\n<script src="https://js.stripe.com/v3/"></script>\n<script src="checkout/commander-extra.js"></script>\n<script src="checkout/pay.js"></script>\n' },
    { path: 'commande.html', file: 'commande.html', title: 'Votre commande Acquimètre', description: 'Confirmation du paiement et lien d’envoi des supports.', body: commandeBody(), noindex: true, head: `<meta http-equiv="Content-Security-Policy" content="${PLAIN_CSP}">\n<meta name="referrer" content="no-referrer">\n`, tail: '<script src="checkout/checkout-config.js"></script>\n<script src="checkout/eval-order.js"></script>\n<script src="checkout/order.js"></script>\n' },
    { path: 'envoyer.html', file: 'envoyer.html', title: 'Envoyer vos supports de cours – Acquimètre', description: 'Dépôt sécurisé des supports de cours d’une commande Acquimètre.', body: envoyerBody(), noindex: true, head: `<meta http-equiv="Content-Security-Policy" content="${PLAIN_CSP}">\n<meta name="referrer" content="no-referrer">\n`, tail: '<script src="checkout/checkout-config.js"></script>\n<script src="checkout/upload.js"></script>\n' },
  );
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'exemple'), { recursive: true });
const write = (rel, content) => { mkdirSync(dirname(join(OUT, rel)), { recursive: true }); writeFileSync(join(OUT, rel), content); };
for (const p of PAGES) write(p.file, layout(p));
for (const f of ['styles.css', 'favicon.svg', 'mesure.js', 'cro.js', 'cro-goals.js', 'xp.js']) copyFileSync(join(ROOT, 'site/assets', f), join(OUT, f));
if (OPEN) {
  for (const f of ['pay.js', 'order.js']) { mkdirSync(join(OUT, 'checkout'), { recursive: true }); copyFileSync(join(ROOT, 'site/checkout', f), join(OUT, 'checkout', f)); }
  for (const f of ['commander-extra.js', 'eval-order.js', 'upload.js']) copyFileSync(join(ROOT, 'site/assets', f), join(OUT, 'checkout', f));
  const offers = { 'eval-8-11': { amount: prices.full, termsVersion: TERMS_VERSION }, 'eval-8-11-kit': { amount: prices.kit, termsVersion: TERMS_VERSION } };
  write('checkout/checkout-config.js', `// Generated by scripts/build.mjs from sales.config.json. Public by design.\nwindow.OCTAVE_PAY = ${JSON.stringify({ endpoint: SALES.endpoint, publishableKey: SALES.publishableKey, product: 'eval-8-11', offers, currency: 'eur', termsVersion: TERMS_VERSION, termsUrl: `${SITE}cgv-pro.html`, orderPage: 'commande.html', payLabel: 'Payer {prix} et recevoir le lien d’envoi', laterText: 'Si vous fermez cette page, votre commande est tout de même enregistrée dans les 10 minutes : la facture et le lien d’envoi de vos supports arrivent par e-mail.', quotesEnabled: false })};\n`);
}
// Sample: the full ZIP, the main PDFs and the input support (CC BY-SA 4.0).
copyFileSync(join(SAMPLE_DIR, 'output', manifest.zip), join(OUT, 'exemple', manifest.zip));
for (const f of ['dossier-preuves-indicateurs-8-11.pdf']) copyFileSync(join(sampleOut, f), join(OUT, 'exemple', f));
for (const f of ['C01-1-positionnement-stagiaire.pdf', 'C01-2-fin-de-formation-stagiaire.pdf', 'C01-4-corriges-baremes-sources.pdf']) copyFileSync(join(sampleOut, 'C01-gestion-professionnelle-du-temps', f), join(OUT, 'exemple', f));
copyFileSync(join(SAMPLE_DIR, 'input/C01/support-gestion-professionnelle-du-temps.pdf'), join(OUT, 'exemple', 'support-gestion-professionnelle-du-temps.pdf'));
write('exemple/LICENCE.txt', 'Les fichiers de ce dossier sont tirés de la leçon « Gestion professionnelle du temps » de Wikiversité\n(https://fr.wikiversity.org/wiki/Gestion_professionnelle_du_temps), contributeurs de Wikiversité,\net sont diffusés sous licence Creative Commons Attribution - Partage dans les mêmes conditions 4.0\n(https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Adaptation : READ FRANCE SAS (Acquimètre), 13/10/2026.\n');
const indexable = PAGES.filter((p) => !p.noindex);
// lastmod = date of the last commit that touched the page's source (today if it has uncommitted changes); UPDATED
// when git is unavailable.
function lastmod(files) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', ...files], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: ROOT, encoding: 'utf8' }).trim() || UPDATED;
  } catch { return UPDATED; }
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `<url><loc>${SITE}${p.path}</loc><lastmod>${lastmod(p.src || ['site'])}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
write('.nojekyll', '');
if (!existsSync(join(OUT, 'index.html'))) throw new Error('no index');
console.log(`built ${PAGES.length} pages into ${OUT} (SALES_OPEN=${OPEN}) for ${SITE_ORIGIN}${SITE_BASE}`);
