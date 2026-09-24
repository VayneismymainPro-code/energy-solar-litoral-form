import test from 'node:test';
import assert from 'node:assert/strict';
import { FORM_ERRORS, fieldsForActiveService, formatPhone, isValidPhone, validateStep, validatePhoto, MAX_PHOTO_BYTES, summaryRows, buildWhatsappUrl } from '../dist/form-core.mjs';
import { submissionErrorMessage } from '../dist/submission-error.mjs';

const solar = { service: 'solar', city: 'Matinhos', property: 'Residencial', consumption: '450.5', name: 'Teste local', phone: '(41) 99999-9999', photo: '', bestTime: '', notes: '' };

test('accepts complete requests for both services', () => {
  for (const step of [1, 2, 3]) assert.equal(validateStep(solar, step), null);
  const pattern = { ...solar, service: 'pattern', consumption: '', serviceCase: 'Instalação nova', project: 'Ainda não', voltage: 'Não sei' };
  for (const step of [1, 2, 3]) assert.equal(validateStep(pattern, step), null);
});

test('consumption must be positive and finite, including when a photo is present', () => {
  for (const consumption of ['-5', '0', '0.001', '1000000', 'Infinity', 'NaN', 'abc']) {
    assert.equal(validateStep({ ...solar, consumption, photo: 'conta.jpg' }, 2)?.field, 'consumption');
  }
  for (const consumption of ['0.01', '450.5', '999999']) assert.equal(validateStep({ ...solar, consumption }, 2), null);
  assert.equal(validateStep({ ...solar, consumption: '' }, 2)?.field, 'consumption');
  assert.equal(validateStep({ ...solar, consumption: '', photo: 'conta.jpg' }, 2), null);
});

test('phone accepts national and +55 formats without silently truncating invalid numbers', () => {
  for (const phone of ['41999999999', '(41) 3333-4444', '+55 (41) 99999-9999', '55999999999']) assert.ok(isValidPhone(phone), phone);
  for (const phone of ['12345678', '00999999999', '419999999999', '4112345678', '41888888888', '']) assert.equal(isValidPhone(phone), false, phone);
  assert.equal(formatPhone('+55 (41) 99999-9999'), '(41) 99999-9999');
  assert.equal(formatPhone('419999999999'), '419999999999');
});

test('validates the required fields for the active service', () => {
  assert.equal(validateStep({ ...solar, city: '' }, 1)?.field, 'city-solar');
  assert.equal(validateStep({ ...solar, property: '' }, 1)?.field, 'property-solar');
  assert.equal(validateStep({ ...solar, service: 'pattern' }, 1)?.field, 'case');
  assert.equal(validateStep({ ...solar, service: 'pattern' }, 2)?.field, 'project');
  assert.equal(validateStep({ ...solar, service: 'pattern', project: 'Ainda não', voltage: '' }, 2)?.field, 'voltage');
  assert.equal(validateStep({ ...solar, name: '' }, 3)?.field, 'name');
});

test('photos reject unsupported formats, empty files and files above 4 MB', () => {
  assert.equal(validatePhoto({ name: 'conta.jpg', type: 'image/jpeg', size: MAX_PHOTO_BYTES }), '');
  assert.ok(validatePhoto({ name: 'conta.HEIC', type: '', size: 42 }));
  assert.ok(validatePhoto({ name: 'conta.jpg', type: 'text/plain', size: 10 }));
  assert.ok(validatePhoto({ name: 'conta.jpg', type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 }));
  assert.ok(validatePhoto({ name: 'conta.jpg', type: 'image/jpeg', size: 0 }));
});

test('summary and WhatsApp share the same data and do not claim a photo was sent', () => {
  const data = { ...solar, consumption: '', photo: 'conta & luz.jpg', notes: '<script>texto</script>\nDúvida & instalação?' };
  const url = new URL(buildWhatsappUrl(data));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/5541995587407');
  const message = url.searchParams.get('text');
  assert.match(message, /^\*Pedido de orçamento\*\n\n\*Serviço e local\*\n/);
  assert.match(message, /• Energia Solar\n• Matinhos · Residencial\n/);
  assert.match(message, /\n\*Consumo\*\n• Conferir foto da conta que vou anexar\n/);
  assert.match(message, /\n\*Contato\*\n/);
  assert.match(message, /• Nome: Teste local\n/);
  assert.match(message, /• WhatsApp: \(41\) 99999-9999\n/);
  assert.match(message, /\n\*Observação\*\n<script>texto<\/script>\nDúvida & instalação\?/);
  assert.doesNotMatch(message, /conta & luz.jpg|Não selecionada/);
  assert.doesNotMatch(message, /Foto da conta anexada/);
  const patternRows = summaryRows({ ...solar, service: 'pattern', serviceCase: 'Troca', project: 'Ainda não', voltage: 'Não sei' });
  assert.ok(patternRows.some(([key]) => key === 'Necessidade'));
  assert.ok(!patternRows.some(([key]) => key === 'Consumo médio'));
});

