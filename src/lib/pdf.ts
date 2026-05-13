import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export type CertificateOptions = {
  templateBytes: Uint8Array;
  nameFontBytes: Uint8Array;
  textFontBytes: Uint8Array;
  dateFontBytes: Uint8Array;
  name: string;
  certificateText: string;
  certificateDate: string;
};

export const NAME_POSITION = {
  // Ajuste estes valores se o layout do certificado mudar.
  centerXRatio: 0.65,
  centerYRatio: 0.525,
  maxWidthRatio: 0.5,
  maxFontSize: 42,
  minFontSize: 26,
  lineHeightRatio: 0.9,
  splitBelowFontSize: 36,
};

const NAME_COLOR = rgb(1, 0.49, 0);
const BODY_TEXT_COLOR = rgb(0, 0.16, 0.24);

const BODY_TEXT_STYLE = {
  centerXRatio: 0.65,
  firstLineYRatio: 0.455,
  maxWidthRatio: 0.55,
  fontSize: 13.5,
  lineHeightRatio: 1.36,
};

const DATE_TEXT_STYLE = {
  centerXRatio: 0.65,
  yRatio: 0.267,
  fontSize: 14,
};

type FontKitFont = {
  unitsPerEm: number;
  layout: (text: string) => {
    advanceWidth: number;
    glyphs: Array<{ path: { commands: FontPathCommand[] } }>;
    positions: Array<{
      xAdvance: number;
      yAdvance: number;
      xOffset: number;
      yOffset: number;
    }>;
  };
};

type FontPathCommand = {
  command: 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'closePath';
  args: number[];
};

export async function createCertificatePdf({
  templateBytes,
  nameFontBytes,
  textFontBytes,
  dateFontBytes,
  name,
  certificateText,
  certificateDate,
}: CertificateOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const vectorFont = fontkit.create(nameFontBytes) as unknown as FontKitFont;
  const textFont = await pdfDoc.embedFont(textFontBytes);
  const dateFont = await pdfDoc.embedFont(dateFontBytes);
  const page = pdfDoc.getPages()[0];

  if (!page) {
    throw new Error('O PDF modelo nao possui paginas.');
  }

  const { width, height } = page.getSize();
  const maxTextWidth = width * NAME_POSITION.maxWidthRatio;
  const lines = fitNameLines(name, vectorFont, maxTextWidth);
  const fontSize = findFontSize(lines, vectorFont, maxTextWidth);
  const lineHeight = fontSize * NAME_POSITION.lineHeightRatio;
  const blockHeight = lineHeight * (lines.length - 1);
  const centerX = width * NAME_POSITION.centerXRatio;
  const centerY = height * NAME_POSITION.centerYRatio;
  const firstLineY = centerY + blockHeight / 2;

  lines.forEach((line, index) => {
    drawTextAsFontOutlines({
      page,
      font: vectorFont,
      text: line,
      centerX,
      y: firstLineY - index * lineHeight,
      fontSize,
    });
  });

  drawBodyText({
    page,
    font: textFont,
    text: certificateText,
    pageWidth: width,
    pageHeight: height,
  });
  drawCenteredText({
    page,
    font: dateFont,
    text: certificateDate,
    centerX: width * DATE_TEXT_STYLE.centerXRatio,
    y: height * DATE_TEXT_STYLE.yRatio,
    fontSize: DATE_TEXT_STYLE.fontSize,
  });

  return pdfDoc.save();
}

function fitNameLines(name: string, font: FontKitFont, maxWidth: number): string[] {
  const normalizedName = name.replace(/\s+/g, ' ').trim();
  const singleLineSize = findFontSize([normalizedName], font, maxWidth);

  if (singleLineSize >= NAME_POSITION.splitBelowFontSize) {
    return [normalizedName];
  }

  return splitNameInTwoLines(normalizedName, font, maxWidth);
}

