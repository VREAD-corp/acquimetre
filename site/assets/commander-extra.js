/* Page Commander d'Acquimètre : affiche le bloc « acheteur du Kit Qualiopi » quand le tarif à 199 € est choisi
 * (?offre=kit le présélectionne), et exige le code OU la déclaration avant tout paiement (le serveur revérifie). */
(function () {
  'use strict';
  var form = document.getElementById('octave-pay');
  if (!form) return;
  var radios = Array.prototype.slice.call(form.querySelectorAll('input[name="product"]'));
  var box = document.getElementById('kit-proof');
  var code = form.elements.kitCode;
  var decl = form.elements.kitDeclared;
  if (/[?&]offre=kit(&|$)/.test(window.location.search)) {
    radios.forEach(function (r) { r.checked = r.value === 'eval-8-11-kit'; });
  }
  var m = /[?&]code=([A-Za-z0-9]{3,20})(&|$)/.exec(window.location.search);
  if (m && code) code.value = m[1].toUpperCase();
  function kit() { return radios.some(function (r) { return r.checked && r.value === 'eval-8-11-kit'; }); }
  function sync() {
    box.hidden = !kit();
    decl.setCustomValidity('');
  }
  radios.forEach(function (r) { r.addEventListener('change', sync); });
  form.addEventListener('octave-validate', function () {
    decl.setCustomValidity(kit() && !code.value.trim() && !decl.checked ? 'Saisissez le code reçu avec le Kit Qualiopi ou cochez la déclaration.' : '');
  });
  sync();
})();
