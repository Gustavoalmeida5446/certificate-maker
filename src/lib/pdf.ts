import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export type CertificateOptions = {
  templateBytes: Uint8Array;
  fontBytes: Uint8Array;
  name: string;
};

export const NAME_POSITION = {
  // Ajuste estes valores se trocar o PDF modelo.
  centerYRatio: 0.43,
  maxWidthRatio: 0.78,
  maxFontSize: 54,
  minFontSize: 28,
  lineHeightRatio: 1.08,
};

export async function createCertificatePdf({
  templateBytes,
  fontBytes,
  name,
}: CertificateOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(fontBytes);
  const page = pdfDoc.getPages()[0];

  if (!page) {
    throw new Error('O PDF modelo nao possui paginas.');
  }

  const { width, height } = page.getSize();
  const maxTextWidth = width * NAME_POSITION.maxWidthRatio;
  const lines = fitNameLines(name, font, maxTextWidth);
  const fontSize = findFontSize(lines, font, maxTextWidth);
  const lineHeight = fontSize * NAME_POSITION.lineHeightRatio;
  const blockHeight = lineHeight * (lines.length - 1);
  const centerY = height * NAME_POSITION.centerYRatio;
  const firstLineY = centerY + blockHeight / 2;

  lines.forEach((line, index) => {
    const textWidth = font.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: (width - textWidth) / 2,
      y: firstLineY - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });
  });

  return pdfDoc.save();
}

function fitNameLines(name: string, font: PDFFont, maxWidth: number): string[] {
  const normalizedName = name.replace(/\s+/g, ' ').trim();
  const singleLineSize = findFontSize([normalizedName], font, maxWidth);

  if (singleLineSize > NAME_POSITION.minFontSize) {
    return [normalizedName];
  }

  return splitNameInTwoLines(normalizedName, font, maxWidth);
}

function splitNameInTwoLines(
  name: string,
  font: PDFFont,
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
      font.widthOfTextAtSize(lines[0], size) - font.widthOfTextAtSize(lines[1], size),
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
  font: PDFFont,
  maxWidth: number,
): number {
  for (let size = NAME_POSITION.maxFontSize; size >= NAME_POSITION.minFontSize; size -= 1) {
    const fits = lines.every((line) => font.widthOfTextAtSize(line, size) <= maxWidth);

    if (fits) {
      return size;
    }
  }

  return NAME_POSITION.minFontSize;
}
