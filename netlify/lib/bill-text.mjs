export function classifyBillText(ocrText) {
  if (typeof ocrText !== 'string') return 'incerta';
  const normalized = ocrText.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const documentTerm = /\b(conta|fatura)\b/.test(normalized);
  const energyTerm = /\benergia\b/.test(normalized);
  const usageTerm = /\b(consumo|kwh)\b/.test(normalized);
  return documentTerm && energyTerm && usageTerm ? 'conta_lida' : 'incerta';
}
