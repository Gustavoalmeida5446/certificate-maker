export const DEFAULT_TEMPLATE_URL = './modelo-mente-forte.pdf';
export const DEFAULT_NAME_FONT_URL = './Caveat-Regular.ttf';
export const DEFAULT_TEXT_FONT_URL = './Cabin-Regular.ttf';
export const DEFAULT_DATE_FONT_URL = './Cabin-Bold.ttf';

export async function fetchAssetBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar o arquivo: ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
