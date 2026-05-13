import * as XLSX from 'xlsx';

const NAME_COLUMNS = ['name', 'nome'];

export async function readNamesFromSpreadsheet(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('A planilha nao possui abas para leitura.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error('A planilha esta vazia.');
  }

  const firstRow = rows[0];
  const nameColumn = Object.keys(firstRow).find((key) =>
    NAME_COLUMNS.includes(normalizeHeader(key)),
  );

  if (!nameColumn) {
    throw new Error('A planilha precisa ter uma coluna chamada "name" ou "nome".');
  }

  const uniqueNames = new Set<string>();

  rows.forEach((row) => {
    const value = row[nameColumn];
    const name = String(value ?? '').trim();

    if (name) {
      uniqueNames.add(name);
    }
  });

  if (uniqueNames.size === 0) {
    throw new Error('Nenhum nome valido foi encontrado na planilha.');
  }

  return Array.from(uniqueNames);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}
