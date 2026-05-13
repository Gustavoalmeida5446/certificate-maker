export const DEFAULT_TEMPLATE_URL = './certificado mente forte.pdf';
export const DEFAULT_FONT_URL = './Caveat-Regular.ttf';

export async function fetchAssetBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar o arquivo: ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
