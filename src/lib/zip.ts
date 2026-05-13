import JSZip from 'jszip';

export type CertificateFile = {
  fileName: string;
  bytes: Uint8Array;
};

export async function createCertificatesZip(files: CertificateFile[]): Promise<Blob> {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.fileName, file.bytes);
  });

  return zip.generateAsync({ type: 'blob' });
}

export function safePdfFileName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${normalized || 'certificado'}.pdf`;
}
