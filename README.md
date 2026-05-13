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

- `public/certificado mente forte.pdf`
- `public/Caveat-Regular.ttf`

Na interface, o PDF modelo pode ser trocado manualmente antes de gerar os certificados. A fonte usada continua sendo a TTF local.

## Ajustar a posicao do nome

A posicao e o tamanho do nome ficam em `src/lib/pdf.ts`, no objeto `NAME_POSITION`.

Principais ajustes:

- `centerYRatio`: altura vertical do centro do nome no certificado
- `maxWidthRatio`: largura maxima permitida para o texto
- `maxFontSize`: maior tamanho de fonte usado
- `minFontSize`: menor tamanho de fonte usado
- `lineHeightRatio`: espacamento entre duas linhas

Depois de alterar, rode `npm run build` para validar.

## Como gerar preview

1. Abra a aplicacao.
2. Carregue uma planilha CSV, XLSX ou XLS com a coluna `name` ou `nome`.
3. Clique em `Preview`.
4. O navegador baixara um PDF de exemplo usando o primeiro nome da lista.

## Como gerar todos os certificados

1. Carregue a planilha.
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