test('WhatsApp request omits absent photo and includes only the selected service fields', () => {
  const standard = new URL(buildWhatsappUrl({ ...solar, bestTime: 'No horário comercial' })).searchParams.get('text');
  assert.match(standard, /\n\*Consumo\*\n• 450.5 kWh\/mês\n/);
  assert.match(standard, /• Melhor horário: No horário comercial$/);
  assert.doesNotMatch(standard, /Conta de luz|Foto|Não selecionada|Necessidade/);

  const pattern = new URL(buildWhatsappUrl({ ...solar, service: 'pattern', serviceCase: 'Troca ou adequação', project: 'Ainda não', voltage: 'Bifásico 127/220 V', consumption: '', photo: 'local.jpg' })).searchParams.get('text');
  assert.match(pattern, /\*Serviço e local\*\n• Padrão \/ Poste\n/);
  assert.match(pattern, /\n\*Detalhes\*\n/);
  assert.match(pattern, /• Necessidade: Troca ou adequação\n/);
  assert.match(pattern, /• Projeto ou orientação: Ainda não\n/);
  assert.match(pattern, /• Tensão de rede: Bifásico 127\/220 V\n/);
  assert.match(pattern, /• Foto do local: vou anexar nesta conversa\n/);
  assert.doesNotMatch(pattern, /Consumo|Conta de luz|local.jpg/);
});

test('submission data excludes answers that belong to the other service', () => {
  const solarData = fieldsForActiveService({ ...solar, serviceCase: 'Troca ou adequação', project: 'Ainda não' });
  assert.equal(solarData.serviceCase, '');
  assert.equal(solarData.project, '');
  assert.equal(solarData.voltage, '');
  const patternData = fieldsForActiveService({ ...solar, service: 'pattern', consumption: '450.5' });
  assert.equal(patternData.consumption, '');
});

test('customer summary and WhatsApp omit unselected optional photo and time', () => {
  const data = { ...solar, photo: '', bestTime: '' };
  const rows = summaryRows(data);
  assert.doesNotMatch(JSON.stringify(rows), /Conta de luz|Foto do local|Não selecionada|Melhor horário|A combinar/);
  const message = new URL(buildWhatsappUrl(data)).searchParams.get('text');
  assert.doesNotMatch(message, /Conta de luz|Foto|Não selecionada|Melhor horário|A combinar/);

  const withPhoto = summaryRows({ ...data, photo: 'conta.png' }, { photoStored: true });
  assert.ok(withPhoto.some(([label, value]) => label === 'Conta de luz' && value === 'Recebida pelo formulário'));
  const photoMessage = new URL(buildWhatsappUrl({ ...data, photo: 'conta.png' }, { photoStored: true })).searchParams.get('text');
  assert.match(photoMessage, /Foto da conta: enviada pelo formulário/);

  const photoOnly = summaryRows({ ...data, consumption: '', photo: 'conta.png' }, { photoStored: true });
  assert.equal(photoOnly.find(([label]) => label === 'Consumo médio')[1], 'Conferir a conta de luz recebida pelo formulário');
  assert.ok(!photoOnly.some(([label]) => label === 'Conta de luz'), 'Do not repeat the received-photo status');
});

test('submission failures give a useful next step without exposing server details', () => {
  for (const message of Object.values(FORM_ERRORS)) {
    assert.equal(submissionErrorMessage({ status: 400, message }), message);
  }
  const unreadableBill = submissionErrorMessage({
    status: 400,
    message: 'Não conseguimos ler uma conta de luz nessa foto. Envie outra ou informe o consumo.'
  });
  const unavailableOcr = submissionErrorMessage({
    status: 503,
    message: 'Não foi possível analisar a conta agora. Tente outra foto ou informe o consumo.'
  });
  assert.match(unreadableBill, /remova a foto para informar o consumo/);
  assert.match(unavailableOcr, /remova a foto para informar o consumo/);
  assert.notEqual(unreadableBill, unavailableOcr);

  const serverFailure = submissionErrorMessage({
    status: 500,
    message: 'Error: Cannot find module netlify/lib/order.mjs',
    responseParsed: false
  });
  assert.match(serverFailure, /confirmar o registro/);
  assert.match(serverFailure, /continuam aqui/);
  assert.doesNotMatch(serverFailure, /Error|module|Netlify|Tesseract/i);

  const connectionFailure = submissionErrorMessage({ networkError: true });
  assert.match(connectionFailure, /confirmar se o pedido foi registrado/);
  assert.match(connectionFailure, /confira com o atendimento antes de reenviar/i);
  assert.match(connectionFailure, /continuam aqui/);
  assert.match(submissionErrorMessage({ status: 429 }), /Aguarde um pouco/);
  assert.match(submissionErrorMessage({ status: 413 }), /4 MB/);
  assert.match(submissionErrorMessage({ status: 403 }), /Atualize a página/);
});

test('scientific consumption appears as an ordinary number in summary and WhatsApp', () => {
  for (const [input, expected] of [['1e3', '1000'], ['1e-2', '0.01'], ['450.5', '450.5']]) {
    const data = { ...solar, consumption: input };
    assert.equal(validateStep(data, 2), null);
    assert.equal(summaryRows(data).find(([label]) => label === 'Consumo médio')[1], `${expected} kWh / mês`);
    const message = new URL(buildWhatsappUrl(data)).searchParams.get('text');
    assert.ok(message.includes(`*Consumo*\n• ${expected} kWh/mês`));
    assert.ok(!message.includes(`*Consumo*\n• ${input} kWh/mês`) || input === expected);
  }
});
