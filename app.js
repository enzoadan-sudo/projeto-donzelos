/* ============================================
   Life-Branch — app.js
   Lógica compartilhada: armazenamento, login,
   cabeçalho, formatação e motor de simulação.
   Tudo roda no navegador (localStorage).
   Obs.: projeto acadêmico — o "hash" de senha abaixo
   NÃO é segurança real; um site de verdade precisa de servidor.
   ============================================ */
   (function () {
    'use strict';
  
    /* ---------- Armazenamento (com fallback em memória) ---------- */
    function memoria() {
      const d = {};
      return {
        getItem: (k) => (k in d ? d[k] : null),
        setItem: (k, v) => { d[k] = String(v); },
        removeItem: (k) => { delete d[k]; }
      };
    }
    function abrir(nome) {
      try {
        const s = window[nome];
        s.setItem('__t', '1'); s.removeItem('__t');
        return s;
      } catch (e) { return memoria(); }
    }
    const L = abrir('localStorage');
    const S = abrir('sessionStorage');
  
    function ler(store, chave, padrao) {
      try { const v = store.getItem(chave); return v ? JSON.parse(v) : padrao; }
      catch (e) { return padrao; }
    }
    function gravar(store, chave, valor) {
      try { store.setItem(chave, JSON.stringify(valor)); return true; }
      catch (e) { return false; }
    }
  
    const K = { users: 'lb_users', session: 'lb_session', sims: 'lb_sims_', last: 'lb_last' };
  
    /* ---------- Utilidades ---------- */
    function esc(t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  
    function hash(s) {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return 'h' + (h >>> 0).toString(16) + '-' + s.length;
    }
  
    function pagina() {
      const p = location.pathname.split('/').pop();
      return p || 'index.html';
    }
  
    function paramURL(nome) {
      return new URLSearchParams(location.search).get(nome);
    }
  
    /* ---------- Usuários e sessão ---------- */
    function usuarios() { return ler(L, K.users, {}); }
    function salvarUsuarios(u) { gravar(L, K.users, u); }
  
    function sessao() { return ler(S, K.session, null) || ler(L, K.session, null); }
  
    function usuario() {
      const s = sessao();
      if (!s) return null;
      return usuarios()[s.email] || null;
    }
  
    function salvarUsuario(u) {
      const todos = usuarios();
      todos[u.email] = u;
      salvarUsuarios(todos);
    }
  
    function iniciarSessao(email, lembrar) {
      L.removeItem(K.session);
      S.removeItem(K.session);
      gravar(lembrar ? L : S, K.session, { email: email });
    }
  
    function cadastrar(nome, email, senha) {
      email = email.trim().toLowerCase();
      const todos = usuarios();
      if (todos[email]) return { ok: false, msg: 'Já existe uma conta com este e-mail.' };
      todos[email] = {
        nome: nome.trim(), email: email, senha: hash(senha),
        nascimento: '', cidade: '', foto: '',
        prefs: { risco: 3, moeda: 'BRL', alertas: true },
        criadoEm: new Date().toISOString()
      };
      salvarUsuarios(todos);
      iniciarSessao(email, true);
      return { ok: true };
    }
  
    function entrar(email, senha, lembrar) {
      email = email.trim().toLowerCase();
      const u = usuarios()[email];
      if (!u || u.senha !== hash(senha)) return { ok: false, msg: 'E-mail ou senha incorretos.' };
      iniciarSessao(email, lembrar);
      return { ok: true };
    }
  
    function sair() {
      L.removeItem(K.session);
      S.removeItem(K.session);
    }
  
    function exigirLogin() {
      if (usuario()) return true;
      location.replace('login.html?next=' + encodeURIComponent(pagina() + location.search));
      return false;
    }
  
    function excluirConta() {
      const u = usuario();
      if (!u) return;
      const todos = usuarios();
      delete todos[u.email];
      salvarUsuarios(todos);
      L.removeItem(K.sims + u.email);
      sair();
    }
  
    /* ---------- Simulações salvas ---------- */
    function listaSims(email) { return ler(L, K.sims + email, []); }
  
    function salvarSim(sim) {
      const u = usuario();
      if (!u) return false;
      const lista = listaSims(u.email);
      const i = lista.findIndex((s) => s.id === sim.id);
      if (i >= 0) lista[i] = sim; else lista.push(sim);
      return gravar(L, K.sims + u.email, lista);
    }
  
    function excluirSim(id) {
      const u = usuario();
      if (!u) return;
      gravar(L, K.sims + u.email, listaSims(u.email).filter((s) => s.id !== id));
    }
  
    function ultimaSim() { return ler(L, K.last, null); }
    function guardarUltima(sim) { gravar(L, K.last, sim); }
  
    /* ---------- Formatação ---------- */
    // Câmbio de referência FIXO (apenas ilustrativo; não é cotação em tempo real)
    const CAMBIO = { BRL: 1, USD: 0.18, EUR: 0.165 };
  
    function moedaPadrao() {
      const u = usuario();
      return (u && u.prefs && u.prefs.moeda) || 'BRL';
    }
  
    function dinheiro(v, moeda) {
      moeda = moeda || moedaPadrao();
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda })
        .format((v || 0) * (CAMBIO[moeda] || 1));
    }
  
    function dataBR(iso) {
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
    }
  
    function gerarId() {
      return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
  
    function aviso(msg) {
      let t = document.getElementById('toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        t.setAttribute('role', 'status');
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('visivel');
      clearTimeout(t._t);
      t._t = setTimeout(() => t.classList.remove('visivel'), 2800);
    }
  
    /* ---------- Cabeçalho e rodapé ---------- */
    function link(href, texto, extra) {
      const atual = pagina() === href.split('#')[0] && href.indexOf('#') === -1;
      return '<li><a href="' + href + '"' + (extra && extra.cls ? ' class="' + extra.cls + '"' : '') +
        (atual ? ' aria-current="page"' : '') + (extra && extra.attr ? ' ' + extra.attr : '') + '>' + texto + '</a></li>';
    }
  
    function cabecalho() {
      const el = document.getElementById('topo');
      if (!el) return;
      el.className = 'topo';
      const u = usuario();
      let itens;
      if (u) {
        itens = link('visao_geral.html', 'Painel') +
          link('perfil_usuario.html', 'Minha Conta') +
          link('formulario_simulacao.html', 'Nova Simulação', { cls: 'nav-cta' }) +
          link('login.html', 'Sair', { attr: 'data-sair' });
      } else {
        const home = pagina() === 'index.html';
        itens = (home ? link('#funcionalidades', 'Como Funciona') + link('#recursos', 'Recursos')
                      : link('index.html', 'Início')) +
          link('login.html', 'Entrar') +
          link('formulario_simulacao.html', 'Simular Agora', { cls: 'nav-cta' });
      }
      el.innerHTML = '<a class="logo" href="' + (u ? 'visao_geral.html' : 'index.html') +
        '">💰 Life-Branch</a><nav aria-label="Navegação principal"><ul>' + itens + '</ul></nav>';
      el.addEventListener('click', function (e) {
        const a = e.target.closest('[data-sair]');
        if (a) sair();
      });
    }
  
    function rodape() {
      const el = document.getElementById('rodape');
      if (!el) return;
      el.innerHTML = '<p>&copy; 2026 Senai-cetaf. Projeto Acadêmico de Desenvolvimento Web.</p>';
    }
  
    /* ---------- Motor de simulação ---------- */
    // Índice de custo de vida (São Paulo = 100). Valores aproximados, ilustrativos.
    const CUSTO_CIDADES = {
      'sao paulo': 100, 'rio de janeiro': 95, 'florianopolis': 98, 'belo horizonte': 88,
      'curitiba': 90, 'porto alegre': 88, 'brasilia': 96, 'salvador': 80, 'recife': 82,
      'fortaleza': 78, 'aracaju': 72, 'goiania': 80, 'campinas': 92, 'sao jose dos campos': 90,
      'manaus': 85, 'belem': 80, 'vitoria': 90, 'natal': 76, 'joao pessoa': 74, 'maceio': 76
    };
  
    function normalizar(t) {
      return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/\s[-–]\s|,/)[0].trim();
    }
  
    function indiceCidade(nome) {
      const k = normalizar(nome);
      return CUSTO_CIDADES[k] ? { v: CUSTO_CIDADES[k], conhecida: true } : { v: 90, conhecida: false };
    }
  
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  
    function simular(inp) {
      const anos = inp.prazo;
      const meses = anos * 12;
      const INFLACAO = 0.045;
      const crescA = 0.04;
      const crescB = { conservador: 0.04, moderado: 0.06, arrojado: 0.08 }[inp.risco] || 0.06;
  
      const mudaCidade = inp.tipo === 'cidade' || inp.tipo === 'ambos';
      const idxAtual = indiceCidade(inp.cidadeAtual);
      const idxDest = mudaCidade ? indiceCidade(inp.cidadeDestino) : idxAtual;
      const fator = mudaCidade ? idxDest.v / idxAtual.v : 1;
  
      const rendaA0 = inp.rendaAtual;
      const custoA0 = inp.custoAtual;
      const rendaB0 = inp.novaRenda > 0 ? inp.novaRenda : inp.rendaAtual;
      const custoB0 = inp.custoAtual * fator;
      const reserva = inp.reserva;
      const custoTrans = inp.custoTransicao;
  
      let cumA = 0, cumB = 0, payback = null;
      const porAno = [];
      for (let m = 1; m <= meses; m++) {
        const y = Math.floor((m - 1) / 12);
        const sobraA = rendaA0 * Math.pow(1 + crescA, y) - custoA0 * Math.pow(1 + INFLACAO, y);
        const sobraB = rendaB0 * Math.pow(1 + crescB, y) - custoB0 * Math.pow(1 + INFLACAO, y);
        cumA += sobraA;
        cumB += sobraB;
        if (payback === null && cumB - cumA >= custoTrans) payback = m;
        if (m % 12 === 0) {
          porAno.push({ ano: m / 12, A: reserva + cumA, B: reserva - custoTrans + cumB });
        }
      }
  
      const yF = anos - 1;
      const rendaAF = rendaA0 * Math.pow(1 + crescA, yF);
      const custoAF = custoA0 * Math.pow(1 + INFLACAO, yF);
      const rendaBF = rendaB0 * Math.pow(1 + crescB, yF);
      const custoBF = custoB0 * Math.pow(1 + INFLACAO, yF);
  
      // Estresse financeiro inicial
      const reservaApos = reserva - custoTrans;
      const mesesReserva = custoB0 > 0 ? Math.max(reservaApos, 0) / custoB0 : 99;
      const folgaB = rendaB0 > 0 ? (rendaB0 - custoB0) / rendaB0 : 0;
      let estresse = 70 - mesesReserva * 7 - folgaB * 40;
      estresse += { conservador: 8, moderado: 0, arrojado: -6 }[inp.risco] || 0;
      if (reservaApos < 0) estresse += 25;
      if (rendaB0 - custoB0 < 0) estresse += 20;
      estresse = Math.round(clamp(estresse, 5, 95));
      const nivelEstresse = estresse < 25 ? 'Baixo' : estresse < 45 ? 'Médio-Baixo' : estresse < 65 ? 'Médio' : 'Alto';
  
      // Qualidade de vida estimada (0-100)
      const folgaA = rendaA0 > 0 ? (rendaA0 - custoA0) / rendaA0 : 0;
      const qA = Math.round(clamp(45 + folgaA * 70, 10, 98));
      let qB = 45 + folgaB * 70 + (1 - fator) * 40 + (mesesReserva >= 6 ? 5 : 0);
      qB = Math.round(clamp(qB, 10, 98));
      const deltaQ = Math.round(((qB - qA) / qA) * 100);
  
      return {
        anos: anos, mudaCidade: mudaCidade, fator: fator,
        cidadeConhecida: !mudaCidade || (idxAtual.conhecida && idxDest.conhecida),
        A: { renda: rendaAF, custo: custoAF, sobra: rendaAF - custoAF, reserva: reserva, patrimonio: porAno[porAno.length - 1].A, qualidade: qA },
        B: { renda: rendaBF, custo: custoBF, sobra: rendaBF - custoBF, reserva: reservaApos, patrimonio: porAno[porAno.length - 1].B, qualidade: qB },
        porAno: porAno, payback: payback, estresse: estresse, nivelEstresse: nivelEstresse,
        mesesReserva: mesesReserva, deltaQualidade: deltaQ,
        sobraInicialB: rendaB0 - custoB0
      };
    }
  
    const ROTULO_TIPO = {
      carreira: 'Transição de carreira',
      cidade: 'Mudança de cidade',
      ambos: 'Mudança de cidade + carreira'
    };
  
    /* ---------- Inicialização ---------- */
    function iniciar() { cabecalho(); rodape(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  
    window.LB = {
      esc: esc, pagina: pagina, paramURL: paramURL,
      usuario: usuario, salvarUsuario: salvarUsuario, cadastrar: cadastrar, entrar: entrar,
      sair: sair, exigirLogin: exigirLogin, excluirConta: excluirConta, hash: hash,
      listaSims: listaSims, salvarSim: salvarSim, excluirSim: excluirSim,
      ultimaSim: ultimaSim, guardarUltima: guardarUltima, gerarId: gerarId,
      dinheiro: dinheiro, dataBR: dataBR, aviso: aviso,
      simular: simular, ROTULO_TIPO: ROTULO_TIPO, CAMBIO: CAMBIO
    };
  })();