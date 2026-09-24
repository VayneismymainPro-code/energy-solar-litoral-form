// Business rules shared by the screen, WhatsApp message and regression tests.
export const SERVICE_LABELS = Object.freeze({ solar: 'Energia Solar', pattern: 'Padrão / Poste' });
export const WHATSAPP_NUMBER = '5541995587407';
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export function phoneDigits(value) {
  const digits = value.replace(/\D/g, '');
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}

export function isValidPhone(value) {
  return /^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(phoneDigits(value));
}

export function formatPhone(value) {
  if (!isValidPhone(value)) return value.trim();
  return phoneDigits(value).replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
}

export function validatePhoto(file) {
  if (!file) return '';
  const isImage = file.type ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) : /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isImage) return 'Selecione uma imagem JPG, PNG ou WebP.';
  if (!file.size || file.size > MAX_PHOTO_BYTES) return 'Selecione uma imagem válida de até 4 MB.';
  return '';
}

export function validateStep(data, step) {
  const error = (field, message) => ({ field, message });
  if (!SERVICE_LABELS[data.service]) return error('service', 'Escolha o serviço para continuar.');
  if (step === 1) {
    if (!data.city) return error(`city-${data.service}`, 'Informe a cidade da instalação.');
    if (!data.property) return error(`property-${data.service}`, 'Escolha o tipo de imóvel.');
    if (data.service === 'pattern' && !data.serviceCase) return error('case', 'Escolha o que você precisa resolver.');
  }
  if (step === 2 && data.service === 'solar') {
    if (data.consumption && (!Number.isFinite(Number(data.consumption)) || Number(data.consumption) < 0.01 || Number(data.consumption) > 999999)) {
      return error('consumption', 'Informe um consumo entre 0,01 e 999.999 kWh por mês.');
    }
    if (!data.consumption && !data.photo) return error('consumption', 'Informe o consumo ou selecione uma foto da conta.');
  }
  if (step === 2 && data.service === 'pattern' && !data.project) return error('project', 'Escolha se você já tem algum projeto ou orientação.');
  if (step === 3) {
    if (!data.name) return error('name', 'Informe seu nome para continuar.');
    if (!isValidPhone(data.phone)) return error('phone', 'Informe um telefone com DDD e 10 ou 11 dígitos.');
  }
  return null;
}

export function summaryRows(data, { photoStored = false } = {}) {
  const rows = [
    ['Serviço', SERVICE_LABELS[data.service]],
    ['Cidade', data.city],
    ['Tipo de imóvel', data.property]
  ];
  const photo = data.photo ? (photoStored ? 'Recebida pelo formulário' : `${data.photo} (anexar no WhatsApp)`) : 'Não selecionada';
  if (data.service === 'solar') {
    rows.push(['Consumo médio', data.consumption ? `${Number(data.consumption)} kWh / mês` : (photoStored ? 'Consultar conta de luz recebida' : 'Consultar foto da conta após o envio')]);
    rows.push(['Conta de luz', photo]);
  } else {
    rows.push(['Necessidade', data.serviceCase], ['Projeto ou orientação', data.project], ['Foto do local', photo]);
  }
  rows.push(['Contato', `${data.name} · ${formatPhone(data.phone)}`], ['Melhor horário', data.bestTime || 'A combinar']);
  if (data.notes) rows.push(['Observação', data.notes]);
  return rows;
}

export function buildWhatsappUrl(data, { reference = '', photoStored = false } = {}) {
  const message = [
    '*Pedido de orçamento*',
    '',
    '*Serviço e local*',
    `• ${SERVICE_LABELS[data.service]}`,
    `• ${data.city} · ${data.property}`,
    '',
    data.service === 'solar' ? '*Consumo*' : '*Detalhes*'
  ];
  if (data.service === 'solar') {
    message.push(`• ${data.consumption ? `${Number(data.consumption)} kWh/mês` : (photoStored ? 'Conta enviada pelo formulário' : 'Conferir foto da conta que vou anexar')}`);
  } else {
    message.push(`• Necessidade: ${data.serviceCase}`);
    message.push(`• Projeto ou orientação: ${data.project}`);
  }
  if (data.photo && (data.service !== 'solar' || data.consumption)) {
    message.push(`• ${data.service === 'solar' ? 'Foto da conta' : 'Foto do local'}: ${photoStored ? 'enviada pelo formulário' : 'vou anexar nesta conversa'}`);
  }
  message.push(
    '',
    '*Contato*',
    `• Nome: ${data.name}`,
    `• WhatsApp: ${formatPhone(data.phone)}`,
    `• Melhor horário: ${data.bestTime || 'A combinar'}`
  );
  if (data.notes) message.push('', '*Observação*', data.notes);
  if (reference) message.push('', `*Pedido:* ${reference}`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.join('\n'))}`;
}
