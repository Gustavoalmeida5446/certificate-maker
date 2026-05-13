import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, FileSpreadsheet, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import {
  DEFAULT_DATE_FONT_URL,
  DEFAULT_NAME_FONT_URL,
  DEFAULT_TEMPLATE_URL,
  DEFAULT_TEXT_FONT_URL,
  fetchAssetBytes,
  readFileBytes,
} from './lib/assets';
import { createCertificatePdf } from './lib/pdf';
import { readNamesFromSpreadsheet } from './lib/spreadsheet';
import { createCertificatesZip, safePdfFileName } from './lib/zip';

type AppStatus = {
  type: 'info' | 'success' | 'error';
  message: string;
};

const defaultStatus: AppStatus = {
  type: 'info',
  message: 'Digite um nome ou carregue uma planilha CSV/XLSX para começar.',
};

const DEFAULT_CERTIFICATE_TEXT =
  'concluiu o Workshop Método Mente Forte, com carga horária de 8 horas, demonstrando comprometimento e dedicação na busca pelo desenvolvimento pessoal e profissional através do aprimoramento do autoconhecimento, inteligência emocional e comunicação.';

function App() {
  const [templateBytes, setTemplateBytes] = useState<Uint8Array | null>(null);
  const [nameFontBytes, setNameFontBytes] = useState<Uint8Array | null>(null);
  const [textFontBytes, setTextFontBytes] = useState<Uint8Array | null>(null);
  const [dateFontBytes, setDateFontBytes] = useState<Uint8Array | null>(null);
  const [templateName, setTemplateName] = useState('modelo sem texto.pdf');
  const [certificateDate, setCertificateDate] = useState(formatDefaultCertificateDate());
  const [certificateText, setCertificateText] = useState(DEFAULT_CERTIFICATE_TEXT);
  const [manualName, setManualName] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus>(defaultStatus);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = useMemo(
    () =>
      Boolean(
        templateBytes &&
          nameFontBytes &&
          textFontBytes &&
          dateFontBytes &&
          names.length > 0 &&
          certificateDate.trim() &&
          certificateText.trim() &&
          !isGenerating,
      ),
    [
      certificateDate,
      certificateText,
      dateFontBytes,
      isGenerating,
      nameFontBytes,
      names.length,
      templateBytes,
      textFontBytes,
    ],
  );

  useEffect(() => {
    async function loadDefaultAssets() {
      try {
        const [defaultTemplate, defaultNameFont, defaultTextFont, defaultDateFont] = await Promise.all([
          fetchAssetBytes(DEFAULT_TEMPLATE_URL),
          fetchAssetBytes(DEFAULT_NAME_FONT_URL),
          fetchAssetBytes(DEFAULT_TEXT_FONT_URL),
          fetchAssetBytes(DEFAULT_DATE_FONT_URL),
        ]);

        setTemplateBytes(defaultTemplate);
        setNameFontBytes(defaultNameFont);
        setTextFontBytes(defaultTextFont);
        setDateFontBytes(defaultDateFont);
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

  function handleAddManualName() {
    const name = manualName.replace(/\s+/g, ' ').trim();

    if (!name) {
      setStatus({ type: 'error', message: 'Digite um nome antes de adicionar.' });
      return;
    }

    if (names.some((currentName) => normalizeName(currentName) === normalizeName(name))) {
      setStatus({ type: 'error', message: 'Esse nome ja esta na lista.' });
      return;
    }

    setNames((currentNames) => [...currentNames, name]);
    setManualName('');
    setStatus({ type: 'success', message: `${name} adicionado a lista.` });
  }

  function removeName(indexToRemove: number) {
    setNames((currentNames) => currentNames.filter((_, index) => index !== indexToRemove));
    setStatus({ type: 'info', message: 'Nome removido da lista.' });
  }

  async function handlePreview() {
    if (!templateBytes || !nameFontBytes || !textFontBytes || !dateFontBytes || names.length === 0) {
      setStatus({ type: 'error', message: 'Carregue o PDF modelo, as fontes e pelo menos um nome.' });
      return;
    }

    if (!certificateDate.trim() || !certificateText.trim()) {
      setStatus({ type: 'error', message: 'Preencha a data e o texto do certificado.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Gerando preview...' });

    try {
      const pdfBytes = await createCertificatePdf({
        templateBytes,
        nameFontBytes,
        textFontBytes,
        dateFontBytes,
        name: names[0],
        certificateDate: certificateDate.trim(),
        certificateText: certificateText.trim(),
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
    if (!templateBytes || !nameFontBytes || !textFontBytes || !dateFontBytes || names.length === 0) {
      setStatus({ type: 'error', message: 'Carregue o PDF modelo, as fontes e pelo menos um nome.' });
      return;
    }

    if (!certificateDate.trim() || !certificateText.trim()) {
      setStatus({ type: 'error', message: 'Preencha a data e o texto do certificado.' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Gerando certificados...' });

    try {
      const certificates = await Promise.all(
        names.map(async (name) => ({
          fileName: safePdfFileName(name),
          bytes: await createCertificatePdf({
            templateBytes,
            nameFontBytes,
            textFontBytes,
            dateFontBytes,
            name,
            certificateDate: certificateDate.trim(),
            certificateText: certificateText.trim(),
          }),
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

        <section className="certificate-fields" aria-label="Dados do certificado">
          <label>
            <span>Data</span>
            <input
              type="text"
              value={certificateDate}
              onChange={(event) => setCertificateDate(event.target.value)}
            />
          </label>

          <label>
            <span>Texto do certificado</span>
            <textarea
              value={certificateText}
              onChange={(event) => setCertificateText(event.target.value)}
              rows={4}
            />
          </label>
        </section>

        <section className="manual-name" aria-label="Adicionar nome manualmente">
          <label>
            <span>Nome para certificado avulso</span>
            <div className="manual-name-row">
              <input
                type="text"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddManualName();
                  }
                }}
                placeholder="Digite o nome completo"
              />
              <button type="button" onClick={handleAddManualName}>
                <Plus aria-hidden="true" />
                Adicionar
              </button>
            </div>
          </label>
        </section>

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

function formatDefaultCertificateDate(): string {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return `Pará de Minas, ${formattedDate}`;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export default App;
