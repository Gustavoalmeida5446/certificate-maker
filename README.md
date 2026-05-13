# Gerador de Certificados

Aplicacao frontend para gerar certificados em PDF em lote diretamente no navegador. Ela usa o PDF modelo e a fonte TTF locais, escreve o nome da pessoa certificada no centro do certificado e baixa todos os arquivos em `certificados.zip`.

Tudo roda no cliente: nao ha backend, banco de dados, login ou envio de arquivos para servidor.

## Tecnologias

- Vite
- React
- TypeScript
- `pdf-lib` e `@pdf-lib/fontkit` para editar o PDF e embutir a fonte TTF
- `xlsx` para ler CSV, XLSX e XLS
- `jszip` para gerar o arquivo ZIP
- `file-saver` para baixar os arquivos no navegador

## Como instalar

```bash
npm install
```

## Como rodar localmente

```bash
npm run dev
```

Abra a URL exibida pelo Vite no navegador.

## Como gerar build

```bash
npm run build
```

Para conferir o build localmente:

```bash
npm run preview
```

## Nomes dos certificados

Voce pode adicionar um nome manualmente pela tela para gerar um certificado avulso, ou carregar uma planilha para gerar varios certificados.

## Formato da planilha

A planilha deve ter uma coluna chamada `name` ou `nome`.

Exemplo CSV:

```csv
nome
Maria Silva
Joao Santos
Ana Carolina Pereira
```

A primeira aba da planilha sera lida. Linhas vazias sao ignoradas e nomes repetidos sao removidos.

## PDF modelo e fonte

Os arquivos padrao ficam em `public/`:

- `public/modelo sem texto.pdf`
- `public/Caveat-Regular.ttf`
- `public/Cabin-Regular.ttf`
- `public/Cabin-Bold.ttf`

O PDF modelo e as fontes sao carregados automaticamente pela aplicacao. Se precisar, o PDF modelo tambem pode ser trocado pela interface antes de gerar os certificados.

## Texto e data do certificado

A tela possui campos editaveis para:

- data do certificado, escrita com `Cabin-Bold.ttf`
- texto descritivo do certificado, escrito com `Cabin-Regular.ttf`

O texto ja abre preenchido com o padrao do Workshop Metodo Mente Forte. A data abre com a data atual no formato `Pará de Minas, 13 de maio de 2026`.

## Ajustar posicoes no PDF

A posicao e o tamanho do nome ficam em `src/lib/pdf.ts`, no objeto `NAME_POSITION`. A posicao do texto descritivo fica em `BODY_TEXT_STYLE`, e a data fica em `DATE_TEXT_STYLE`.

Principais ajustes:

- `centerXRatio`: centro horizontal do nome na area branca do certificado
- `centerYRatio`: altura vertical do centro do nome no certificado
- `maxWidthRatio`: largura maxima permitida para o texto
- `maxFontSize`: maior tamanho de fonte usado
- `minFontSize`: menor tamanho de fonte usado
- `lineHeightRatio`: espacamento entre duas linhas

Depois de alterar, rode `npm run build` para validar.

## Como gerar preview

1. Abra a aplicacao.
2. Digite um nome manualmente ou carregue uma planilha CSV, XLSX ou XLS com a coluna `name` ou `nome`.
3. Clique em `Preview`.
4. O navegador baixara um PDF de exemplo usando o primeiro nome da lista.

## Como gerar todos os certificados

1. Digite um nome manualmente ou carregue a planilha.
2. Remova nomes da lista, se necessario.
3. Clique em `Gerar ZIP`.
4. O navegador baixara `certificados.zip` com um PDF para cada nome.

## Publicar no GitHub Pages

O Vite esta configurado com `base: './'`, entao os assets funcionam quando o projeto e publicado em um subcaminho do GitHub Pages.

Para publicar usando a branch principal `master` e o pacote `gh-pages`:

```bash
npm run deploy
```

Isso gera o build e publica o conteudo de `dist/` na branch `gh-pages`. No GitHub, configure Pages para servir essa branch.
