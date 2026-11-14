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
  // ------------------------------------------------------------------ novo pedido (htmx)
  // Cada clique no carrinho (+, −, remover, adicionar produto, categoria) vira um POST via htmx que troca só os
  // pedaços da tela que mudaram, em vez de recarregar a página. Sem JavaScript (ou sem htmx) os mesmos botões
  // continuam funcionando como submit normal do formulário (POST + redirect).
  //
  // As ações passam por uma fila própria (e não por hx-post nos botões) porque os botões são substituídos a cada
  // resposta: o htmx descarta requisições enfileiradas de elementos que já saíram do DOM, e toques rápidos em "+"
  // se perderiam. Aqui cada ação sai na ordem, uma por vez, usando o formulário (que nunca é trocado) como origem.
  var orderForm = document.getElementById('order-form');
  if (orderForm && window.htmx) {
    var updateUrl = orderForm.getAttribute('action');
    var alertBox = document.getElementById('order-alert');
    var queue = Promise.resolve();

    var send = function (op) {
      var target = op.indexOf('category:') === 0 ? '#catalog' : '#cart-lines';
      return window.htmx.ajax('POST', updateUrl, { source: orderForm, target: target, swap: 'outerHTML', values: { op: op } });
    };
    var enqueue = function (op) {
      queue = queue.then(function () { return send(op); }).catch(function () { /* o aviso sai nos eventos abaixo */ });
    };

    orderForm.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[name="op"]') : null;
      if (!button || !orderForm.contains(button) || button.disabled) { return; }
      event.preventDefault(); // cancela o submit nativo; o htmx faz o POST
      enqueue(button.value);
    });

    // Campos que mudam o total (desconto, taxa, tipo, meio a meio) recalculam sozinhos.
    orderForm.addEventListener('change', function (event) {
      if (event.target.matches && event.target.matches('[data-recalc]')) { enqueue('refresh'); }
    });

    var showAlert = function (message) {
      if (alertBox) { alertBox.textContent = message; alertBox.hidden = false; }
    };
    var failure = function () {
      showAlert('Não foi possível atualizar o carrinho. Verifique a conexão e tente de novo.');
    };
    document.addEventListener('htmx:responseError', failure);
    document.addEventListener('htmx:sendError', failure);
    document.addEventListener('htmx:timeout', failure);
    document.addEventListener('htmx:afterSwap', function () { if (alertBox) { alertBox.hidden = true; } });
  }

  // Sessão expirada: o redirecionamento para /login chegaria como HTML "normal" e seria colado na tela.
  // Em vez disso, recarrega a página para o usuário cair no login de verdade.
  document.addEventListener('htmx:beforeSwap', function (event) {
    var xhr = event.detail && event.detail.xhr;
    if (xhr && /\/login(\?|$)/.test(xhr.responseURL || '')) {
      event.detail.shouldSwap = false;
      window.location.reload();
    }
  });
})();
