#!/usr/bin/env node
// Builds the INPUT of the public sample order, as a training organisation would send it: a course support (PDF)
// and a programme sheet (DOCX), from the Wikiversité lesson « Gestion professionnelle du temps »
// (CC BY-SA 4.0, revisions pinned in samples/gestion-temps/source/wikiversite-gestion-temps.json, fetched
// 2026-10-13 through the MediaWiki API). Changes made: navigation boxes, images and edit links removed; the
// chapters are put in the lesson's order; a credits page is added. The quiz pages of the lesson are NOT used.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { markdownToDocx } from '../engine/md2docx.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SAMPLE = join(ROOT, 'samples/gestion-temps');
const pages = JSON.parse(readFileSync(join(SAMPLE, 'source/wikiversite-gestion-temps.json'), 'utf8'));
const byName = Object.fromEntries(pages.map((p) => [p.title.split('/').slice(1).join('/') || 'index', p]));
const CHAPTERS = ['Historique', 'Objectifs et organisation de la gestion du temps', 'Méthode des paquets de 90 minutes', 'Le pendulage', 'La méthode Nerac', 'QQOQCCP', 'Le principe de Pareto', "L'analyse ABC", "La grille d'auto analyse du temps", 'Outils de gestion du temps'];
const SOURCE_URL = 'https://fr.wikiversity.org/wiki/Gestion_professionnelle_du_temps';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Wiki HTML -> printable HTML: no style blocks, no navigation boxes, no images, no links (text kept). */
function clean(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<div style="display:none;">[\s\S]*?<\/div>/g, '')
    .replace(/<figure[\s\S]*?<\/figure>/g, '')
    .replace(/<img[^>]*>/g, '')
    .replace(/<sup[^>]*class="reference"[\s\S]*?<\/sup>/g, '')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, '$1');
}

const chapterHtml = CHAPTERS.map((name, i) => {
  const p = byName[name];
  if (!p) throw new Error(`missing page ${name}`);
  return `<section class="chap"><h1>Chapitre ${i + 1}. ${esc(name)}</h1>\n${clean(p.html)}</section>`;
}).join('\n');

const credits = `<section class="credits">
<p class="kicker">Support de cours</p>
<h1 class="cover">Gestion professionnelle du temps</h1>
<p>10 chapitres : historique, enjeux et pertes de temps, paquets de 90 minutes, pendulage, méthode NERAC, QQOQCCP, principe de Pareto, analyse ABC, grille d’auto-analyse du temps, outils de planification.</p>
<h2>Source et licence</h2>
<p>Texte : leçon « Gestion professionnelle du temps » de Wikiversité, ${esc(SOURCE_URL)}, par les contributeurs de Wikiversité (historique des pages sur le site). Licence Creative Commons Attribution – Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/deed.fr.</p>
<p>Révisions utilisées (extraites le 13/10/2026) : ${CHAPTERS.map((n) => `${esc(n)} (révision ${byName[n].revid})`).join(' ; ')}.</p>
<p>Modifications : boîtes de navigation, images et liens retirés ; chapitres mis dans l’ordre de la leçon. Ce document sert d’exemple d’entrée au service Acquimètre (READ FRANCE SAS) ; il est diffusé sous la même licence CC BY-SA 4.0.</p>
</section>`;

const css = `@page{size:A4;margin:16mm 16mm 18mm}*{font-variant-ligatures:none}body{font-family:"DejaVu Sans",Arial,sans-serif;font-size:10.5pt;line-height:1.45;color:#111}
h1{font-size:16pt;margin:0 0 8pt;color:#1F4E79}h2{font-size:13pt;margin:14pt 0 6pt}h3{font-size:11.5pt;margin:10pt 0 4pt}
.chap{page-break-before:always}.cover{font-size:24pt;margin-top:40mm}.kicker{margin-top:30mm;color:#555;text-transform:uppercase;letter-spacing:.08em}
.noprint,#RealTitleBanner,.mw-editsection,.mw-references-wrap,.reflist,.navbox{display:none!important}
*{float:none!important;max-width:100%!important}div,table{width:auto!important;margin-left:0!important}
table{border-collapse:collapse;margin:6pt 0}td,th{border:1px solid #999;padding:3pt 6pt;font-size:9.5pt;vertical-align:top}`;
const supportHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Gestion professionnelle du temps – support de cours</title><style>${css}</style></head><body>${credits}\n${chapterHtml}</body></html>`;

const out = join(SAMPLE, 'input/C01');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('**/*', (r) => r.abort());
  await page.setContent(supportHtml, { waitUntil: 'load' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#666">Gestion professionnelle du temps – Wikiversité, CC BY-SA 4.0 – page <span class="pageNumber"></span>/<span class="totalPages"></span></div>', margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' } });
  writeFileSync(join(out, 'support-gestion-professionnelle-du-temps.pdf'), pdf);
} finally {
  await browser.close();
}

// Programme sheet (what the trainer writes in his « fiche programme »): presentation, objectives and
// prerequisites quoted from the lesson, plan, duration and audience given as an example.
const txt = (name) => byName[name].extract.trim();
const programme = `# Programme : Gestion professionnelle du temps

*Exemple de fiche programme construite pour l’échantillon Acquimètre à partir de la leçon Wikiversité « Gestion professionnelle du temps » (CC BY-SA 4.0). La durée, le public et les modalités sont des valeurs d’exemple.*

## Présentation

${txt('Présentation de la leçon')}

## Objectifs (texte de la leçon)

${txt('Objectifs').split('\n').filter(Boolean).map((l) => `- ${l}`).join('\n')}

## Prérequis (texte de la leçon)

${txt('Prérequis conseillés')}

## Public, durée et modalités (exemple)

- Public : salariés, managers et assistants de toute fonction.
- Durée : 7 heures (1 jour), en présentiel ou à distance.
- Évaluation : test de positionnement à l’entrée, évaluation des acquis en fin de formation, évaluation à froid à J+30.

## Plan

${CHAPTERS.map((n, i) => `${i + 1}. ${n}`).join('\n')}

## Source et licence

Leçon « Gestion professionnelle du temps » de Wikiversité (${SOURCE_URL}), contributeurs de Wikiversité, licence CC BY-SA 4.0. Pages « Présentation de la leçon » (révision ${byName['Présentation de la leçon'].revid}), « Objectifs » (révision ${byName.Objectifs.revid}) et « Prérequis conseillés » (révision ${byName['Prérequis conseillés'].revid}), extraites le 13/10/2026.
`;
writeFileSync(join(out, 'programme-gestion-professionnelle-du-temps.docx'), await markdownToDocx(programme, { title: 'Programme – Gestion professionnelle du temps', footerText: 'Exemple Acquimètre – texte Wikiversité CC BY-SA 4.0', description: 'Fiche programme d’exemple' }));
writeFileSync(join(SAMPLE, 'input/order.json'), JSON.stringify({
  order_id: 'exemple-gestion-temps',
  company: 'Organisme de formation (exemple)',
  courses: 1,
  sample: true,
  files: [
    { course: 1, course_title: 'Gestion professionnelle du temps', file: 'C01/programme-gestion-professionnelle-du-temps.docx' },
    { course: 1, course_title: 'Gestion professionnelle du temps', file: 'C01/support-gestion-professionnelle-du-temps.pdf' },
  ],
}, null, 2) + '\n');
console.log('sample input written to', join(SAMPLE, 'input'));
