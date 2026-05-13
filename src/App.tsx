import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, FileSpreadsheet, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import { DEFAULT_FONT_URL, DEFAULT_TEMPLATE_URL, fetchAssetBytes, readFileBytes } from './lib/assets';
import { createCertificatePdf } from './lib/pdf';
import { readNamesFromSpreadsheet } from './lib/spreadsheet';
import { createCertificatesZip, safePdfFileName } from './lib/zip';

type AppStatus = {
  type: 'info' | 'success' | 'error';
  message: string;
};

const defaultStatus: AppStatus = {
  type: 'info',
  message: 'Carregue uma planilha CSV ou XLSX para começar.',
};

function App() {
  const [templateBytes, setTemplateBytes] = useState<Uint8Array | null>(null);
  const [fontBytes, setFontBytes] = useState<Uint8Array | null>(null);
  const [templateName, setTemplateName] = useState('certificado mente forte.pdf');
  const [names, setNames] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus>(defaultStatus);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = useMemo(
    () => Boolean(templateBytes && fontBytes && names.length > 0 && !isGenerating),
    [fontBytes, isGenerating, names.length, templateBytes],
  );

  useEffect(() => {
    async function loadDefaultAssets() {
      try {
        const [defaultTemplate, defaultFont] = await Promise.all([
          fetchAssetBytes(DEFAULT_TEMPLATE_URL),
          fetchAssetBytes(DEFAULT_FONT_URL),
        ]);

        setTemplateBytes(defaultTemplate);
        setFontBytes(defaultFont);
      } catch (error) {
        setStatus({
          type: 'error',
          message: getErrorMessage(error, 'Nao foi possivel carregar os assets padrao.'),
        });
      } finally {
        setIsLoadingAssets(false);
      }
    }

    loadDefaultAssets();
  }, []);

  async function handleTemplateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setTemplateBytes(await readFileBytes(file));
      setTemplateName(file.name);
      setStatus({ type: 'success', message: 'PDF modelo atualizado.' });
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Erro ao ler o PDF modelo.') });
    } finally {
      event.target.value = '';
    }
  }

  async function handleSpreadsheetUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const loadedNames = await readNamesFromSpreadsheet(file);
      setNames(loadedNames);
      setStatus({
        type: 'success',
        message: `${loadedNames.length} nome${loadedNames.length === 1 ? '' : 's'} carregado${loadedNames.length === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      setNames([]);
      setStatus({ type: 'error', message: getErrorMessage(error, 'Erro ao ler a planilha.') });
    } finally {
      event.target.value = '';
    }
  }

  function removeName(indexToRemove: number) {
    setNames((currentNames) => currentNames.filter((_, index) => index !== indexToRemove));
    setStatus({ type: 'info', message: 'Nome removido da lista.' });
  }

  async function handlePreview() {
    if (!templateBytes || !fontBytes || names.length === 0) {
      setStatus({ type: 'error', message: 'Carregue o PDF modelo e pelo menos um nome.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Gerando preview...' });

    try {
      const pdfBytes = await createCertificatePdf({
        templateBytes,
        fontBytes,
        name: names[0],
      });

      const blob = new Blob([toArrayBuffer(pdfBytes)], { type: 'application/pdf' });
      saveAs(blob, `preview-${safePdfFileName(names[0])}`);
      setStatus({ type: 'success', message: `Preview gerado para ${names[0]}.` });
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Erro ao gerar preview.') });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateAll() {
    if (!templateBytes || !fontBytes || names.length === 0) {
      setStatus({ type: 'error', message: 'Carregue o PDF modelo e pelo menos um nome.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Gerando certificados...' });

    try {
      const certificates = await Promise.all(
        names.map(async (name) => ({
          fileName: safePdfFileName(name),
          bytes: await createCertificatePdf({ templateBytes, fontBytes, name }),
        })),
      );
      const zipBlob = await createCertificatesZip(certificates);

      saveAs(zipBlob, 'certificados.zip');
      setStatus({ type: 'success', message: `${certificates.length} certificados gerados em certificados.zip.` });
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Erro ao gerar certificados.') });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="header">
          <div>
            <p className="eyebrow">PDF em lote no navegador</p>
            <h1>Gerador de Certificados</h1>
          </div>
          <div className="template-status">
            <FileCheck2 aria-hidden="true" />
            <div>
              <span>PDF modelo</span>
              <strong>{isLoadingAssets ? 'Carregando...' : templateName}</strong>
            </div>
          </div>
        </div>

        <div className="controls">
          <label className="upload-control">
            <FileText aria-hidden="true" />
            <span>Trocar PDF modelo</span>
            <input type="file" accept="application/pdf,.pdf" onChange={handleTemplateUpload} />
          </label>

          <label className="upload-control primary">
            <FileSpreadsheet aria-hidden="true" />
            <span>Carregar planilha</span>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleSpreadsheetUpload} />
          </label>
        </div>

        <div className={`status ${status.type}`}>{status.message}</div>

        <section className="names-panel" aria-label="Nomes carregados">
          <div className="panel-header">
            <div>
              <h2>Nomes carregados</h2>
              <p>{names.length} nome{names.length === 1 ? '' : 's'} no total</p>
            </div>
            <div className="actions">
              <button type="button" onClick={handlePreview} disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="spin" aria-hidden="true" /> : <Eye aria-hidden="true" />}
                Preview
              </button>
              <button type="button" className="primary-action" onClick={handleGenerateAll} disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                Gerar ZIP
              </button>
            </div>
          </div>

          {names.length > 0 ? (
            <ul className="names-list">
              {names.map((name, index) => (
                <li key={`${name}-${index}`}>
                  <span>{name}</span>
                  <button type="button" onClick={() => removeName(index)} aria-label={`Remover ${name}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <Upload aria-hidden="true" />
              <p>A planilha deve conter uma coluna chamada <strong>name</strong> ou <strong>nome</strong>.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export default App;
