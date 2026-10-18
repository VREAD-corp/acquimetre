/* Acquimètre A/B test (read by cro.js, which must load after this file, both in <head> without defer).
 * POOLED-READING-01 (2026-10-19): hero a = current, b = first screen shows a real excerpt of the deliverable. Same id on
 * the 7 reading sites, pooled analysis in vread-revenue-lab. ?hero=b forces b. Home page only; drawn once per tab
 * (sessionStorage). Metric: first CTA click (built in); secondary goal 'sample' (free sample links, cro-goals.js). */
window.OCTAVE_XP = [{
  id: 'rd-hero',
  variants: ['a', 'b'],
  mode: 'tab',
  param: 'hero',
  pages: '^/acquimetre/(index\\.html)?$',
}];
