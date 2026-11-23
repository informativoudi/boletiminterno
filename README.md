# Boletim de Comunicação Interna — Grupo Unimed Uberlândia

Boletim mensal de Comunicação Interna, servido pelo GitHub Pages e embedado no site do Framer.
As edições são montadas no **montador** (`montador.html`), que publica sozinho neste repositório.

## O que tem aqui

| Arquivo | O que é |
| --- | --- |
| `index.html` | O boletim. Mostra a edição atual. |
| `montador.html` + `montador.js` | O montador (CMS) para criar, validar e publicar as edições. |
| `dados.json` | Todas as edições publicadas. **Gerado pelo montador — não edite à mão.** |
| `acesso.json` | Usuários da equipe e o token criptografado. Criado pelo montador ao salvar a equipe. |
| `boletim.js` / `boletim.css` | Renderizador e estilos. A página e a prévia do montador usam os mesmos. |
| `assets/fonts/` | Fonte Unimed Sans. |
| `assets/img/` | Capa, marca Unimed Uberlândia 55 anos, marca do Grupo e registro ANS. |
| `imagens/` | Fotos enviadas pelo montador. A pasta é criada sozinha na primeira publicação. |
| `.nojekyll` | Faz o GitHub Pages servir os arquivos como estão. |
| `.github/workflows/publicar.yml` | Automação: descompacta .zip enviados, apaga o .zip e publica o site. |

## Endereços

Repositório: [`informativoudi/boletiminterno`](https://github.com/informativoudi/boletiminterno)

| Uso | Endereço |
| --- | --- |
| Boletim (edição atual) | `https://informativoudi.github.io/boletiminterno/` |
| Espelho (validação) | `https://informativoudi.github.io/boletiminterno/?espelho=true` |
| Uma edição específica | `https://informativoudi.github.io/boletiminterno/?edicao=ID` |
| Montador | `https://informativoudi.github.io/boletiminterno/montador.html` |

## Como colocar no ar

1. Crie o repositório no GitHub.
2. Na primeira vez, suba os arquivos **descompactados**, com o conteúdo desta pasta na raiz do repositório (não a pasta em si). Confira se a pasta `.github` foi junto: ela fica oculta no Windows e no Mac.
   - Se ela não for, crie o arquivo pelo site: **Add file → Create new file**, nome `.github/workflows/publicar.yml`, e cole o conteúdo do arquivo de mesmo nome.
3. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
4. Na aba **Actions**, a automação "Publicar boletim" roda e, em cerca de um minuto, o site abre no endereço do Pages.

## Atualizar enviando só o .zip

Depois da primeira vez, para trocar arquivos do site (layout, montador, capa, marcas):

1. Compacte os arquivos novos num `.zip`. Pode ser a pasta inteira (`boletim-interno.zip`) ou só os arquivos que mudaram.
2. No repositório, clique em **Add file → Upload files**, arraste o `.zip` e clique em **Commit changes**.
3. A automação descompacta tudo na raiz, **apaga o .zip** e publica o site. Acompanhe na aba **Actions**.

Regras da automação:
- Se o zip tiver uma única pasta por fora, ela usa o conteúdo dessa pasta.
- O `dados.json` e a pasta `imagens/` que já estão no repositório **não são substituídos**. Assim as edições publicadas pelo montador ficam a salvo. Para trocar o `dados.json` de propósito, apague o atual antes de enviar o zip.
- A pasta `.github` de dentro do zip é ignorada. Para mudar a automação, edite o arquivo direto no GitHub.
- Arquivos que não estão no zip continuam no repositório. Para remover algo, apague pelo GitHub.

## Conectar o montador ao GitHub

1. Gere um token em **Settings → Developer settings → Personal access tokens → Fine-grained tokens**:
   - *Repository access*: só este repositório;
   - *Permissions → Contents*: **Read and write**.
2. Abra o montador (`/montador.html`) e clique em **GitHub** no topo.
3. Usuário (`informativoudi`), repositório (`boletiminterno`) e branch (`main`) já vêm preenchidos. Cole o token, clique em **Testar conexão** e depois em **Salvar**.

O token fica guardado só no navegador do administrador.

## Equipe (usuário e senha)

Quem usa o montador entra só com usuário e senha, sem precisar do token, como no montador do Informativo.

1. O administrador conecta o GitHub com o token (passo anterior) e clica em **Gerenciar equipe** (ou **Mais › Equipe**).
2. Adiciona cada pessoa com usuário e senha (mínimo 10 caracteres) e clica em **Salvar equipe**.
3. Em cerca de um minuto, a pessoa abre o montador, entra com o usuário e a senha e já pode publicar.

Como funciona: o token fica no arquivo `acesso.json`, **criptografado** com uma chave da equipe. Cada senha destrava essa chave; sem uma senha válida, o arquivo não serve para nada.

- **Trocar a senha de alguém:** adicione de novo com o mesmo usuário e salve.
- **Remover alguém:** clique em Remover e salve.
- **Trocou o token?** Abra a equipe e clique em **Salvar equipe** para guardar o token novo.
- Se o navegador do administrador perder a chave da equipe, entre com um usuário da equipe para mexer nela, ou use **Recomeçar equipe** (todas as senhas precisam ser cadastradas de novo).
- Fora do GitHub Pages (no computador ou na prévia do projeto) o montador abre sem login, só para testes.

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

O site atualiza cerca de um minuto depois de cada envio (a automação roda sozinha a cada envio do montador).

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
