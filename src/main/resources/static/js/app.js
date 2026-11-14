/*
 * Comportamentos da interface. Fica em arquivo próprio (e não inline nos templates) para que a
 * Content-Security-Policy possa usar script-src 'self', sem 'unsafe-inline'.
 */
(function () {
  'use strict';

  // Altura das barras do dashboard: valor vem em data-height (%). Definir style via JS não é bloqueado pela CSP.
  document.querySelectorAll('.bar[data-height]').forEach(function (bar) {
    var pct = parseFloat(bar.getAttribute('data-height'));
    if (!isNaN(pct)) { bar.style.height = Math.max(0, Math.min(100, pct)) + '%'; }
  });

  // Confirmação antes de enviar formulários com data-confirm="mensagem".
  document.addEventListener('submit', function (event) {
    var message = event.target && event.target.getAttribute && event.target.getAttribute('data-confirm');
    if (message && !window.confirm(message)) { event.preventDefault(); }
  });

  // Formulário de produto: botão "Adicionar ingrediente" clona a última linha da receita.
  var body = document.getElementById('recipe-rows');
  var button = document.getElementById('add-recipe-row');
  if (body && button) {
    button.addEventListener('click', function () {
      var rows = body.querySelectorAll('tr');
      var next = rows.length;
      var copy = rows[rows.length - 1].cloneNode(true);
      copy.querySelectorAll('select, input').forEach(function (el) {
        ['name', 'id'].forEach(function (attr) {
          var value = el.getAttribute(attr);
          if (value) {
            el.setAttribute(attr, value.replace(/lines\[\d+\]|lines\d+/, function (m) {
              return m.charAt(5) === '[' ? 'lines[' + next + ']' : 'lines' + next;
            }));
          }
        });
        if (el.tagName === 'SELECT') { el.selectedIndex = 0; } else { el.value = ''; }
      });
      body.appendChild(copy);
    });
  }
})();
