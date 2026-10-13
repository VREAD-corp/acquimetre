# Acquimètre

Done-for-you evaluations for Qualiopi indicators 8 and 11, written from the customer's own course files.
A READ FRANCE SAS service (venture V4-01 of `octave-asset-ventures`).

- **Site:** https://outils.vread.fr/acquimetre/ (GitHub Pages from `docs/`, built by `npm run build`)
- **Price:** 249 € net for 1 to 10 courses; 199 € for Kit Qualiopi buyers (code `KITQ199` from the kit delivery
  e-mail, or a self-declaration). TVA non applicable, art. 293 B du CGI. French businesses only (SIREN).
- **Payments, invoices, uploads, alerts:** `VREAD-corp/octave-checkout` (Apps Script web app, products `eval-8-11`
  and `eval-8-11-kit`, kind `service`, `gas/src/Eval.js`). Terms: `cgv-pro-eval-2026-10-13` (`cgv-pro.html`).

## Order flow

1. The customer pays on `commander.html` (Stripe Payment Element, card only, never a Checkout Session). The
   invoice (F-YYYY-NNNN) and a personal upload link arrive by e-mail; `commande.html` also shows the link.
2. `envoyer.html?commande=…&cle=…` uploads PDF/DOCX/PPTX files (15 MB each, 40 max, 10 courses max), one per
   request, into a private Drive folder per order (the founder's account; never shared).
3. « J'ai tout envoyé » sets the due date (5 working days, French holidays skipped) and e-mails an alert to
   ALERT_EMAIL (Vincent) with the Drive folder link, plus a receipt to the customer.
4. Octave fulfils offline (no LLM at runtime):

   ```bash
   # in octave-checkout (secret in ~/.config/octave/acquimetre-ops.env, mode 600)
   node gas/scripts/eval-ops.mjs list
   node gas/scripts/eval-ops.mjs pull ok_… /path/orders           # writes /path/orders/ok_…/C01/… + order.json
   # in this repo: input/ layout = what pull writes (order.json + Cxx/), see samples/gestion-temps/input
   npx tsx engine/cli.ts extract /path/orders/ok_…                 # work/Cxx/extract.txt to read
   #   write work/Cxx/draft.json (objectives + 3 instruments, each question with its verbatim source quote)
   npx tsx engine/cli.ts check  /path/orders/ok_…                  # acquiz static gates; any failure stops
   npx tsx engine/cli.ts render /path/orders/ok_…                  # DOCX + PDF + CSV + evidence file -> ZIP
   node gas/scripts/eval-ops.mjs deliver ok_… /path/orders/ok_…/output/….zip "summary"
   ```

   (`pull` writes `<dir>/<order>/Cxx/` and `order.json`; move them under `input/` before `extract`.)

## Engine (`engine/`)

- Text extraction and gates come from the in-house parts of `VREAD-corp/acquiz` (`engine/lib/`: PDF/DOCX parsing,
  segmenter, answer presence, quote check, duplicates, item rules), all written by Octave for READ FRANCE SAS.
  **The acquiz PDF writer (`src/lib/pdf/`) is not used.** PPTX extraction is new (`engine/lib/parse/pptx.ts`).
- Documents go through the Kit Qualiopi chain: Markdown → DOCX (`engine/md2docx.mjs`, from
  `qualiopi-kit-content/scripts/md2docx.mjs`) → PDF (LibreOffice headless).
- Per course: positioning test (ind. 8, decision rule), end-of-training evaluation and J+30 check (ind. 11), trainer
  key with cited passages and pages, results sheet per learner, CSV; per order: evidence file + read-me.

## Public sample

`samples/gestion-temps/`: Wikiversité lesson « Gestion professionnelle du temps » (CC BY-SA 4.0, revisions pinned in
`source/wikiversite-gestion-temps.json`, fetched 2026-10-13), laid out as a course PDF + a programme DOCX
(`scripts/make-sample-input.mjs`), then run through the engine: 35 questions, 35/35 gates passed. Published under
`docs/exemple/` with its licence.

## Tracking

`mesure.js` = the octave-checkout master (v:2, bot/webdriver filtering, `?octave_notrack=1`) with the site id fixed
to `acquimetre`; `cro.js` byte-identical; goals `download`, `checkout`, `intake` (`cro-goals.js`). Site whitelisted in
`octave-checkout` `TRACK_SITES_`, in `vread-revenue-lab/tools/cro-sources.json` and in the dashboard. No A/B test
(one price per period, see the experiment).

## Tests

- `npm test`: build + engine tests (PPTX, gates, sample) + site tests (links, JSON-LD, vendored scripts, open build).
- `octave-checkout`: `gas/test/eval.test.ts` (unit) and `npx tsx gas/test/e2e-eval-sandbox.ts <proofDir>` (real Stripe
  sandbox: purchase → upload → alert → offline engine → delivery).
