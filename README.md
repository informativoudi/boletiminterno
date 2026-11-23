# Boletim de Comunicação Interna — Grupo Unimed Uberlândia

Boletim mensal de Comunicação Interna, servido pelo GitHub Pages e embedado no site do Framer.
As edições são montadas no **montador** (`montador.html`), que publica sozinho neste repositório.

## O que tem aqui

| Arquivo | O que é |
| --- | --- |
| `index.html` | O boletim. Mostra a edição atual. |
| `montador.html` + `montador.js` | O montador (CMS) para criar, validar e publicar as edições. |
| `dados.json` | Todas as edições publicadas. **Gerado pelo montador — não edite à mão.** |
| `boletim.js` / `boletim.css` | Renderizador e estilos. A página e a prévia do montador usam os mesmos. |
| `assets/fonts/` | Fonte Unimed Sans. |
| `assets/img/` | Capa, marca Unimed Uberlândia 55 anos, marca do Grupo e registro ANS. |
| `imagens/` | Fotos enviadas pelo montador. A pasta é criada sozinha na primeira publicação. |
| `.nojekyll` | Faz o GitHub Pages servir os arquivos como estão. |

## Endereços

Troque `USUARIO` e `REPOSITORIO` pelos do seu repositório.

| Uso | Endereço |
| --- | --- |
| Boletim (edição atual) | `https://USUARIO.github.io/REPOSITORIO/` |
| Espelho (validação) | `https://USUARIO.github.io/REPOSITORIO/?espelho=true` |
| Uma edição específica | `https://USUARIO.github.io/REPOSITORIO/?edicao=ID` |
| Montador | `https://USUARIO.github.io/REPOSITORIO/montador.html` |

## Como colocar no ar

1. Crie o repositório no GitHub e suba **todo o conteúdo desta pasta na raiz** (não a pasta em si).
2. Em **Settings → Pages → Source**, escolha *Deploy from a branch*, branch `main` e pasta `/ (root)`. Salve.
3. Em cerca de um minuto, o boletim abre no endereço do Pages.

## Conectar o montador ao GitHub

1. Gere um token em **Settings → Developer settings → Personal access tokens → Fine-grained tokens**:
   - *Repository access*: só este repositório;
   - *Permissions → Contents*: **Read and write**.
2. Abra o montador (`/montador.html`) e clique em **GitHub** no topo.
3. Preencha usuário ou organização, repositório, branch `main` e o token. Clique em **Testar conexão** e depois em **Salvar**.

O token fica guardado só no navegador de quem configurou. Cada pessoa da equipe configura o seu.

## Colocar no Framer

No montador, abra **Mais › Código para o Framer** e copie os dois códigos:

- **Página principal do boletim:** um bloco *Embed* (HTML) com o código da edição atual.
- **Página de validação** (ex.: `/espelho`): um bloco *Embed* com o código do espelho.

O embed ajusta a altura sozinho, e o menu do boletim rola a página do Framer até a seção certa.

## Fluxo mensal

1. **Nova edição** no montador: comece pelo modelo do boletim ou por uma cópia da edição anterior.
2. Preencha capa, faixa animada, Informes Gerais e seções, conferindo na prévia (computador e celular).
3. **Enviar para o espelho** e valide em `?espelho=true`.
4. **Publicar no boletim**: a edição vira a atual e a anterior vai para o menu **Edições**.

O site atualiza cerca de um minuto depois de cada envio.

## Seções disponíveis no montador

| Seção | Para quê |
| --- | --- |
| Notícia | Nome da seção, título, foto ou vídeo (1 = inteira, 2 = lado a lado, 3 a 10 = slide), texto com negrito, link e marcador, caixa de destaque e botões. |
| Gente e Gestão | Notícias separadas por categorias editáveis, com menu próprio. |
| Caixas com destaque | Retângulos com uma marca no início e o texto ao lado (ex.: Giro ESG). |
| Gente nova | Cabeçalho com título, subtítulo e mês, fotos com nome e cargo (até 12). |
| Novos líderes | Mesma estrutura, outra cor e a faixa com a marca do Grupo. |

## Backup e segurança

- Os rascunhos ficam só no navegador onde foram feitos. Use **Mais › Baixar backup** com frequência e **Mais › Restaurar backup** para levar para outro computador.
- **Mais › Buscar a versão publicada** traz o que está no site sem apagar os rascunhos locais.
- Sem GitHub configurado, **Mais › Baixar dados.json** gera o arquivo para subir manualmente no repositório.
- Fotos enviadas são reduzidas automaticamente (até 1600 px; fotos de pessoas, 600 px quadradas).

## Testar no computador

O boletim lê o `dados.json` pela rede, então abrir o `index.html` direto do disco não funciona. Rode um servidor simples na pasta:

```bash
python3 -m http.server 8000
```

E abra `http://localhost:8000/` (boletim) ou `http://localhost:8000/montador.html` (montador).
