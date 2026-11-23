/* Boletim de Comunicação Interna — Grupo Unimed Uberlândia
   Renderizador único: a página publicada (index.html) e a prévia do montador
   desenham o boletim com este mesmo código, a partir de dados.json. */
(function () {
  'use strict';

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  var MENU = [
    { id: 'inicio', rotulo: 'Início' },
    { id: 'acontece', rotulo: 'Acontece na Unimed' },
    { id: 'eventos', rotulo: 'Eventos e Ações' },
    { id: 'gestao', rotulo: 'Gente e Gestão' },
    { id: 'gentenova', rotulo: 'Gente Nova' },
    { id: 'edicoes', rotulo: 'Edições' }
  ];

  var ICONES = {
    quadro: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    grafico: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    camadas: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    cultura: '<path d="M3 6h7M3 12h7M3 18h7"/><circle cx="17" cy="8" r="3"/><path d="M12.5 19a4.5 4.5 0 0 1 9 0"/>',
    pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>',
    coracao: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/>',
    livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 19.5"/>',
    megafone: '<path d="M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    trofeu: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>'
  };

  function icone(nome, tam) {
    var p = ICONES[nome] || ICONES.quadro;
    return '<svg aria-hidden="true" width="' + (tam || 16) + '" height="' + (tam || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function urlSegura(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:|#|\.{0,2}\/|data:image\/|imagens\/|assets\/)/i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://' + u;
    return '';
  }

  // Texto rico: só as marcas que o montador produz.
  var PERMITIDAS = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, MARK: 1, UL: 1, OL: 1, LI: 1, SPAN: 1 };
  function sanitizar(html) {
    html = String(html || '');
    if (!/[<>]/.test(html)) {
      var partes = html.split(/\n{2,}/).map(function (p) { return esc(p).replace(/\n/g, '<br>'); });
      return partes.filter(Boolean).map(function (p) { return '<p>' + p + '</p>'; }).join('');
    }
    var doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    var raiz = doc.body.firstChild;
    var desembrulha = function (f) { while (f.firstChild) f.parentNode.insertBefore(f.firstChild, f); f.remove(); };
    (function limpa(no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (f) {
        if (f.nodeType === 3) return;
        if (f.nodeType !== 1) { f.remove(); return; }
        var tag = f.tagName.toUpperCase();
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|TITLE|META|LINK|HEAD|XML|SVG|TEMPLATE|NOSCRIPT)$/.test(tag)) { f.remove(); return; }
        limpa(f); // filhos primeiro: o que for desembrulhado já sai limpo
        if (tag === 'DIV' || /^H[1-6]$/.test(tag)) {
          if (f.querySelector('p,ul,ol')) { desembrulha(f); return; }
          var p = doc.createElement('p');
          if (/^H/.test(tag)) { var b = doc.createElement('strong'); while (f.firstChild) b.appendChild(f.firstChild); p.appendChild(b); }
          else while (f.firstChild) p.appendChild(f.firstChild);
          f.replaceWith(p); return;
        }
        if (!PERMITIDAS[tag] || tag === 'SPAN') { desembrulha(f); return; }
        var href = tag === 'A' ? urlSegura(f.getAttribute('href')) : '';
        var cls = tag === 'MARK' ? (f.getAttribute('class') || '').split(/\s+/).filter(function (c) { return /^r-[a-z]+$/.test(c); }).join(' ') : '';
        Array.prototype.slice.call(f.attributes).forEach(function (a) { f.removeAttribute(a.name); });
        if (tag === 'A') {
          if (!href) { desembrulha(f); return; }
          f.setAttribute('href', href); f.setAttribute('target', '_blank'); f.setAttribute('rel', 'noopener');
        }
        if (tag === 'MARK') f.setAttribute('class', cls || 'r-amarelo');
        if (tag === 'P' && !f.textContent.trim() && !f.querySelector('br')) f.remove();
      });
    })(raiz);
    return raiz.innerHTML;
  }

  function rotuloMes(aaaamm) {
    var m = /^(\d{4})-(\d{2})$/.exec(aaaamm || '');
    if (!m) return '';
    return MESES[parseInt(m[2], 10) - 1] + '/' + m[1].slice(2);
  }

  // ---------- Mídia ----------
  function infoVideo(url) {
    url = String(url || '').trim();
    var m;
    if ((m = /youtube\.com\/shorts\/([\w-]{6,})/.exec(url))) return { tipo: 'iframe', src: 'https://www.youtube.com/embed/' + m[1] + '?rel=0', vertical: true };
    if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/.exec(url))) return { tipo: 'iframe', src: 'https://www.youtube.com/embed/' + m[1] + '?rel=0' };
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url))) return { tipo: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { tipo: 'arquivo', src: url };
    return { tipo: 'link', src: url };
  }

  function ehVideo(m) {
    if (!m) return false;
    if (m.tipo) return m.tipo === 'video';
    return /youtu|vimeo|\.(mp4|webm|mov)(\?|$)/i.test(m.url || '');
  }

  function htmlVideo(m) {
    var v = infoVideo(m.url);
    var u = urlSegura(v.src);
    if (!u) return '';
    if (v.tipo === 'iframe') return '<div class="bl-video' + (v.vertical || m.vertical ? ' vertical' : '') + '"><iframe src="' + esc(u) + '" title="' + esc(m.legenda || 'Vídeo') + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    if (v.tipo === 'arquivo') return '<div class="bl-video' + (m.vertical ? ' vertical' : '') + '"><video src="' + esc(u) + '" controls playsinline preload="metadata"></video></div>';
    return '<div class="bl-video"><a class="bl-video-link" href="' + esc(u) + '" target="_blank" rel="noopener"><svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>Assistir ao vídeo</a></div>';
  }

  function htmlImg(m, alt) {
    var u = urlSegura(m.url);
    if (!u) return '';
    return '<img src="' + esc(u) + '" alt="' + esc(m.legenda || alt || '') + '" loading="lazy">';
  }

  function htmlMidia(midias, alt, opts) {
    var lista = (midias || []).filter(function (m) { return m && urlSegura(m.url); }).slice(0, 10);
    if (!lista.length) return opts && opts.preview ? '<div class="bl-midia"><div class="bl-vazio-midia">Sem foto ou vídeo</div></div>' : '';
    var item = function (m) { return ehVideo(m) ? htmlVideo(m) : htmlImg(m, alt); };
    if (lista.length === 1) {
      var leg = lista[0].legenda && !ehVideo(lista[0]) ? '<div class="bl-legenda">' + esc(lista[0].legenda) + '</div>' : '';
      return '<div class="bl-midia bl-midia-uma">' + item(lista[0]) + leg + '</div>';
    }
    if (lista.length === 2) return '<div class="bl-midia bl-midia-duas">' + lista.map(item).join('') + '</div>';
    return '<div class="bl-midia">' + htmlCarrossel(lista.map(function (m) { return '<div class="bl-slide">' + item(m) + '</div>'; }), alt) + '</div>';
  }

  function setas() {
    return '<button type="button" class="bl-seta bl-seta--esq" data-dir="-1" aria-label="Anterior"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>' +
      '<button type="button" class="bl-seta bl-seta--dir" data-dir="1" aria-label="Próximo"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>';
  }

  function htmlCarrossel(slides, rotulo) {
    var pontos = slides.map(function (_, i) { return '<button type="button" class="bl-ponto" data-i="' + i + '" aria-label="Ir para ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '></button>'; }).join('');
    return '<div class="bl-carrossel" role="region" aria-roledescription="carrossel" aria-label="' + esc(rotulo || 'Galeria') + '"><div class="bl-carrossel-trilho">' + slides.join('') + '</div>' + setas() + '<div class="bl-pontos">' + pontos + '</div></div>';
  }

  // ---------- Blocos ----------
  function htmlBotoes(botoes) {
    var b = (botoes || []).filter(function (x) { return x && x.texto && urlSegura(x.url); });
    if (!b.length) return '';
    return '<div class="bl-botoes">' + b.map(function (x) {
      return '<a class="bl-btn b-' + esc(x.cor || 'verde') + '" href="' + esc(urlSegura(x.url)) + '" target="_blank" rel="noopener">' + esc(x.texto) +
        '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
    }).join('') + '</div>';
  }

  function htmlDestaque(d) {
    if (!d || !String(d.texto || '').replace(/<[^>]*>/g, '').trim()) return '';
    return '<div class="bl-destaque c-' + esc(d.cor || 'verde') + '">' + sanitizar(d.texto) + '</div>';
  }

  function htmlNoticia(n, opts, tag) {
    var disp = n.disposicao || 'esquerda';
    var midia = disp === 'texto' ? '' : htmlMidia(n.midias, n.titulo, opts);
    if (!midia) disp = 'texto';
    var corpo = '<div class="bl-corpo">' + (tag ? '<span class="bl-tag">' + esc(tag) + '</span>' : '') +
      (n.titulo ? '<h3 class="bl-titulo">' + esc(n.titulo) + '</h3>' : '') +
      (n.texto ? '<div class="bl-texto">' + sanitizar(n.texto) + '</div>' : '') +
      htmlDestaque(n.destaque) + htmlBotoes(n.botoes) + '</div>';
    return '<div class="bl-noticia disp-' + esc(disp) + '">' + midia + corpo + '</div>';
  }

  function nomeSecao(b) { return b.secao ? '<div class="bl-secao-nome">' + esc(b.secao) + '</div>' : ''; }

  function blocoNoticia(b, opts) { return nomeSecao(b) + htmlNoticia(b, opts); }

  function blocoGestao(b, opts, idx) {
    var cats = (b.categorias || []).filter(function (c) { return c && c.nome; });
    if (!cats.length) cats = [{ nome: 'Geral', icone: 'quadro' }];
    var itensDe = function (c) { return Array.isArray(c.itens) ? c.itens : (b.itens || []).filter(function (it) { return (it.categoria || cats[0].nome) === c.nome; }); };
    var abas = cats.map(function (c, i) {
      var n = itensDe(c).length;
      return '<button type="button" role="tab" class="bl-aba" id="aba-' + idx + '-' + i + '" aria-controls="painel-' + idx + '-' + i + '" aria-selected="' + (i ? 'false' : 'true') + '" tabindex="' + (i ? '-1' : '0') + '">' + icone(c.icone) + '<span>' + esc(c.nome) + '</span>' +
        (n ? '<b class="bl-aba-n" aria-label="' + n + ' notícia' + (n > 1 ? 's' : '') + '">' + n + '</b>' : '') + '</button>';
    }).join('');
    var seta = function (lado) {
      return '<button type="button" class="bl-abas-seta bl-abas-seta--' + lado + '" data-lado="' + (lado === 'esq' ? -1 : 1) + '" aria-label="' + (lado === 'esq' ? 'Categorias anteriores' : 'Mais categorias') + '" tabindex="-1">' +
        '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + (lado === 'esq' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6') + '"/></svg></button>';
    };
    var paineis = cats.map(function (c, i) {
      var itens = itensDe(c);
      var conteudo = itens.length ? itens.map(function (it) { return '<div class="bl-gestao-item">' + htmlNoticia(it, opts, c.nome) + '</div>'; }).join('')
        : '<div class="bl-gestao-vazio">Em breve, novidades de ' + esc(c.nome) + '.</div>';
      var outras = cats.length > 1 ? '<div class="bl-outras"><span>Outras categorias</span>' + cats.map(function (o, j) {
        return j === i ? '' : '<button type="button" class="bl-outra" data-ir-aba="aba-' + idx + '-' + j + '">' + icone(o.icone, 14) + esc(o.nome) + '</button>';
      }).join('') + '</div>' : '';
      return '<div role="tabpanel" class="bl-painel" id="painel-' + idx + '-' + i + '" aria-labelledby="aba-' + idx + '-' + i + '"' + (i ? ' hidden' : '') + '>' + conteudo + outras + '</div>';
    }).join('');
    return nomeSecao(b) + '<div class="bl-abas-wrap">' + seta('esq') + '<div class="bl-abas" role="tablist" aria-label="' + esc(b.secao || 'Categorias') + '">' + abas + '</div>' + seta('dir') + '</div>' + paineis;
  }

  function blocoCaixas(b) {
    var itens = (b.itens || []).filter(function (i) { return i && (i.texto || i.marca); });
    return nomeSecao(b) + '<div class="bl-caixas c-' + esc(b.cor || 'verde') + '">' + itens.map(function (i) {
      var link = urlSegura(i.link) ? ' <a href="' + esc(urlSegura(i.link)) + '" target="_blank" rel="noopener">' + esc(i.linkTexto || 'Leia mais') + '</a>' : '';
      var txt = sanitizar(i.texto).replace(/<\/p>$/, link + '</p>');
      if (link && txt.indexOf(link) < 0) txt += link;
      return '<div class="bl-caixa"><div class="bl-caixa-marca">' + esc(i.marca) + '</div><div class="bl-caixa-barra"></div><div class="bl-caixa-txt">' + txt + '</div></div>';
    }).join('') + '</div>';
  }

  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  function blocoPessoas(b) {
    var lideres = b.variante === 'lideres';
    var cor = b.cor || (lideres ? 'petroleo' : 'verde');
    var pessoas = (b.pessoas || []).filter(function (p) { return p && (p.nome || p.foto); }).slice(0, 12);
    var n = pessoas.length;
    var classeGrade = n === 1 ? ' so1' : n === 2 ? ' so2' : (n === 4 || n === 7 || n === 8 || n > 9 ? ' mais' : '');
    var topo = '<div class="bl-pessoas-topo c-' + esc(cor) + '"><span class="bl-folha" aria-hidden="true"></span>' +
      '<h2>' + esc(b.titulo || '') + '</h2><div class="bl-pessoas-linha">' +
      (b.subtitulo ? '<span class="bl-pessoas-sub">' + esc(b.subtitulo) + '</span>' : '<span></span>') +
      (b.mes ? '<span class="bl-pessoas-mes"><i aria-hidden="true"></i>' + esc(b.mes) + '</span>' : '') + '</div></div>';
    var grade = '<div class="bl-grade' + classeGrade + '">' + pessoas.map(function (p) {
      var u = urlSegura(p.foto);
      var foto = u ? '<img src="' + esc(u) + '" alt="' + esc(p.nome) + '" loading="lazy">' : '<div class="bl-iniciais" aria-hidden="true">' + esc(iniciais(p.nome)) + '</div>';
      return '<div class="bl-pessoa"><div class="bl-foto">' + foto + '<span class="bl-folha" aria-hidden="true"></span></div><div class="bl-pessoa-nome">' + esc(p.nome) + '</div>' + (p.cargo ? '<div class="bl-pessoa-cargo">' + esc(p.cargo) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    var logo = (lideres ? b.mostrarLogo !== false : b.mostrarLogo) ? '<div class="bl-faixa-grupo"><img src="assets/img/grupo-branco.png" alt="Grupo Unimed Uberlândia"></div>' : '';
    return '<div class="' + (lideres ? 'bl-lideres' : 'bl-gentenova') + '">' + topo + grade + logo + '</div>';
  }

  // ---------- Página ----------
  function edicoesPublicas(dados) {
    return (dados.edicoes || []).filter(function (e) { return e.status === 'online' || e.status === 'arquivada'; })
      .sort(function (a, b) { return String(b.mes || '').localeCompare(String(a.mes || '')); });
  }

  function escolherEdicao(dados, params) {
    var eds = dados.edicoes || [];
    var porId = params.get('edicao');
    if (porId) { var e = eds.filter(function (x) { return x.id === porId && x.status !== 'rascunho'; })[0]; if (e) return e; }
    if (params.get('espelho') === 'true') {
      var esp = eds.filter(function (x) { return x.status === 'espelho'; }).sort(function (a, b) { return String(b.mes).localeCompare(String(a.mes)); })[0];
      if (esp) return esp;
    }
    return eds.filter(function (x) { return x.status === 'online'; })[0] || edicoesPublicas(dados)[0] || null;
  }

  function htmlMenu(ed, presentes) {
    return '<nav class="bl-menu" aria-label="Seções do boletim"><div class="bl-menu-topo"><span class="bl-menu-marca">Comunicação Interna</span>' +
      '<button type="button" class="bl-burger" aria-expanded="false" aria-controls="bl-menu-itens" aria-label="Abrir menu"><span></span><span></span><span></span></button></div>' +
      '<div class="bl-menu-in" id="bl-menu-itens">' + MENU.filter(function (m) {
      return m.id === 'inicio' || m.id === 'edicoes' || presentes[m.id];
    }).map(function (m) {
      if (m.id === 'edicoes') return '<div class="bl-edicoes"><button type="button" class="bl-pill bl-pill--edicoes" aria-expanded="false" aria-haspopup="true" data-edicoes>' + m.rotulo + '</button></div>';
      return '<a class="bl-pill bl-pill--' + m.id + '" href="#' + (m.id === 'inicio' ? 'inicio' : 'sec-' + m.id) + '">' + m.rotulo + '</a>';
    }).join('') + '</div></nav>';
  }

  function htmlPainelEdicoes(dados, ed, opts) {
    var base = opts.linkBase || '';
    var lista = edicoesPublicas(dados).map(function (e) {
      var atual = e.id === ed.id;
      return '<a href="' + esc(base + '?edicao=' + encodeURIComponent(e.id)) + '"' + (atual ? ' aria-current="page"' : '') + '>Edição de ' + esc(e.rotulo || rotuloMes(e.mes)) + (e.status === 'online' ? '<span>atual</span>' : '') + '</a>';
    }).join('');
    var leg = (dados.legados || []).map(function (l) {
      return '<a href="' + esc(urlSegura(l.url)) + '" target="_top">' + esc(l.rotulo) + '<span>arquivo</span></a>';
    }).join('');
    return '<div class="bl-edicoes-painel" role="menu" aria-label="Edições anteriores"><h3>Edições</h3>' + (lista || '') + (leg || '') + (!lista && !leg ? '<p style="padding:8px 12px;font-size:13px;color:#777">Nenhuma edição anterior ainda.</p>' : '') + '</div>';
  }

  function render(raiz, dados, ed, opts) {
    opts = opts || {};
    if (!ed) { raiz.innerHTML = '<div class="bl-aviso">Nenhuma edição publicada ainda.</div>'; return; }
    var blocos = ed.blocos || [];
    var presentes = {}, primeiro = {};
    blocos.forEach(function (b, i) { if (b.menu && !presentes[b.menu]) { presentes[b.menu] = true; primeiro[i] = b.menu; } });
    var rot = ed.rotulo || rotuloMes(ed.mes);

    var h = '';
    if (ed.status === 'espelho' && !opts.preview) h += '<div class="bl-tarja-espelho">Espelho · edição em validação</div>';
    h += htmlMenu(ed, presentes);
    h += '<header class="bl-capa" id="inicio"><div class="bl-capa-padrao" aria-hidden="true"></div><div class="bl-capa-txt"><div class="bl-capa-ed">Edição de ' + esc(rot) + '</div><h1>Comunicação Interna</h1><p class="bl-capa-sub">Confira o Boletim do Grupo<br>Unimed Uberlândia!</p></div><div class="bl-capa-ilustra" role="img" aria-label="Ilustração da Comunicação Interna"></div></header>';

    var faixa = (ed.faixa || []).filter(function (f) { return String(f || '').trim(); });
    if (faixa.length) {
      var itens = faixa.map(function (f) { return '<span class="bl-faixa-item">' + esc(f) + '</span>'; }).join('');
      var dur = Math.max(18, faixa.join('').length * 0.32);
      h += '<div class="bl-faixa" aria-label="Destaques da edição"><div class="bl-faixa-trilho" style="--dur:' + dur.toFixed(0) + 's">' + itens + '<span aria-hidden="true" style="display:contents">' + itens + '</span></div></div>';
    }

    h += '<main class="bl-wrap">';
    var inf = ed.informes || {};
    var cards = (inf.cards || []).filter(function (c) { return c && (c.titulo || c.texto); });
    if (cards.length || inf.titulo) {
      h += '<section class="bl-informes" aria-labelledby="inf-tit"><h2 id="inf-tit">' + esc(inf.titulo || 'Informes Gerais: comece por aqui!') + '</h2>' +
        (inf.subtitulo ? '<p class="bl-informes-sub">' + esc(inf.subtitulo) + '</p>' : '') +
        (cards.length ? '<div class="bl-cards"><div class="bl-cards-trilho">' + cards.map(function (c) {
          var link = urlSegura(c.link) ? '<a class="bl-card-link" href="' + esc(urlSegura(c.link)) + '" target="_blank" rel="noopener">' + esc(c.linkTexto || 'Saiba mais') + '</a>' : '';
          return '<article class="bl-card bl-cor-' + esc(c.cor || 'azul') + '"><h3>' + (c.icone ? '<span aria-hidden="true">' + esc(c.icone) + '</span>' : '') + esc(c.titulo) + '</h3><div class="bl-card-txt">' + sanitizar(c.texto) + '</div>' + link + '</article>';
        }).join('') + '</div>' + (cards.length > 2 ? setas() + '<div class="bl-pontos" data-pontos-cards></div>' : '') + '</div>' : '') + '</section>';
    }

    blocos.forEach(function (b, i) {
      var conteudo = '';
      if (b.tipo === 'gestao') conteudo = blocoGestao(b, opts, i);
      else if (b.tipo === 'caixas') conteudo = blocoCaixas(b);
      else if (b.tipo === 'pessoas') conteudo = blocoPessoas(b);
      else conteudo = blocoNoticia(b, opts);
      var ancora = primeiro[i] ? ' id="sec-' + primeiro[i] + '"' : '';
      h += '<section class="bl-secao" data-bloco="' + i + '"' + ancora + '>' + conteudo + '</section>';
    });
    h += '</main>';

    var rod = ed.rodape || {};
    h += '<footer class="bl-rodape"><hr><p class="bl-rodape-txt">' + esc(rod.texto || 'Até a próxima edição! 👋🏻') + '</p><div class="bl-rodape-logos"><img src="assets/img/unimed-55-anos.svg" alt="Unimed Uberlândia · 55 anos"></div>' +
      (rod.ans ? '<img class="bl-rodape-ans" src="assets/img/ans.png" alt="ANS nº 384577">' : '') + '</footer>';
    h += htmlPainelEdicoes(dados, ed, opts);

    raiz.innerHTML = h;
    if (opts.preview && !raiz.__trava) {
      // Na prévia do montador, links internos não tiram a prévia do lugar.
      raiz.__trava = true;
      raiz.addEventListener('click', function (e) {
        var a = e.target.closest('a[href]');
        if (a && (a.getAttribute('href').charAt(0) === '?' || a.target === '_top')) e.preventDefault();
      });
    }
    ativar(raiz);
  }

  // ---------- Interações ----------
  var painelAtual = null, ouvindoPainel = false;
  function ativar(raiz) {
    raiz.querySelectorAll('.bl-carrossel').forEach(iniciarCarrossel);
    raiz.querySelectorAll('.bl-cards').forEach(iniciarCards);
    raiz.querySelectorAll('[role="tablist"]').forEach(iniciarAbas);
    raiz.querySelectorAll('.bl-midia-uma img').forEach(function (img) {
      var marca = function () {
        if (img.naturalWidth && img.naturalHeight / img.naturalWidth > 1.1) {
          var n = img.closest('.bl-noticia'); if (n) n.classList.add('vertical');
        }
      };
      if (img.complete) marca(); else img.addEventListener('load', marca);
    });
    var burger = raiz.querySelector('.bl-burger');
    var nav = raiz.querySelector('.bl-menu');
    var fecharMenu = function () { nav.classList.remove('aberto'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menu'); avisarAltura(); };
    if (burger) {
      burger.addEventListener('click', function () {
        var ab = !nav.classList.contains('aberto');
        nav.classList.toggle('aberto', ab);
        burger.setAttribute('aria-expanded', ab ? 'true' : 'false');
        burger.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu');
        avisarAltura();
      });
      raiz.querySelectorAll('.bl-menu a').forEach(function (a) { a.addEventListener('click', fecharMenu); });
    }
    // Dentro do embed (iframe com altura total) quem rola é a página do Framer.
    raiz.querySelectorAll('.bl-menu a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var alvo = raiz.querySelector(a.getAttribute('href'));
        if (!alvo) return;
        e.preventDefault();
        var y = alvo.getBoundingClientRect().top + window.scrollY - 64;
        if (window.parent !== window) window.parent.postMessage({ tipo: 'boletim:rolar', y: Math.max(0, y) }, '*');
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      });
    });
    var btn = raiz.querySelector('[data-edicoes]');
    var painel = raiz.querySelector('.bl-edicoes-painel');
    if (btn && painel) {
      var fechar = function () { painel.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (painel.classList.contains('aberto')) { fechar(); return; }
        var r = btn.getBoundingClientRect();
        painel.style.top = (r.bottom + 8) + 'px';
        painel.style.left = Math.max(8, Math.min(window.innerWidth - 260, r.right - 240)) + 'px';
        painel.classList.add('aberto'); btn.setAttribute('aria-expanded', 'true');
      });
      painelAtual = { painel: painel, fechar: fechar };
      if (!ouvindoPainel) {
        ouvindoPainel = true;
        document.addEventListener('click', function (e) { if (painelAtual && !painelAtual.painel.contains(e.target)) painelAtual.fechar(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && painelAtual) painelAtual.fechar(); });
        window.addEventListener('scroll', function () { if (painelAtual) painelAtual.fechar(); }, { passive: true });
      }
    }
  }

  function iniciarCarrossel(c) {
    var trilho = c.querySelector('.bl-carrossel-trilho');
    var slides = trilho.children.length;
    var pontos = c.querySelectorAll('.bl-ponto');
    var i = 0, timer = null;
    var ir = function (n) {
      i = (n + slides) % slides;
      trilho.style.transform = 'translateX(' + (-100 * i) + '%)';
      pontos.forEach(function (p, k) { p.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    };
    var auto = function () { clearInterval(timer); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { if (!c.isConnected) { clearInterval(timer); return; } ir(i + 1); }, 5000); };
    c.querySelectorAll('.bl-seta').forEach(function (b) { b.addEventListener('click', function () { ir(i + parseInt(b.dataset.dir, 10)); auto(); }); });
    pontos.forEach(function (p) { p.addEventListener('click', function () { ir(parseInt(p.dataset.i, 10)); auto(); }); });
    c.addEventListener('mouseenter', function () { clearInterval(timer); });
    c.addEventListener('mouseleave', auto);
    var x0 = null;
    c.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    c.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { ir(i + (dx < 0 ? 1 : -1)); auto(); }
    });
    var primeira = c.querySelector('img');
    var ajusta = function () {
      if (!primeira || !primeira.naturalWidth) return;
      var r = primeira.naturalWidth / primeira.naturalHeight;
      r = Math.max(0.75, Math.min(1.78, r));
      c.style.setProperty('--ar', r.toFixed(3));
    };
    if (primeira) { if (primeira.complete) ajusta(); else primeira.addEventListener('load', ajusta); }
    auto();
  }

  function iniciarCards(box) {
    var t = box.querySelector('.bl-cards-trilho');
    var cont = box.querySelector('[data-pontos-cards]');
    var passo = function () { var c = t.querySelector('.bl-card'); return c ? c.getBoundingClientRect().width + 18 : t.clientWidth; };
    box.querySelectorAll('.bl-seta').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = parseInt(b.dataset.dir, 10);
        var fim = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
        if (d > 0 && fim) t.scrollLeft = 0; else if (d < 0 && t.scrollLeft <= 2) t.scrollLeft = t.scrollWidth; else t.scrollLeft += d * passo();
      });
    });
    if (!cont) return;
    var n = t.querySelectorAll('.bl-card').length;
    for (var k = 0; k < n; k++) {
      var p = document.createElement('button'); p.type = 'button'; p.className = 'bl-ponto'; p.setAttribute('aria-label', 'Card ' + (k + 1));
      (function (k) { p.addEventListener('click', function () { t.scrollLeft = k * passo(); }); })(k);
      cont.appendChild(p);
    }
    var marca = function () {
      var k = Math.round(t.scrollLeft / passo());
      cont.querySelectorAll('.bl-ponto').forEach(function (p, j) { p.setAttribute('aria-current', j === k ? 'true' : 'false'); });
    };
    t.addEventListener('scroll', function () { requestAnimationFrame(marca); }, { passive: true });
    marca();
  }

  function iniciarAbas(lista) {
    var abas = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    var secao = lista.closest('.bl-secao') || lista;
    var rolarAteAbas = function () {
      var topoMenu = (document.querySelector('.bl-menu') || { offsetHeight: 0 }).offsetHeight;
      var y = secao.getBoundingClientRect().top + window.scrollY - topoMenu - 8;
      if (window.parent !== window) window.parent.postMessage({ tipo: 'boletim:rolar', y: Math.max(0, y) }, '*');
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };
    var wrap = lista.closest('.bl-abas-wrap');
    var bordas = function () {
      if (!wrap) return;
      var max = lista.scrollWidth - lista.clientWidth;
      wrap.classList.toggle('tem-esq', lista.scrollLeft > 8);
      wrap.classList.toggle('tem-dir', lista.scrollLeft < max - 8);
    };
    if (wrap) {
      wrap.querySelectorAll('.bl-abas-seta').forEach(function (b) {
        b.addEventListener('click', function () { lista.scrollBy({ left: parseInt(b.dataset.lado, 10) * lista.clientWidth * 0.7, behavior: 'smooth' }); });
      });
      lista.addEventListener('scroll', function () { requestAnimationFrame(bordas); }, { passive: true });
      window.addEventListener('resize', bordas);
      setTimeout(bordas, 60);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(bordas);
    }
    var mostraAba = function (aba) {
      var l = aba.offsetLeft - 64, r = aba.offsetLeft + aba.offsetWidth + 64;
      if (l < lista.scrollLeft) lista.scrollTo({ left: l, behavior: 'smooth' });
      else if (r > lista.scrollLeft + lista.clientWidth) lista.scrollTo({ left: r - lista.clientWidth, behavior: 'smooth' });
    };
    var escolhe = function (aba, foco, rolar) {
      mostraAba(aba);
      abas.forEach(function (a) {
        var sel = a === aba;
        a.setAttribute('aria-selected', sel ? 'true' : 'false');
        a.tabIndex = sel ? 0 : -1;
        var p = document.getElementById(a.getAttribute('aria-controls'));
        if (p) p.hidden = !sel;
      });
      if (foco) aba.focus({ preventScroll: true });
      if (rolar || lista.getBoundingClientRect().top < 0) rolarAteAbas();
      avisarAltura();
    };
    abas.forEach(function (a, i) {
      a.addEventListener('click', function () { escolhe(a); });
      a.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') escolhe(abas[(i + 1) % abas.length], true);
        if (e.key === 'ArrowLeft') escolhe(abas[(i - 1 + abas.length) % abas.length], true);
      });
    });
    secao.querySelectorAll('[data-ir-aba]').forEach(function (b) {
      b.addEventListener('click', function () {
        var alvo = document.getElementById(b.dataset.irAba);
        if (alvo) escolhe(alvo, true, true);
      });
    });
  }

  // ---------- Altura para o embed do Framer ----------
  var ultimaAltura = 0;
  function avisarAltura() {
    if (window.parent === window) return;
    requestAnimationFrame(function () {
      var h = Math.ceil(document.documentElement.scrollHeight);
      if (Math.abs(h - ultimaAltura) < 2) return;
      ultimaAltura = h;
      window.parent.postMessage({ tipo: 'boletim:altura', altura: h }, '*');
    });
  }

  window.Boletim = {
    render: render, sanitizar: sanitizar, escolherEdicao: escolherEdicao, rotuloMes: rotuloMes,
    edicoesPublicas: edicoesPublicas, ICONES: ICONES, icone: icone, MESES: MESES, avisarAltura: avisarAltura, urlSegura: urlSegura
  };

  // ---------- Inicialização da página ----------
  function iniciarPagina() {
    var raiz = document.getElementById('boletim');
    if (!raiz) return;
    var params = new URLSearchParams(location.search);
    if ('ResizeObserver' in window) new ResizeObserver(avisarAltura).observe(document.body);
    window.addEventListener('load', avisarAltura);

    if (params.get('preview') === '1') {
      // Prévia dentro do montador: os dados chegam por mensagem.
      var y = 0;
      window.addEventListener('message', function (e) {
        var d = e.data;
        if (!d || d.tipo !== 'boletim:preview') return;
        y = window.scrollY;
        render(raiz, d.dados, d.edicao, { preview: true, linkBase: '' });
        if (d.rolarPara != null) {
          var alvo = raiz.querySelector('[data-bloco="' + d.rolarPara + '"]');
          if (alvo) alvo.scrollIntoView({ block: 'start' });
        } else window.scrollTo(0, y);
      });
      window.parent.postMessage({ tipo: 'boletim:pronto' }, '*');
      return;
    }

    fetch('dados.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (dados) {
        var ed = escolherEdicao(dados, params);
        if (ed) document.title = 'Boletim · Edição de ' + (ed.rotulo || rotuloMes(ed.mes)) + ' · Grupo Unimed Uberlândia';
        render(raiz, dados, ed, { linkBase: location.pathname });
        if (location.hash) { var a = document.querySelector(location.hash); if (a) a.scrollIntoView(); }
        avisarAltura();
      })
      .catch(function () {
        raiz.innerHTML = '<div class="bl-aviso">Não foi possível carregar o boletim agora. Tente atualizar a página.</div>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarPagina);
  else iniciarPagina();
})();