function splitNameInTwoLines(
  name: string,
  font: FontKitFont,
  maxWidth: number,
): string[] {
  const words = name.split(' ');

  if (words.length <= 1) {
    return [name];
  }

  let bestLines = [name];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const lines = [words.slice(0, index).join(' '), words.slice(index).join(' ')];
    const size = findFontSize(lines, font, maxWidth);
    const widthDifference = Math.abs(
      measureTextWidth(lines[0], font, size) - measureTextWidth(lines[1], font, size),
    );
    const score = NAME_POSITION.maxFontSize - size + widthDifference / 100;

    if (score < bestScore) {
      bestScore = score;
      bestLines = lines;
    }
  }

  return bestLines;
}

function findFontSize(
  lines: string[],
  font: FontKitFont,
  maxWidth: number,
): number {
  for (let size = NAME_POSITION.maxFontSize; size >= NAME_POSITION.minFontSize; size -= 1) {
    const fits = lines.every((line) => measureTextWidth(line, font, size) <= maxWidth);

    if (fits) {
      return size;
    }
  }

  return NAME_POSITION.minFontSize;
}

function measureTextWidth(text: string, font: FontKitFont, fontSize: number): number {
  return font.layout(text).advanceWidth * getFontScale(font, fontSize);
}

function drawTextAsFontOutlines({
  page,
  font,
  text,
  centerX,
  y,
  fontSize,
}: {
  page: PDFPage;
  font: FontKitFont;
  text: string;
  centerX: number;
  y: number;
  fontSize: number;
}) {
  const layout = font.layout(text);
  const scale = getFontScale(font, fontSize);
  let cursorX = centerX - (layout.advanceWidth * scale) / 2;
  let cursorY = y;

  layout.glyphs.forEach((glyph, index) => {
    const position = layout.positions[index];

    page.drawSvgPath(toPdfSvgPath(glyph.path.commands), {
      x: cursorX + position.xOffset * scale,
      y: cursorY + position.yOffset * scale,
      scale,
      color: NAME_COLOR,
    });

    cursorX += position.xAdvance * scale;
    cursorY += position.yAdvance * scale;
  });
}

function getFontScale(font: FontKitFont, fontSize: number): number {
  return fontSize / font.unitsPerEm;
}

function drawBodyText({
  page,
  font,
  text,
  pageWidth,
  pageHeight,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  pageWidth: number;
  pageHeight: number;
}) {
  const centerX = pageWidth * BODY_TEXT_STYLE.centerXRatio;
  const maxWidth = pageWidth * BODY_TEXT_STYLE.maxWidthRatio;
  const lines = wrapText(text, font, BODY_TEXT_STYLE.fontSize, maxWidth);
  const lineHeight = BODY_TEXT_STYLE.fontSize * BODY_TEXT_STYLE.lineHeightRatio;
  const firstLineY = pageHeight * BODY_TEXT_STYLE.firstLineYRatio;

  lines.forEach((line, index) => {
    drawCenteredText({
      page,
      font,
      text: line,
      centerX,
      y: firstLineY - index * lineHeight,
      fontSize: BODY_TEXT_STYLE.fontSize,
    });
  });
}

function drawCenteredText({
  page,
  font,
  text,
  centerX,
  y,
  fontSize,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  centerX: number;
  y: number;
  fontSize: number;
}) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  page.drawText(text, {
    x: centerX - textWidth / 2,
    y,
    size: fontSize,
    font,
    color: BODY_TEXT_COLOR,
  });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapParagraph(paragraph.trim(), font, fontSize, maxWidth))
    .filter(Boolean);
}

function wrapParagraph(paragraph: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!paragraph) {
    return [];
  }

  const lines: string[] = [];
  const words = paragraph.split(/\s+/);
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function toPdfSvgPath(commands: FontPathCommand[]): string {
  return commands
    .map((pathCommand) => {
      const args = flipYCoordinates(pathCommand.args);

      switch (pathCommand.command) {
        case 'moveTo':
          return `M${args[0]} ${args[1]}`;
        case 'lineTo':
          return `L${args[0]} ${args[1]}`;
        case 'quadraticCurveTo':
          return `Q${args[0]} ${args[1]} ${args[2]} ${args[3]}`;
        case 'bezierCurveTo':
          return `C${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} ${args[5]}`;
        case 'closePath':
          return 'Z';
        default:
          return '';
      }
    })
    .join('');
}

function flipYCoordinates(args: number[]): number[] {
  return args.map((arg, index) => (index % 2 === 0 ? arg : -arg));
}
