/* Montador do Boletim de Comunicação Interna — o CMS do boletim.
   Guarda as edições neste navegador (IndexedDB), mostra a prévia com o mesmo
   renderizador da página publicada e publica o dados.json no GitHub. */
(function () {
  'use strict';
  var B = window.Boletim;
  var GH_KEY = 'boletim-montador-github';
  var REPO_PADRAO = { owner: 'informativoudi', repo: 'boletiminterno', branch: 'main', pasta: '' };
  var ENVIADAS_KEY = 'boletim-montador-imagens';
  var MAX_MIDIAS = 10, MAX_PESSOAS = 12;

  var S = { dados: null, selId: null, abertos: {}, gh: {}, previa: true, prevModo: 'desktop', rolarPara: null };

  // ---------- Utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'x' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(s, r) { return (r || document).querySelector(s); }
  function partes(p) { return String(p).split('.').filter(function (x) { return x !== ''; }); }
  function pegar(obj, p) { return partes(p).reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function por(obj, p, v) {
    var ks = partes(p), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function edAtual() { return S.dados && S.dados.edicoes.filter(function (e) { return e.id === S.selId; })[0]; }
  function hojeMes() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function txt(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }

  var ic = {
    up: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    del: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    dup: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    olho: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    img: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    play: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    subir: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></svg>',
    seta: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'
  };

  // ---------- Modelos ----------
  var MENUS = [['', 'Fora do menu'], ['acontece', 'Acontece na Unimed'], ['eventos', 'Eventos e Ações'], ['gestao', 'Gente e Gestão'], ['gentenova', 'Gente Nova']];
  var CORES_CARD = [['azul', 'Azul'], ['amarelo', 'Amarelo'], ['verde', 'Verde'], ['rosa', 'Rosa'], ['lima', 'Lima'], ['areia', 'Areia']];
  var CORES_DESTAQUE = [['verde', 'Verde'], ['lima', 'Lima'], ['laranja', 'Laranja'], ['azul', 'Azul'], ['petroleo', 'Petróleo (escuro)']];
  var CORES_BOTAO = [['verde', 'Verde'], ['laranja', 'Laranja'], ['petroleo', 'Petróleo'], ['lima', 'Lima'], ['contorno', 'Contorno']];
  var CORES_PESSOAS = [['verde', 'Verde'], ['petroleo', 'Petróleo'], ['laranja', 'Laranja'], ['lima', 'Lima']];
  var CORES_CAIXAS = [['verde', 'Verde pastel'], ['azul', 'Azul pastel'], ['amarelo', 'Amarelo pastel'], ['areia', 'Areia']];
  var MARCADORES = [['amarelo', '#fff1b8'], ['verde', '#d6efe2'], ['lima', '#e6f2bf'], ['laranja', '#ffe0c4'], ['azul', '#d7ebf2']];
  var NOMES_ICONES = { quadro: 'Quadro', grafico: 'Gráfico', camadas: 'Camadas', cultura: 'Cultura', pessoas: 'Pessoas', estrela: 'Estrela', coracao: 'Coração', livro: 'Livro', megafone: 'Megafone', calendario: 'Calendário', trofeu: 'Troféu', escudo: 'Escudo' };
  var SECOES_SUGERIDAS = ['Acontece na Unimed Uberlândia', 'Eventos e Ações', 'Gente e Gestão', 'Giro ESG', 'Instituto Unimed Uberlândia', 'Qualidade e Segurança', 'Saúde e Bem-estar'];
  var EMOJIS = ['📢', '📧', '🧠', '💙', '💗', '✅', '📅', '🎉', '🏆', '📌', '💡', '🩺', '❤️', '🎁', '📚', '🤝'];

  var MODELOS = {
    midia: function () { return { url: '', legenda: '', tipo: '' }; },
    botao: function () { return { texto: 'Saiba mais', url: '', cor: 'verde' }; },
    card: function () { return { icone: '📌', titulo: '', texto: '', cor: 'azul', link: '', linkTexto: 'Saiba mais' }; },
    faixa: function () { return ''; },
    categoria: function () { return { nome: 'Nova categoria', icone: 'estrela' }; },
    caixa: function () { return { marca: '', texto: '', link: '', linkTexto: 'Leia mais' }; },
    pessoa: function () { return { nome: '', cargo: '', foto: '' }; },
    legado: function () { return { rotulo: '', url: '' }; },
    itemGestao: function (cat) { return { id: uid(), categoria: cat || '', titulo: '', disposicao: 'esquerda', midias: [], texto: '', botoes: [], destaque: null }; }
  };

  var BLOCOS = {
    noticia: { nome: 'Notícia', desc: 'Nome da seção, título, foto ou vídeo, texto, botões e destaque.', novo: function () { return { id: uid(), tipo: 'noticia', menu: 'acontece', secao: 'Acontece na Unimed Uberlândia', titulo: '', disposicao: 'esquerda', midias: [], texto: '', botoes: [], destaque: null }; } },
    gestao: { nome: 'Gente e Gestão', desc: 'Notícias separadas por categoria, com menu próprio.', novo: function () { return { id: uid(), tipo: 'gestao', menu: 'gestao', secao: 'Gente e Gestão', categorias: [{ nome: 'Trilhas Técnicas', icone: 'quadro' }, { nome: 'Ser Líder', icone: 'grafico' }, { nome: 'Novidades', icone: 'camadas' }, { nome: 'Cultura', icone: 'cultura' }], itens: [MODELOS.itemGestao('Trilhas Técnicas')] }; } },
    caixas: { nome: 'Caixas com destaque', desc: 'Retângulos com uma marca no início e o texto ao lado (ex.: Giro ESG).', novo: function () { return { id: uid(), tipo: 'caixas', menu: '', secao: 'Giro ESG', cor: 'verde', itens: [{ marca: 'E', texto: '', link: '', linkTexto: 'Leia mais' }, { marca: 'S', texto: '', link: '', linkTexto: 'Leia mais' }, { marca: 'G', texto: '', link: '', linkTexto: 'Leia mais' }] }; } },
    novos: { nome: 'Gente nova', desc: 'Cabeçalho com título e mês, fotos com nome e cargo (até 12).', novo: function () { return { id: uid(), tipo: 'pessoas', variante: 'novos', menu: 'gentenova', cor: 'verde', titulo: 'A equipe está crescendo', subtitulo: 'Tem gente nova na casa!', mes: mesExtenso(), mostrarLogo: false, pessoas: [] }; } },
    lideres: { nome: 'Novos líderes', desc: 'Mesma estrutura, outra cor e a marca do Grupo.', novo: function () { return { id: uid(), tipo: 'pessoas', variante: 'lideres', menu: 'gentenova', cor: 'petroleo', titulo: 'Novos líderes na casa', subtitulo: 'Boas-vindas à liderança!', mes: mesExtenso(), mostrarLogo: true, pessoas: [] }; } }
  };

  function mesExtenso(mes) {
    var m = /^(\d{4})-(\d{2})$/.exec(mes || (edAtual() && edAtual().mes) || hojeMes());
    var n = B.MESES[parseInt(m[2], 10) - 1];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  function novaEdicaoPadrao(mes) {
    var e = { id: 'ed-' + uid(), mes: mes, rotulo: B.rotuloMes(mes), status: 'rascunho', faixa: [''],
      informes: { titulo: 'Informes Gerais: comece por aqui!', subtitulo: 'Confira os destaques, participe das iniciativas e aproveite as oportunidades preparadas para você.', cards: [MODELOS.card()] },
      blocos: [], rodape: { texto: 'Até a próxima edição! 👋🏻', ans: false } };
    var n1 = BLOCOS.noticia.novo(); var n2 = BLOCOS.noticia.novo(); n2.menu = 'eventos'; n2.secao = 'Eventos e Ações';
    e.blocos = [n1, n2, BLOCOS.gestao.novo(), BLOCOS.caixas.novo(), BLOCOS.novos.novo()];
    e.blocos[4].mes = mesExtenso(mes);
    return e;
  }

  // ---------- Armazenamento (IndexedDB, com fallback) ----------
  var db = null;
  function abrirDB() {
    return new Promise(function (ok) {
      if (!window.indexedDB) { ok(null); return; }
      var r = indexedDB.open('boletim-montador', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('estado'); };
      r.onsuccess = function () { db = r.result; ok(db); };
      r.onerror = function () { ok(null); };
    });
  }
  function lerLocal() {
    return new Promise(function (ok) {
      if (!db) { try { ok(JSON.parse(localStorage.getItem('boletim-montador-dados'))); } catch (e) { ok(null); } return; }
      var r = db.transaction('estado').objectStore('estado').get('dados');
      r.onsuccess = function () { ok(r.result || null); };
      r.onerror = function () { ok(null); };
    });
  }
  var tSalvar = null;
  function salvar() {
    clearTimeout(tSalvar);
    tSalvar = setTimeout(function () {
      S.dados.atualizado = new Date().toISOString();
      if (db) db.transaction('estado', 'readwrite').objectStore('estado').put(S.dados, 'dados');
      else try { localStorage.setItem('boletim-montador-dados', JSON.stringify(S.dados)); } catch (e) { toast('Sem espaço para salvar neste navegador. Baixe um backup.'); }
    }, 250);
  }

  // ---------- Toast e modais ----------
  var tToast = null;
  function toast(m, ms) {
    var c = $('#camada'); var t = $('.toast', c);
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); c.appendChild(t); }
    t.textContent = m; clearTimeout(tToast);
    tToast = setTimeout(function () { t.remove(); }, ms || 3200);
  }
  function modal(html, aoMontar) {
    var f = document.createElement('div'); f.className = 'modal-fundo';
    f.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    $('#camada').appendChild(f);
    var fechar = function () { f.remove(); document.removeEventListener('keydown', k); };
    var k = function (e) { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', k);
    f.addEventListener('click', function (e) { if (e.target === f || e.target.closest('[data-fechar]')) fechar(); });
    if (aoMontar) aoMontar(f.firstChild, fechar);
    var foco = f.querySelector('input,textarea,select,button'); if (foco) foco.focus();
    return fechar;
  }
  function confirmar(titulo, texto, rotulo, cb) {
    modal('<h3>' + esc(titulo) + '</h3><p>' + texto + '</p><div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Cancelar</button><button type="button" class="bt verde" data-ok>' + esc(rotulo) + '</button></div>', function (m, fechar) {
      m.querySelector('[data-ok]').addEventListener('click', function () { fechar(); cb(); });
    });
  }

  // ---------- Campos (HTML) ----------
  function campo(rot, controle, dica) { return '<div class="campo"><label>' + esc(rot) + '</label>' + controle + (dica ? '<div class="dica">' + dica + '</div>' : '') + '</div>'; }
  function inp(p, v, ph, tipo, extra) { return '<input type="' + (tipo || 'text') + '" data-p="' + p + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '>'; }
  function sel(p, v, opcoes, rerender) {
    return '<select data-p="' + p + '"' + (rerender ? ' data-rr' : '') + '>' + opcoes.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === (v || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function seg(p, v, opcoes) {
    return '<div class="seg" role="group">' + opcoes.map(function (o) { return '<button type="button" data-a="set" data-p="' + p + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (o[0] === v) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function chk(p, v, rot) { return '<label class="check"><input type="checkbox" data-p="' + p + '"' + (v ? ' checked' : '') + ' data-rr> ' + esc(rot) + '</label>'; }
  function rico(p, v, ph, curto) {
    var marc = MARCADORES.map(function (m) { return '<button type="button" data-cmd="marca" data-v="' + m[0] + '" title="Marcador ' + m[0] + '" aria-label="Marcador ' + m[0] + '"><span class="sw" style="background:' + m[1] + '"></span></button>'; }).join('');
    return '<div class="rt"><div class="rt-bar" role="toolbar" aria-label="Formatação">' +
      '<button type="button" data-cmd="bold" title="Negrito" aria-label="Negrito"><b>B</b></button>' +
      '<button type="button" data-cmd="italic" title="Itálico" aria-label="Itálico"><i>I</i></button>' +
      '<button type="button" data-cmd="underline" title="Sublinhado" aria-label="Sublinhado"><u>S</u></button>' +
      '<button type="button" data-cmd="link" title="Link" aria-label="Inserir link">🔗</button>' +
      '<button type="button" data-cmd="lista" title="Lista" aria-label="Lista">•≡</button>' +
      '<span class="rt-sep"></span>' + marc +
      '<button type="button" data-cmd="desmarca" title="Tirar marcador" aria-label="Tirar marcador" style="font-size:11px">sem</button>' +
      '<span class="rt-sep"></span><button type="button" data-cmd="limpar" title="Limpar formatação" aria-label="Limpar formatação" style="font-size:11px">limpar</button>' +
      '</div><div class="rt-ed' + (curto ? ' curto' : '') + '" contenteditable="true" role="textbox" aria-multiline="true" data-rich="' + p + '" data-ph="' + esc(ph || 'Escreva aqui…') + '">' + B.sanitizar(v || '') + '</div></div>';
  }
  function botoesItem(p, i, n, extra) {
    return '<div class="grupo">' + (extra || '') +
      '<button type="button" class="ib" data-a="mov" data-p="' + p + '" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir">' + ic.up + '</button>' +
      '<button type="button" class="ib" data-a="mov" data-p="' + p + '" data-i="' + i + '" data-d="1"' + (i >= n - 1 ? ' disabled' : '') + ' aria-label="Descer">' + ic.down + '</button>' +
      '<button type="button" class="ib perigo" data-a="del" data-p="' + p + '" data-i="' + i + '" aria-label="Excluir">' + ic.del + '</button></div>';
  }

  function edMidias(p, lista) {
    lista = lista || [];
    var h = '<div class="lista-itens">' + lista.map(function (m, i) {
      var video = m.tipo ? m.tipo === 'video' : /youtu|vimeo|\.(mp4|webm|mov)(\?|$)/i.test(m.url || '');
      var u = m.url || '';
      var th = !u ? ic.img : video ? ic.play : '';
      var bg = u && !video ? ' style="background-image:url(\'' + esc(u).replace(/'/g, '%27') + '\')"' : '';
      return '<div class="item"><div class="item-cab"><b>' + (video ? 'Vídeo' : 'Foto') + ' ' + (i + 1) + '</b>' + botoesItem(p, i, lista.length) + '</div>' +
        '<div class="midia"><div class="thumb"' + bg + '>' + th + '</div><div>' +
        '<div class="flex">' + inp(p + '.' + i + '.url', /^data:/.test(u) ? '' : u, /^data:/.test(u) ? 'Imagem enviada deste computador' : 'Cole o link da imagem ou do vídeo (YouTube, Vimeo, .mp4)', 'text', ' data-rr-blur') +
        '<button type="button" class="mini" data-a="upload" data-p="' + p + '.' + i + '.url">' + ic.subir + 'Enviar</button></div>' +
        '<div class="linha" style="margin-top:8px">' + inp(p + '.' + i + '.legenda', m.legenda, 'Legenda / texto alternativo') + sel(p + '.' + i + '.tipo', m.tipo || '', [['', 'Detectar tipo'], ['imagem', 'Imagem'], ['video', 'Vídeo']], true) + '</div>' +
        '</div></div></div>';
    }).join('') + '</div>';
    var cheio = lista.length >= MAX_MIDIAS;
    h += '<div class="flex" style="flex-wrap:wrap"><button type="button" class="add" data-a="add" data-p="' + p + '" data-m="midia"' + (cheio ? ' disabled' : '') + '>+ Link de foto ou vídeo</button>' +
      '<button type="button" class="add" data-a="upload-multi" data-p="' + p + '"' + (cheio ? ' disabled' : '') + '>' + ic.subir + ' Enviar imagens</button></div>';
    h += '<div class="dica">1 mídia: aparece inteira, na horizontal ou na vertical · 2: lado a lado · 3 a 10: slide passando. (' + lista.length + '/10)</div>';
    return h;
  }

  function edBotoes(p, lista) {
    lista = lista || [];
    return '<div class="lista-itens">' + lista.map(function (b, i) {
      return '<div class="item"><div class="item-cab"><b>Botão ' + (i + 1) + '</b>' + botoesItem(p, i, lista.length) + '</div>' +
        '<div class="linha3">' + inp(p + '.' + i + '.texto', b.texto, 'Texto do botão') + inp(p + '.' + i + '.url', b.url, 'https://…', 'url') + sel(p + '.' + i + '.cor', b.cor, CORES_BOTAO) + '</div></div>';
    }).join('') + '</div><button type="button" class="add" data-a="add" data-p="' + p + '" data-m="botao">+ Botão</button>';
  }

  function edDestaque(p, d) {
    if (!d) return '<button type="button" class="add" data-a="destaque-on" data-p="' + p + '">+ Caixa de destaque</button>';
    return '<div class="item" style="border:1px solid #ece8e0;border-radius:12px;padding:12px;background:#fcfbf9;margin-top:4px"><div class="item-cab"><b>Caixa de destaque</b><div class="grupo">' + sel(p + '.cor', d.cor, CORES_DESTAQUE, true).replace('<select', '<select style="height:30px;width:auto"') +
      '<button type="button" class="ib perigo" data-a="destaque-off" data-p="' + p + '" aria-label="Remover destaque">' + ic.del + '</button></div></div>' + rico(p + '.texto', d.texto, 'Texto em destaque', true) + '</div>';
  }

  function edConteudo(p, n) {
    return campo('Título de destaque', inp(p + '.titulo', n.titulo, 'Título principal da notícia', 'text', ' data-sum')) +
      campo('Posição da mídia', seg(p + '.disposicao', n.disposicao || 'esquerda', [['esquerda', 'Mídia à esquerda'], ['direita', 'Mídia à direita'], ['acima', 'Mídia acima'], ['texto', 'Só texto']])) +
      (n.disposicao === 'texto' ? '' : campo('Fotos e vídeos', edMidias(p + '.midias', n.midias))) +
      campo('Texto', rico(p + '.texto', n.texto, 'Texto da notícia. Use negrito, links e marcador.')) +
      campo('Destaque', edDestaque(p + '.destaque', n.destaque)) +
      campo('Botões', edBotoes(p + '.botoes', n.botoes));
  }

  function resumoBloco(b) {
    if (b.tipo === 'pessoas') return (b.titulo || '') + ' · ' + (b.pessoas || []).length + ' pessoa(s)';
    if (b.tipo === 'gestao') return (b.itens || []).length + ' notícia(s) em ' + (b.categorias || []).length + ' categorias';
    if (b.tipo === 'caixas') return (b.itens || []).length + ' caixa(s)';
    return b.titulo || 'Sem título';
  }
  function nomeTipo(b) { return b.tipo === 'pessoas' ? (b.variante === 'lideres' ? 'Novos líderes' : 'Gente nova') : (BLOCOS[b.tipo] || BLOCOS.noticia).nome; }

  function edBloco(b, i, n) {
    var p = 'blocos.' + i;
    var aberto = !!S.abertos[b.id];
    var cab = '<div class="card-cab bloco-cab" data-a="abrir" data-id="' + b.id + '" role="button" tabindex="0" aria-expanded="' + aberto + '">' +
      '<span class="chip t-' + b.tipo + '">' + esc(nomeTipo(b)) + '</span>' +
      '<h2>' + esc(b.secao || nomeTipo(b)) + '<small data-sum-de="' + p + '">' + esc(resumoBloco(b)) + '</small></h2>' +
      '<div class="grupo"><button type="button" class="ib" data-a="ver" data-i="' + i + '" aria-label="Ver na prévia" title="Ver na prévia">' + ic.olho + '</button>' +
      '<button type="button" class="ib" data-a="dup" data-p="blocos" data-i="' + i + '" aria-label="Duplicar" title="Duplicar">' + ic.dup + '</button></div>' +
      botoesItem('blocos', i, n) + '</div>';
    if (!aberto) return '<div class="card" id="bloco-' + b.id + '">' + cab + '</div>';

    var c = '<div class="linha">' + campo('Aparece no menu como', sel(p + '.menu', b.menu, MENUS)) +
      campo('Nome da seção', inp(p + '.secao', b.secao, 'Ex.: Acontece na Unimed Uberlândia', 'text', ' list="secoes"')) + '</div>';

    if (b.tipo === 'noticia') c += edConteudo(p, b);

    if (b.tipo === 'gestao') {
      var cats = b.categorias || [];
      c += campo('Categorias do menu', '<div class="lista-itens">' + cats.map(function (k, j) {
        var opIc = Object.keys(NOMES_ICONES).map(function (x) { return [x, NOMES_ICONES[x]]; });
        return '<div class="item"><div class="flex"><span style="color:#004e4c;display:flex">' + B.icone(k.icone, 18) + '</span>' + inp(p + '.categorias.' + j + '.nome', k.nome, 'Nome da categoria', 'text', ' data-cat-antigo="' + esc(k.nome) + '"') +
          '<div style="width:140px;flex-shrink:0">' + sel(p + '.categorias.' + j + '.icone', k.icone, opIc, true) + '</div>' + botoesItem(p + '.categorias', j, cats.length) + '</div></div>';
      }).join('') + '</div><button type="button" class="add" data-a="add" data-p="' + p + '.categorias" data-m="categoria">+ Categoria</button>',
        'Renomear uma categoria leva junto as notícias dela.');
      var opCat = cats.map(function (k) { return [k.nome, k.nome]; });
      c += '<div class="titulo-sec" style="margin-top:22px">Notícias</div>';
      c += (b.itens || []).map(function (it, j) {
        var pi = p + '.itens.' + j;
        return '<div class="item" style="border:1px solid #e4e0d8;border-radius:14px;padding:14px;margin-top:10px;background:#fcfbf9"><div class="item-cab"><b>' + esc(it.titulo || 'Notícia ' + (j + 1)) + '</b>' +
          botoesItem(p + '.itens', j, b.itens.length, '<button type="button" class="ib" data-a="dup" data-p="' + p + '.itens" data-i="' + j + '" aria-label="Duplicar">' + ic.dup + '</button>') + '</div>' +
          campo('Categoria', sel(pi + '.categoria', it.categoria, opCat, true)) + edConteudo(pi, it) + '</div>';
      }).join('');
      c += '<button type="button" class="add" data-a="add-gestao" data-p="' + p + '.itens">+ Notícia de Gente e Gestão</button>';
    }

    if (b.tipo === 'caixas') {
      c += campo('Cor das caixas', sel(p + '.cor', b.cor, CORES_CAIXAS));
      c += campo('Caixas', '<div class="lista-itens">' + (b.itens || []).map(function (k, j) {
        var pk = p + '.itens.' + j;
        return '<div class="item"><div class="item-cab"><b>Caixa ' + (j + 1) + '</b>' + botoesItem(p + '.itens', j, b.itens.length) + '</div>' +
          '<div style="display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:start"><div><span class="rot">Marca</span>' + inp(pk + '.marca', k.marca, 'E', 'text', ' maxlength="4" style="text-align:center;font-size:20px;font-weight:700"') + '</div>' +
          '<div><span class="rot">Texto</span>' + rico(pk + '.texto', k.texto, 'Texto da caixa', true) + '</div></div>' +
          '<div class="linha" style="margin-top:8px">' + inp(pk + '.link', k.link, 'Link (opcional)', 'url') + inp(pk + '.linkTexto', k.linkTexto, 'Texto do link') + '</div></div>';
      }).join('') + '</div><button type="button" class="add" data-a="add" data-p="' + p + '.itens" data-m="caixa">+ Caixa</button>');
    }

    if (b.tipo === 'pessoas') {
      var ps = b.pessoas || [];
      c += '<div class="linha">' + campo('Título', inp(p + '.titulo', b.titulo, 'A equipe está crescendo', 'text', ' data-sum')) + campo('Subtítulo', inp(p + '.subtitulo', b.subtitulo, 'Tem gente nova na casa!')) + '</div>';
      c += '<div class="linha">' + campo('Mês', inp(p + '.mes', b.mes, 'Outubro')) + campo('Cor do cabeçalho', sel(p + '.cor', b.cor, CORES_PESSOAS)) + '</div>';
      c += '<div class="campo">' + chk(p + '.mostrarLogo', b.variante === 'lideres' ? b.mostrarLogo !== false : b.mostrarLogo, 'Mostrar a faixa com a marca do Grupo Unimed Uberlândia') + '</div>';
      c += campo('Pessoas (' + ps.length + '/' + MAX_PESSOAS + ')', '<div class="pessoas">' + ps.map(function (pe, j) {
        var pp = p + '.pessoas.' + j;
        var bg = pe.foto ? ' style="background-image:url(\'' + esc(pe.foto).replace(/'/g, '%27') + '\')"' : '';
        var ini = pe.foto ? '' : esc((pe.nome || '?').trim().split(/\s+/).map(function (x) { return x[0]; }).filter(Boolean).slice(0, 1).concat((pe.nome || '').trim().split(/\s+/).slice(1).slice(-1).map(function (x) { return x[0]; })).join('').toUpperCase());
        return '<div class="pessoa"><div class="pessoa-topo"><div class="thumb"' + bg + '>' + ini + '</div><div style="display:flex;flex-direction:column;gap:4px;flex:1">' +
          '<button type="button" class="mini" style="height:30px" data-a="upload" data-p="' + pp + '.foto" data-foto="1">' + ic.subir + (pe.foto ? 'Trocar foto' : 'Enviar foto') + '</button>' +
          '<div class="grupo">' + botoesItem(p + '.pessoas', j, ps.length).replace('<div class="grupo">', '').replace(/<\/div>$/, '') + '</div></div></div>' +
          inp(pp + '.nome', pe.nome, 'Nome completo') + inp(pp + '.cargo', pe.cargo, 'Cargo') +
          inp(pp + '.foto', /^data:/.test(pe.foto) ? '' : pe.foto, /^data:/.test(pe.foto) ? 'Foto enviada' : 'ou link da foto', 'text', ' data-rr-blur') + '</div>';
      }).join('') + '</div>' +
        '<div class="flex" style="flex-wrap:wrap"><button type="button" class="add" data-a="add" data-p="' + p + '.pessoas" data-m="pessoa"' + (ps.length >= MAX_PESSOAS ? ' disabled' : '') + '>+ Pessoa</button>' +
        '<button type="button" class="add" data-a="colar-pessoas" data-p="' + p + '.pessoas"' + (ps.length >= MAX_PESSOAS ? ' disabled' : '') + '>Colar lista de nomes</button></div>',
        'As fotos ficam quadradas com cantos arredondados. Use fotos de rosto centralizado.');
    }
    return '<div class="card" id="bloco-' + b.id + '">' + cab + '<div class="card-corpo">' + c + '</div></div>';
  }

  // ---------- Telas ----------
  function renderLista() {
    var eds = S.dados.edicoes.slice().sort(function (a, b) { return String(b.mes).localeCompare(String(a.mes)); });
    var st = { rascunho: 'Rascunho', espelho: 'Espelho', online: 'No ar', arquivada: 'Arquivada' };
    $('#lista-edicoes').innerHTML = eds.length ? eds.map(function (e) {
      var m = /^(\d{4})-(\d{2})$/.exec(e.mes || '') || [0, '', '01'];
      return '<button type="button" class="ed' + (e.id === S.selId ? ' sel' : '') + '" data-a="sel-ed" data-id="' + e.id + '"' + (e.id === S.selId ? ' aria-current="true"' : '') + '>' +
        '<span class="ed-data"><b>' + esc(B.MESES[parseInt(m[2], 10) - 1].slice(0, 3)) + '</b><span>' + esc(String(m[1]).slice(2)) + '</span></span>' +
        '<span class="ed-info"><b>Edição de ' + esc(e.rotulo || B.rotuloMes(e.mes)) + '</b><span class="badge st-' + e.status + '">' + st[e.status] + '</span></span></button>';
    }).join('') : '<p style="padding:20px 8px;color:#736d61;font-size:13px;line-height:1.5">Nenhuma edição ainda. Clique em <b>Nova edição</b>.</p>';
  }

  function renderEditor() {
    var box = $('#editor');
    var y = box.scrollTop;
    var e = edAtual();
    if (!e) { box.innerHTML = '<div class="vazio"><b>Monte a primeira edição</b>Clique em <strong>Nova edição</strong> para começar com o modelo do boletim.</div>'; return; }
    var st = { rascunho: 'Rascunho: só existe neste navegador.', espelho: 'Espelho: no site, só aparece no endereço de validação.', online: 'No ar: é a edição atual do boletim.', arquivada: 'Arquivada: aparece no menu Edições.' };
    var h = '<div class="editor-in">';
    h += '<div class="card"><div class="card-cab"><h2>Edição<small>Capa, status e publicação</small></h2>' +
      '<div class="grupo"><button type="button" class="ib" data-a="dup-ed" aria-label="Duplicar edição" title="Duplicar edição">' + ic.dup + '</button><button type="button" class="ib perigo" data-a="del-ed" aria-label="Excluir edição" title="Excluir edição">' + ic.del + '</button></div></div><div class="card-corpo">' +
      '<div class="linha">' + campo('Mês da edição', inp('mes', e.mes, '', 'month', ' data-rr')) + campo('Texto na capa', '<div class="flex"><span style="white-space:nowrap;color:#736d61;font-weight:600">Edição de</span>' + inp('rotulo', e.rotulo, 'outubro/26') + '</div>') + '</div>' +
      '<div class="dica">“Comunicação Interna” e “Confira o Boletim do Grupo Unimed Uberlândia!” são fixos.</div>' +
      '<div class="status-box"><span class="badge st-' + e.status + '" style="margin:0">' + esc(e.status === 'online' ? 'No ar' : e.status) + '</span><span style="flex:1;min-width:180px;font-size:12.5px;color:#555046">' + st[e.status] + '</span>' +
      (e.status !== 'online' ? '<button type="button" class="bt laranja" data-a="espelho">Enviar para o espelho</button><button type="button" class="bt verde" data-a="publicar">Publicar no boletim</button>' : '<button type="button" class="bt verde" data-a="republicar">Atualizar no site</button>') +
      (e.status === 'espelho' || e.status === 'arquivada' ? '<button type="button" class="bt cinza" data-a="voltar-rascunho">Tirar do site</button>' : '') +
      '</div></div></div>';

    h += '<div class="card"><div class="card-cab"><h2>Faixa animada<small>Frases que passam abaixo da capa</small></h2></div><div class="card-corpo"><div class="lista-itens">' +
      (e.faixa || []).map(function (f, i) { return '<div class="item" style="padding:8px"><div class="flex">' + inp('faixa.' + i, f, 'Ex.: Eu ajudo na lata: última pesagem do mês') + botoesItem('faixa', i, e.faixa.length) + '</div></div>'; }).join('') +
      '</div><button type="button" class="add" data-a="add" data-p="faixa" data-m="faixa">+ Frase</button></div></div>';

    var inf = e.informes || {};
    h += '<div class="card"><div class="card-cab"><h2>Informes Gerais<small>Cards com ícone, título, texto e link</small></h2></div><div class="card-corpo">' +
      '<div class="linha">' + campo('Título', inp('informes.titulo', inf.titulo, 'Informes Gerais: comece por aqui!')) + campo('Subtítulo', inp('informes.subtitulo', inf.subtitulo, '')) + '</div>' +
      '<div class="lista-itens">' + (inf.cards || []).map(function (c, i) {
        var p = 'informes.cards.' + i;
        return '<div class="item"><div class="item-cab"><b>Card ' + (i + 1) + '</b>' + botoesItem('informes.cards', i, inf.cards.length) + '</div>' +
          '<div style="display:grid;grid-template-columns:80px 1fr 140px;gap:10px">' + inp(p + '.icone', c.icone, '📌', 'text', ' list="emojis" style="text-align:center;font-size:18px" aria-label="Ícone"') + inp(p + '.titulo', c.titulo, 'Título do card') + sel(p + '.cor', c.cor, CORES_CARD) + '</div>' +
          '<div style="margin-top:8px">' + rico(p + '.texto', c.texto, 'Texto do card', true) + '</div>' +
          '<div class="linha" style="margin-top:8px">' + inp(p + '.link', c.link, 'Link de direcionamento', 'url') + inp(p + '.linkTexto', c.linkTexto, 'Texto do link (ex.: Participe!)') + '</div></div>';
      }).join('') + '</div><button type="button" class="add" data-a="add" data-p="informes.cards" data-m="card">+ Card</button>' +
      '<div class="dica">Para o ícone, escolha um emoji da lista ou cole outro.</div></div></div>';

    h += '<div class="titulo-sec">Seções do boletim</div>';
    h += (e.blocos || []).map(function (b, i) { return edBloco(b, i, e.blocos.length); }).join('');
    h += '<div class="titulo-sec">Adicionar seção</div><div class="add-blocos">' + Object.keys(BLOCOS).map(function (k) {
      return '<button type="button" class="add-bloco" data-a="add-bloco" data-t="' + k + '"><b>+ ' + BLOCOS[k].nome + '</b><span>' + BLOCOS[k].desc + '</span></button>';
    }).join('') + '</div>';

    var rod = e.rodape || {};
    h += '<div class="card"><div class="card-cab"><h2>Rodapé<small>Fundo verde pastel com a marca Unimed Uberlândia</small></h2></div><div class="card-corpo">' +
      campo('Texto', inp('rodape.texto', rod.texto, 'Até a próxima edição! 👋🏻')) +
      '<div class="campo">' + chk('rodape.ans', rod.ans, 'Mostrar o registro ANS nº 384577') + '</div></div></div>';

    h += '<datalist id="secoes">' + SECOES_SUGERIDAS.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>';
    h += '<datalist id="emojis">' + EMOJIS.map(function (s) { return '<option value="' + s + '">'; }).join('') + '</datalist>';
    h += '</div>';
    box.innerHTML = h;
    box.scrollTop = y;
  }

  function renderTudo() { renderLista(); renderEditor(); previa(); atualizarGhBotao(); }

  // ---------- Prévia ----------
  var tPrev = null, previaPronta = false;
  function previa(imediato) {
    clearTimeout(tPrev);
    tPrev = setTimeout(enviarPrevia, imediato ? 0 : 280);
  }
  function enviarPrevia() {
    var f = $('#frame');
    if (!previaPronta || !f.contentWindow || !S.previa) return;
    var e = edAtual();
    f.contentWindow.postMessage({ tipo: 'boletim:preview', dados: S.dados, edicao: e || null, rolarPara: S.rolarPara }, '*');
    S.rolarPara = null;
  }
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.tipo === 'boletim:pronto') { previaPronta = true; enviarPrevia(); }
  });

  // ---------- Edição de campos ----------
  function mudar(p, v) {
    var e = edAtual(); if (!e) return;
    if (p === 'mes') {
      var antigo = B.rotuloMes(e.mes);
      e.mes = v;
      if (!e.rotulo || e.rotulo === antigo) e.rotulo = B.rotuloMes(v);
    } else por(e, p, v);
    salvar(); previa();
  }

  var editorEl;
  function ligarEditor() {
    editorEl = $('#editor');
    editorEl.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.dataset.rich) { mudar(t.dataset.rich, t.innerHTML); return; }
      if (!t.dataset.p) return;
      var v = t.type === 'checkbox' ? t.checked : t.value;
      // Renomear categoria: leva as notícias junto.
      if (t.dataset.catAntigo != null) {
        var m = /^blocos\.(\d+)\.categorias\.\d+\.nome$/.exec(t.dataset.p);
        if (m) {
          var bl = edAtual().blocos[m[1]];
          (bl.itens || []).forEach(function (it) { if (it.categoria === t.dataset.catAntigo) it.categoria = v; });
          t.dataset.catAntigo = v;
        }
      }
      mudar(t.dataset.p, v);
      if (t.hasAttribute('data-sum')) {
        var bm = /^(blocos\.\d+)\./.exec(t.dataset.p);
        if (bm) { var s = editorEl.querySelector('[data-sum-de="' + bm[1] + '"]'); if (s) s.textContent = resumoBloco(pegar(edAtual(), bm[1])); }
      }
      if (t.tagName === 'SELECT' || t.type === 'checkbox' || t.hasAttribute('data-rr')) { renderEditor(); if (t.dataset.p === 'mes' || t.dataset.p === 'rotulo') renderLista(); }
      else if (t.dataset.p === 'rotulo') renderLista();
    });
    editorEl.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.hasAttribute('data-rr-blur')) renderEditor();
    });
    editorEl.addEventListener('paste', function (ev) {
      var t = ev.target.closest('[data-rich]'); if (!t) return;
      ev.preventDefault();
      var cd = ev.clipboardData;
      var html = cd.getData('text/html');
      var limpo = html ? B.sanitizar(html.replace(/<!--[\s\S]*?-->/g, '')) : B.sanitizar(cd.getData('text/plain'));
      document.execCommand('insertHTML', false, limpo);
    });
    editorEl.addEventListener('mousedown', function (ev) { if (ev.target.closest('.rt-bar button')) ev.preventDefault(); });
    editorEl.addEventListener('keydown', function (ev) {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-a="abrir"]')) { ev.preventDefault(); ev.target.click(); }
    });
  }

  function comandoRico(btn) {
    var ed = btn.closest('.rt').querySelector('[data-rich]');
    ed.focus();
    var cmd = btn.dataset.cmd;
    var s = window.getSelection();
    if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') document.execCommand(cmd);
    else if (cmd === 'lista') document.execCommand('insertUnorderedList');
    else if (cmd === 'limpar') { document.execCommand('removeFormat'); document.execCommand('unlink'); desmarcar(ed); }
    else if (cmd === 'link') {
      if (!s.rangeCount || s.isCollapsed) { toast('Selecione o texto que vai virar link.'); return; }
      var r = s.getRangeAt(0).cloneRange();
      modal('<h3>Inserir link</h3><p>Para onde o texto selecionado deve levar?</p><div class="campo"><label for="lk">Endereço</label><input type="url" id="lk" placeholder="https://…"></div><div class="modal-acoes"><button type="button" class="bt cinza" data-a2="tirar">Tirar link</button><button type="button" class="bt cinza" data-fechar>Cancelar</button><button type="button" class="bt verde" data-a2="ok">Inserir</button></div>', function (m, fechar) {
        var aplica = function (tirar) {
          ed.focus(); s.removeAllRanges(); s.addRange(r);
          if (tirar) document.execCommand('unlink');
          else { var u = B.urlSegura(m.querySelector('#lk').value); if (!u) { toast('Endereço inválido.'); return; } document.execCommand('createLink', false, u); }
          mudar(ed.dataset.rich, ed.innerHTML); fechar();
        };
        m.querySelector('[data-a2="ok"]').addEventListener('click', function () { aplica(false); });
        m.querySelector('[data-a2="tirar"]').addEventListener('click', function () { aplica(true); });
        m.querySelector('#lk').addEventListener('keydown', function (e) { if (e.key === 'Enter') aplica(false); });
      });
      return;
    } else if (cmd === 'marca') {
      if (!s.rangeCount || s.isCollapsed) { toast('Selecione o trecho para marcar.'); return; }
      var rg = s.getRangeAt(0);
      if (!ed.contains(rg.commonAncestorContainer)) return;
      var mk = document.createElement('mark'); mk.className = 'r-' + btn.dataset.v;
      mk.appendChild(rg.extractContents());
      mk.querySelectorAll('mark').forEach(function (x) { while (x.firstChild) x.parentNode.insertBefore(x.firstChild, x); x.remove(); });
      rg.insertNode(mk);
      s.removeAllRanges(); var nr = document.createRange(); nr.selectNodeContents(mk); s.addRange(nr);
    } else if (cmd === 'desmarca') desmarcar(ed, true);
    mudar(ed.dataset.rich, ed.innerHTML);
  }
  function desmarcar(ed, soSelecao) {
    var s = window.getSelection();
    ed.querySelectorAll('mark').forEach(function (m) {
      if (soSelecao && s.rangeCount && !s.getRangeAt(0).intersectsNode(m)) return;
      while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
      m.remove();
    });
  }

  // ---------- Imagens ----------
  function lerImagem(file, quadrada) {
    return new Promise(function (ok, erro) {
      if (!/^image\//.test(file.type)) { erro(new Error('tipo')); return; }
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = quadrada ? 600 : 1600;
          var w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0, sw = w, sh = h;
          if (quadrada) { var l = Math.min(w, h); sx = (w - l) / 2; sy = Math.max(0, (h - l) * 0.3); sw = sh = l; w = h = Math.min(l, max); }
          else if (Math.max(w, h) > max) { var k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
          cx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
          ok(cv.toDataURL('image/jpeg', 0.84));
        };
        img.onerror = function () { erro(new Error('img')); };
        img.src = fr.result;
      };
      fr.onerror = erro;
      fr.readAsDataURL(file);
    });
  }
  var alvoUpload = null;
  $('#arquivo').addEventListener('change', function () {
    var f = this.files[0]; this.value = '';
    if (!f || !alvoUpload) return;
    var a = alvoUpload;
    lerImagem(f, a.foto).then(function (url) {
      mudar(a.p, url);
      var m = /^(.*\.midias\.\d+)\.url$/.exec(a.p); if (m) por(edAtual(), m[1] + '.tipo', 'imagem');
      renderEditor(); previa(true);
    }).catch(function () { toast('Não consegui ler esse arquivo de imagem.'); });
  });
  $('#arquivo-multi').addEventListener('change', function () {
    var fs = Array.prototype.slice.call(this.files); this.value = '';
    if (!fs.length || !alvoUpload) return;
    var lista = pegar(edAtual(), alvoUpload.p) || [];
    var vagas = MAX_MIDIAS - lista.length;
    if (fs.length > vagas) toast('Cabem só mais ' + vagas + ' mídia(s) neste bloco. Enviei as primeiras.');
    var p = alvoUpload.p;
    Promise.all(fs.slice(0, vagas).map(function (f) { return lerImagem(f, false).catch(function () { return null; }); })).then(function (urls) {
      var l = pegar(edAtual(), p) || []; if (!pegar(edAtual(), p)) por(edAtual(), p, l);
      urls.filter(Boolean).forEach(function (u) { l.push({ url: u, legenda: '', tipo: 'imagem' }); });
      salvar(); renderEditor(); previa(true);
    });
  });

  // ---------- Ações ----------
  function acao(btn) {
    var a = btn.dataset.a, p = btn.dataset.p, i = parseInt(btn.dataset.i, 10), e = edAtual(), l;
    switch (a) {
      case 'sel-ed': S.selId = btn.dataset.id; renderTudo(); $('#editor').scrollTop = 0; return;
      case 'nova-edicao': return novaEdicao();
      case 'toggle-previa':
        S.previa = !S.previa; $('#previa').classList.toggle('fechado', !S.previa);
        btn.classList.toggle('on', S.previa); btn.setAttribute('aria-pressed', S.previa); if (S.previa) previa(true); return;
      case 'prev-modo':
        S.prevModo = btn.dataset.v; $('#previa').classList.toggle('celular', S.prevModo === 'celular');
        document.querySelectorAll('[data-a="prev-modo"]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === S.prevModo); }); return;
      case 'menu':
        var m = $('#menu-mais'); var ab = !m.classList.contains('aberto'); m.classList.toggle('aberto', ab); btn.setAttribute('aria-expanded', ab); return;
      case 'github': return modalGithub();
      case 'framer': return modalFramer();
      case 'legados': return modalLegados();
      case 'exportar': return baixar('backup-boletim-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S.dados, null, 1));
      case 'importar': $('#arquivo-json').click(); return;
      case 'baixar-site': return prepararSite().then(function (d) { baixar('dados.json', JSON.stringify(d, null, 1)); toast('dados.json baixado. Suba no repositório para atualizar o site.', 4500); });
      case 'buscar-site': return buscarSite(false);
    }
    if (!e) return;
    switch (a) {
      case 'abrir': S.abertos[btn.dataset.id] = !S.abertos[btn.dataset.id]; renderEditor(); return;
      case 'set': mudar(p, btn.dataset.v); renderEditor(); return;
      case 'add':
        l = pegar(e, p); if (!l) { l = []; por(e, p, l); }
        if (btn.dataset.m === 'midia' && l.length >= MAX_MIDIAS) return;
        if (btn.dataset.m === 'pessoa' && l.length >= MAX_PESSOAS) return;
        l.push(MODELOS[btn.dataset.m]()); break;
      case 'add-gestao':
        l = pegar(e, p); var bl = pegar(e, p.replace(/\.itens$/, ''));
        l.push(MODELOS.itemGestao(((bl.categorias || [])[0] || {}).nome || '')); break;
      case 'del':
        l = pegar(e, p);
        if (p === 'blocos') { var nome = nomeTipo(l[i]); confirmar('Excluir seção?', 'A seção “' + esc(l[i].secao || nome) + '” sai desta edição.', 'Excluir', function () { l.splice(i, 1); salvar(); renderEditor(); previa(true); }); return; }
        l.splice(i, 1); break;
      case 'mov':
        l = pegar(e, p); var j = i + parseInt(btn.dataset.d, 10);
        if (j < 0 || j >= l.length) return; var x = l.splice(i, 1)[0]; l.splice(j, 0, x); break;
      case 'dup':
        l = pegar(e, p); var c = clone(l[i]); if (c.id) c.id = uid(); l.splice(i + 1, 0, c); if (p === 'blocos') S.abertos[c.id] = true; break;
      case 'add-bloco':
        var nb = BLOCOS[btn.dataset.t].novo(); e.blocos.push(nb); S.abertos[nb.id] = true; S.rolarPara = e.blocos.length - 1;
        salvar(); renderEditor(); previa(true);
        setTimeout(function () { var el = document.getElementById('bloco-' + nb.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); return;
      case 'ver': S.rolarPara = i; if (!S.previa) acao($('#btn-previa')); previa(true); return;
      case 'destaque-on': por(e, p, { texto: '', cor: 'verde' }); break;
      case 'destaque-off': por(e, p, null); break;
      case 'upload': alvoUpload = { p: p, foto: !!btn.dataset.foto }; $('#arquivo').click(); return;
      case 'upload-multi': alvoUpload = { p: p }; $('#arquivo-multi').click(); return;
      case 'colar-pessoas': return colarPessoas(p);
      case 'dup-ed': return duplicarEdicao();
      case 'del-ed':
        confirmar('Excluir edição?', 'A edição de ' + esc(e.rotulo) + ' será apagada deste navegador. Se ela já estiver no site, continua lá até a próxima publicação.', 'Excluir', function () {
          S.dados.edicoes = S.dados.edicoes.filter(function (x) { return x.id !== e.id; });
          S.selId = S.dados.edicoes.length ? S.dados.edicoes.slice().sort(function (a, b) { return String(b.mes).localeCompare(String(a.mes)); })[0].id : null;
          salvar(); renderTudo();
        }); return;
      case 'espelho': return mudarStatus('espelho');
      case 'publicar': return mudarStatus('online');
      case 'republicar': return sincronizar('Edição atualizada no site.');
      case 'voltar-rascunho': return mudarStatus('rascunho');
      default: return;
    }
    salvar(); renderEditor(); previa(true);
  }

  document.addEventListener('click', function (ev) {
    var rt = ev.target.closest('.rt-bar button');
    if (rt) { comandoRico(rt); return; }
    var btn = ev.target.closest('[data-a]');
    if (!ev.target.closest('.menu-wrap')) { $('#menu-mais').classList.remove('aberto'); $('#btn-mais').setAttribute('aria-expanded', 'false'); }
    if (!btn || btn.disabled) return;
    if (btn.closest('.dropdown')) $('#menu-mais').classList.remove('aberto');
    if (btn.dataset.a === 'abrir' && ev.target.closest('.grupo')) return;
    acao(btn);
  });

  function novaEdicao() {
    var ult = S.dados.edicoes.slice().sort(function (a, b) { return String(b.mes).localeCompare(String(a.mes)); })[0];
    var prox = hojeMes();
    if (ult && ult.mes >= prox) { var d = ult.mes.split('-').map(Number); d[1]++; if (d[1] > 12) { d[1] = 1; d[0]++; } prox = d[0] + '-' + String(d[1]).padStart(2, '0'); }
    modal('<h3>Nova edição</h3><p>Escolha o mês e como começar.</p><div class="campo"><label for="nm">Mês da edição</label><input type="month" id="nm" value="' + prox + '"></div>' +
      '<div class="campo"><label>Começar com</label><div class="seg" id="nbase"><button type="button" aria-pressed="true" data-v="modelo">Modelo do boletim</button>' + (ult ? '<button type="button" aria-pressed="false" data-v="copia">Cópia de ' + esc(ult.rotulo) + '</button>' : '') + '</div>' +
      '<div class="dica">A cópia mantém seções, categorias e textos para você só trocar o que mudou.</div></div>' +
      '<div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Cancelar</button><button type="button" class="bt verde" data-ok>Criar edição</button></div>', function (m, fechar) {
      var base = 'modelo';
      m.querySelectorAll('#nbase button').forEach(function (b) { b.addEventListener('click', function () { base = b.dataset.v; m.querySelectorAll('#nbase button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); });
      m.querySelector('[data-ok]').addEventListener('click', function () {
        var mes = m.querySelector('#nm').value || prox;
        var e;
        if (base === 'copia' && ult) {
          e = clone(ult); e.id = 'ed-' + uid(); e.mes = mes; e.rotulo = B.rotuloMes(mes); e.status = 'rascunho';
          e.blocos.forEach(function (b) { b.id = uid(); if (b.tipo === 'pessoas') { b.mes = mesExtenso(mes); b.pessoas = []; } });
        } else e = novaEdicaoPadrao(mes);
        S.dados.edicoes.push(e); S.selId = e.id; S.abertos = {};
        salvar(); renderTudo(); fechar(); toast('Edição de ' + e.rotulo + ' criada como rascunho.');
      });
    });
  }

  function duplicarEdicao() {
    var e = clone(edAtual()); e.id = 'ed-' + uid(); e.status = 'rascunho'; e.rotulo = e.rotulo + ' (cópia)';
    e.blocos.forEach(function (b) { b.id = uid(); });
    S.dados.edicoes.push(e); S.selId = e.id; salvar(); renderTudo(); toast('Cópia criada como rascunho.');
  }

  function colarPessoas(p) {
    modal('<h3>Colar lista de nomes</h3><p>Uma pessoa por linha, com o cargo depois de ponto e vírgula, tabulação ou travessão. Dá para colar direto do Excel.</p><div class="campo"><textarea id="lista" rows="8" placeholder="Adriane Moura Ramos de Brito; Enfermeiro(a) Auditor(a) Pl.&#10;Henrique Cunha Vieira; Analista Gestão de Risco Pl."></textarea></div>' +
      '<div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Cancelar</button><button type="button" class="bt verde" data-ok>Adicionar</button></div>', function (m, fechar) {
      m.querySelector('[data-ok]').addEventListener('click', function () {
        var l = pegar(edAtual(), p) || [];
        var novas = m.querySelector('#lista').value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var q = s.split(/\t|;| [–—-] /); return { nome: (q[0] || '').trim(), cargo: (q.slice(1).join(' ') || '').trim(), foto: '' };
        });
        var vagas = MAX_PESSOAS - l.length;
        if (novas.length > vagas) toast('O limite é 12 pessoas. Entraram as primeiras ' + vagas + '.');
        Array.prototype.push.apply(l, novas.slice(0, vagas));
        por(edAtual(), p, l); salvar(); renderEditor(); previa(true); fechar();
      });
    });
  }

  function mudarStatus(novo) {
    var e = edAtual();
    var faz = function () {
      if (novo === 'online') S.dados.edicoes.forEach(function (x) { if (x.status === 'online' && x.id !== e.id) x.status = 'arquivada'; });
      if (novo === 'espelho') S.dados.edicoes.forEach(function (x) { if (x.status === 'espelho' && x.id !== e.id) x.status = 'rascunho'; });
      e.status = novo; salvar(); renderTudo();
      sincronizar(novo === 'online' ? 'Edição de ' + e.rotulo + ' publicada no boletim.' : novo === 'espelho' ? 'Enviada para o espelho. Valide em ?espelho=true.' : 'Edição tirada do site.');
    };
    if (novo === 'online') {
      var atual = S.dados.edicoes.filter(function (x) { return x.status === 'online' && x.id !== e.id; })[0];
      confirmar('Publicar no boletim?', 'A edição de <b>' + esc(e.rotulo) + '</b> vira a atual' + (atual ? ' e a de <b>' + esc(atual.rotulo) + '</b> vai para o menu Edições' : '') + '.', 'Publicar', faz);
    } else faz();
  }

  // ---------- Publicação ----------
  function walk(o, fn) {
    if (Array.isArray(o)) o.forEach(function (v, i) { if (typeof v === 'string') o[i] = fn(v); else walk(v, fn); });
    else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string') o[k] = fn(o[k]); else walk(o[k], fn); });
  }
  function limparRicos(d) {
    d.edicoes.forEach(function (e) {
      var lr = function (o, k) { if (o && o[k]) o[k] = B.sanitizar(o[k]); };
      (e.informes && e.informes.cards || []).forEach(function (c) { lr(c, 'texto'); });
      (e.blocos || []).forEach(function (b) {
        lr(b, 'texto'); lr(b.destaque, 'texto');
        (b.itens || []).forEach(function (it) { lr(it, 'texto'); lr(it.destaque, 'texto'); });
      });
    });
  }
  function prepararSite() {
    var d = clone(S.dados);
    d.edicoes = d.edicoes.filter(function (e) { return e.status !== 'rascunho'; });
    limparRicos(d);
    d.atualizado = new Date().toISOString();
    return Promise.resolve(d);
  }

  function ghPronto() { var g = S.gh; return !!(g.owner && g.repo && g.token); }
  function caminho(arq) { var pre = (S.gh.pasta || '').replace(/^\/+|\/+$/g, ''); return (pre ? pre + '/' : '') + arq; }
  function gh(metodo, rota, corpo) {
    var g = S.gh;
    return fetch('https://api.github.com/repos/' + encodeURIComponent(g.owner) + '/' + encodeURIComponent(g.repo) + rota, {
      method: metodo,
      headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, corpo: j }; }); });
  }
  function b64utf8(s) { var b = new TextEncoder().encode(s), out = ''; for (var i = 0; i < b.length; i += 8192) out += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(out); }
  function putArquivo(arq, base64, msg) {
    var ramo = S.gh.branch || 'main';
    var rota = '/contents/' + caminho(arq).split('/').map(encodeURIComponent).join('/');
    return gh('GET', rota + '?ref=' + encodeURIComponent(ramo)).then(function (r) {
      var corpo = { message: msg, content: base64, branch: ramo };
      if (r.ok && r.corpo.sha) corpo.sha = r.corpo.sha;
      return gh('PUT', rota, corpo);
    });
  }
  function hash(s) {
    return crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('').slice(0, 16); });
  }

  var publicando = false;
  function sincronizar(msgOk) {
    if (publicando) return;
    if (!ghPronto()) {
      prepararSite().then(function (d) {
        modal('<h3>Falta conectar o GitHub</h3><p>A edição foi marcada aqui no montador. Para ela aparecer no site, conecte o GitHub (botão no topo) e clique de novo, ou baixe o <b>dados.json</b> e suba no repositório.</p>' +
          '<div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Depois</button><button type="button" class="bt cinza" data-baixa>Baixar dados.json</button><button type="button" class="bt verde" data-gh>Conectar GitHub</button></div>', function (m, fechar) {
          m.querySelector('[data-baixa]').addEventListener('click', function () { baixar('dados.json', JSON.stringify(d, null, 1)); fechar(); });
          m.querySelector('[data-gh]').addEventListener('click', function () { fechar(); modalGithub(); });
        });
      });
      return;
    }
    publicando = true; toast('Enviando para o site…', 60000);
    var enviadas = {};
    try { enviadas = JSON.parse(localStorage.getItem(ENVIADAS_KEY)) || {}; } catch (e) { enviadas = {}; }
    prepararSite().then(function (d) {
      var dataUrls = [];
      walk(d, function (v) { if (/^data:image\//.test(v) && dataUrls.indexOf(v) < 0) dataUrls.push(v); return v; });
      var mapa = {};
      return dataUrls.reduce(function (p, u) {
        return p.then(function () {
          return hash(u).then(function (h) {
            var nome = 'imagens/' + h + '.jpg';
            mapa[u] = nome;
            if (enviadas[S.gh.repo + ':' + nome]) return;
            return putArquivo(nome, u.split(',')[1], 'Imagem do boletim').then(function (r) {
              if (!r.ok) throw new Error('img ' + r.status);
              enviadas[S.gh.repo + ':' + nome] = 1;
            });
          });
        });
      }, Promise.resolve()).then(function () {
        try { localStorage.setItem(ENVIADAS_KEY, JSON.stringify(enviadas)); } catch (e) { /* noop */ }
        walk(d, function (v) { return mapa[v] || v; });
        return putArquivo('dados.json', b64utf8(JSON.stringify(d, null, 1)), 'Boletim: atualização pelo montador');
      });
    }).then(function (r) {
      publicando = false;
      if (r.ok) toast((msgOk || 'Enviado.') + ' O site atualiza em cerca de um minuto.', 5000);
      else if (r.status === 401) toast('Token inválido ou expirado. Abra o GitHub no topo e troque o token.', 6000);
      else if (r.status === 404) toast('Repositório não encontrado. Confira o nome e as permissões do token.', 6000);
      else toast('O GitHub recusou o envio (erro ' + r.status + ').', 6000);
    }).catch(function (err) {
      publicando = false;
      toast('Não consegui falar com o GitHub' + (/img/.test(err && err.message) ? ' ao enviar uma imagem' : '') + '. Tente de novo ou use Mais › Baixar dados.json.', 6500);
    });
  }

  function buscarSite(silencioso) {
    var url = 'dados.json?t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (rem) {
      var aplica = function () {
        var rascunhos = (S.dados ? S.dados.edicoes : []).filter(function (e) { return e.status === 'rascunho'; });
        var ids = rem.edicoes.map(function (e) { return e.id; });
        rem.edicoes = rem.edicoes.concat(rascunhos.filter(function (r) { return ids.indexOf(r.id) < 0; }));
        S.dados = rem; if (!S.dados.legados) S.dados.legados = [];
        S.selId = (rem.edicoes.filter(function (e) { return e.status === 'online'; })[0] || rem.edicoes[0] || {}).id || null;
        salvar(); renderTudo();
        if (!silencioso) toast('Versão publicada carregada. Seus rascunhos foram mantidos.');
      };
      if (silencioso) aplica();
      else confirmar('Buscar a versão publicada?', 'As edições que estão no site substituem as daqui. Rascunhos que só existem neste navegador são mantidos.', 'Buscar', aplica);
    }).catch(function () { if (!silencioso) toast('Não encontrei o dados.json publicado.'); throw new Error('sem'); });
  }

  // ---------- Modais de configuração ----------
  function atualizarGhBotao() { $('#gh-dot').classList.toggle('ok', ghPronto()); $('#btn-gh').title = ghPronto() ? 'Conectado a ' + S.gh.owner + '/' + S.gh.repo : 'GitHub não configurado'; }
  function modalGithub() {
    var g = S.gh;
    modal('<h3>Publicar direto no GitHub</h3><p>O montador envia o <b>dados.json</b> (e as imagens enviadas) para o repositório <b>informativoudi/boletiminterno</b>. O site atualiza sozinho. Só falta colar o token.</p>' +
      '<div class="linha"><div class="campo"><label for="g1">Usuário ou organização</label><input type="text" id="g1" value="' + esc(g.owner || '') + '" placeholder="ex.: informativoudi"></div><div class="campo"><label for="g2">Repositório</label><input type="text" id="g2" value="' + esc(g.repo || '') + '" placeholder="ex.: boletim-comunicacao-interna"></div></div>' +
      '<div class="linha"><div class="campo"><label for="g3">Branch</label><input type="text" id="g3" value="' + esc(g.branch || 'main') + '"></div><div class="campo"><label for="g4">Pasta no repositório</label><input type="text" id="g4" value="' + esc(g.pasta || '') + '" placeholder="vazio = raiz"></div></div>' +
      '<div class="campo"><label for="g5">Token de acesso</label><input type="password" id="g5" value="' + esc(g.token || '') + '" placeholder="github_pat_…" autocomplete="off"><div class="dica">Fica guardado só neste navegador. Use um <b>fine-grained token</b> só deste repositório, com permissão <i>Contents: Read and write</i>.</div></div>' +
      '<div id="g-status" class="dica" role="status"></div>' +
      '<div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Fechar</button><button type="button" class="bt cinza" data-testar>Testar conexão</button><button type="button" class="bt verde" data-salvar>Salvar</button></div>', function (m, fechar) {
      var ler = function () { return { owner: m.querySelector('#g1').value.trim(), repo: m.querySelector('#g2').value.trim(), branch: m.querySelector('#g3').value.trim() || 'main', pasta: m.querySelector('#g4').value.trim(), token: m.querySelector('#g5').value.trim() }; };
      var guarda = function () { S.gh = ler(); try { localStorage.setItem(GH_KEY, JSON.stringify(S.gh)); } catch (e) { /* noop */ } atualizarGhBotao(); };
      m.querySelector('[data-salvar]').addEventListener('click', function () { guarda(); fechar(); toast(ghPronto() ? 'GitHub configurado.' : 'Configuração salva (incompleta).'); });
      m.querySelector('[data-testar]').addEventListener('click', function () {
        guarda(); var st = m.querySelector('#g-status');
        if (!ghPronto()) { st.textContent = 'Preencha usuário, repositório e token.'; return; }
        st.textContent = 'Testando…';
        gh('GET', '').then(function (r) {
          if (r.ok) st.textContent = r.corpo.permissions && r.corpo.permissions.push ? '✓ Conectado a ' + r.corpo.full_name + ' com permissão de escrita.' : 'Conectado, mas o token não tem permissão de escrita.';
          else st.textContent = r.status === 401 ? 'Token inválido ou expirado.' : r.status === 404 ? 'Repositório não encontrado — confira o nome e as permissões do token.' : 'Erro ' + r.status + '.';
        }).catch(function () { st.textContent = 'Não consegui falar com o GitHub a partir desta página.'; });
      });
    });
  }

  function urlSite() {
    var g = S.gh;
    if (/github\.io$/.test(location.hostname)) return location.origin + location.pathname.replace(/montador\.html$/, '');
    if (g.owner && g.repo) return 'https://' + g.owner.toLowerCase() + '.github.io/' + g.repo + '/' + (g.pasta ? g.pasta.replace(/^\/+|\/+$/g, '') + '/' : '');
    return 'https://SEU-USUARIO.github.io/SEU-REPOSITORIO/';
  }
  function snippet(url, id) {
    return '<div style="width:100%">\n  <iframe id="' + id + '" src="' + url + '" title="Boletim de Comunicação Interna"\n    style="width:100%;height:2400px;border:0;display:block;overflow:hidden" scrolling="no"></iframe>\n</div>\n<script>\n(function () {\n  var f = document.getElementById("' + id + '");\n  window.addEventListener("message", function (e) {\n    if (!e.data) return;\n    if (e.data.tipo === "boletim:altura") {\n      var h = parseInt(e.data.altura, 10);\n      if (h > 200) f.style.height = h + "px";\n    }\n    if (e.data.tipo === "boletim:rolar") {\n      var y = f.getBoundingClientRect().top + window.scrollY + e.data.y;\n      window.scrollTo({ top: y, behavior: "smooth" });\n    }\n  });\n})();\n<\/script>';
  }
  function modalFramer() {
    var u = urlSite();
    modal('<h3>Código para o Framer</h3><p>Cole cada código num bloco <b>Embed</b> (HTML) do Framer. A página principal mostra a edição atual; a de validação mostra o espelho.</p>' +
      '<div class="campo"><label>Página principal</label><pre id="s1">' + esc(snippet(u, 'boletim')) + '</pre><button type="button" class="mini" data-copia="s1" style="margin-top:6px">Copiar</button></div>' +
      '<div class="campo"><label>Página de validação (espelho)</label><pre id="s2">' + esc(snippet(u + '?espelho=true', 'boletim-espelho')) + '</pre><button type="button" class="mini" data-copia="s2" style="margin-top:6px">Copiar</button></div>' +
      (u.indexOf('SEU-') >= 0 ? '<div class="alerta">Configure o GitHub para o endereço do site sair preenchido.</div>' : '') +
      '<div class="modal-acoes"><button type="button" class="bt verde" data-fechar>Pronto</button></div>', function (m) {
      m.querySelectorAll('[data-copia]').forEach(function (b) {
        b.addEventListener('click', function () { navigator.clipboard.writeText(m.querySelector('#' + b.dataset.copia).textContent).then(function () { b.textContent = 'Copiado ✓'; }); });
      });
    });
  }

  function modalLegados() {
    var leg = clone(S.dados.legados || []);
    var desenha = function (m) {
      m.querySelector('#leg').innerHTML = leg.map(function (l, i) {
        return '<div class="flex" style="margin-top:8px"><input type="text" data-k="rotulo" data-i="' + i + '" value="' + esc(l.rotulo) + '" placeholder="Edição de 03/09/26" style="flex:.8"><input type="url" data-k="url" data-i="' + i + '" value="' + esc(l.url) + '" placeholder="https://…"><button type="button" class="ib perigo" data-x="' + i + '" aria-label="Remover">' + ic.del + '</button></div>';
      }).join('') || '<p style="margin-top:8px">Nenhuma.</p>';
    };
    modal('<h3>Edições antigas</h3><p>Links das edições feitas no Framer. Aparecem no menu <b>Edições</b>, depois das edições do montador.</p><div id="leg"></div>' +
      '<button type="button" class="add" data-mais>+ Edição antiga</button><div class="modal-acoes"><button type="button" class="bt cinza" data-fechar>Cancelar</button><button type="button" class="bt verde" data-ok>Salvar</button></div>', function (m, fechar) {
      desenha(m);
      m.addEventListener('input', function (e) { var t = e.target; if (t.dataset.k) leg[t.dataset.i][t.dataset.k] = t.value; });
      m.addEventListener('click', function (e) {
        var x = e.target.closest('[data-x]'); if (x) { leg.splice(+x.dataset.x, 1); desenha(m); }
        if (e.target.closest('[data-mais]')) { leg.push(MODELOS.legado()); desenha(m); }
      });
      m.querySelector('[data-ok]').addEventListener('click', function () { S.dados.legados = leg.filter(function (l) { return l.rotulo && l.url; }); salvar(); previa(true); fechar(); toast('Edições antigas salvas. Publique para levar ao site.'); });
    });
  }

  function baixar(nome, conteudo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
    a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('#arquivo-json').addEventListener('change', function () {
    var f = this.files[0]; this.value = ''; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (!d || !Array.isArray(d.edicoes)) throw new Error('formato');
      confirmar('Restaurar backup?', 'As edições deste navegador serão trocadas pelas do arquivo (' + d.edicoes.length + ' edições).', 'Restaurar', function () {
        S.dados = d; if (!d.legados) d.legados = []; S.selId = (d.edicoes[0] || {}).id || null; salvar(); renderTudo(); toast('Backup restaurado.');
      });
    }).catch(function () { toast('Esse arquivo não é um backup do montador.'); });
  });

  // ---------- Início ----------
  function iniciar() {
    var salvo = {};
    try { salvo = JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch (e) { salvo = {}; }
    S.gh = Object.assign({}, REPO_PADRAO, salvo);
    if (!S.gh.owner) S.gh.owner = REPO_PADRAO.owner;
    if (!S.gh.repo) S.gh.repo = REPO_PADRAO.repo;
    ligarEditor();
    var vazio = function () { S.dados = { v: 1, legados: [], edicoes: [] }; };
    abrirDB().then(lerLocal).then(function (d) {
      if (d && Array.isArray(d.edicoes)) {
        S.dados = d; if (!d.legados) d.legados = [];
        var on = d.edicoes.filter(function (e) { return e.status !== 'arquivada'; }).sort(function (a, b) { return String(b.mes).localeCompare(String(a.mes)); })[0];
        S.selId = (on || d.edicoes[0] || {}).id || null;
        renderTudo(); return;
      }
      // Primeira vez neste navegador: começa pelo que está publicado.
      vazio(); renderTudo();
      return buscarSite(true).catch(function () { renderTudo(); });
    });
    $('#frame').addEventListener('load', function () { setTimeout(function () { if (!previaPronta) { previaPronta = true; enviarPrevia(); } }, 400); });
  }
  iniciar();
})();
