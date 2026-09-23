import { SERVICE_LABELS, formatPhone, validatePhoto, validateStep, summaryRows } from './form-core.mjs';

const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
const form = elements['lead-form'];
const panels = [...form.querySelectorAll('.step-panel')];
const groups = Object.fromEntries(['service', 'case', 'project'].map((key) => [key, [...form.querySelectorAll(`[data-${key}]`)]]));
const state = { step: 0, service: '', serviceCase: '', project: '' };
const galleryPhotos = {
  solar: [
    { src: './assets/solar-01.jpg', alt: 'Painéis solares instalados sobre telhado de cerâmica' },
    { src: './assets/solar-02.jpg', alt: 'Painéis solares vistos de perto sobre telhado de cerâmica' },
    { src: './assets/solar-03.jpg', alt: 'Fileira de painéis solares sobre telhado' }
  ],
  pattern: [
    { src: './assets/pattern-01.jpg', alt: 'Padrão de entrada junto ao portão de um imóvel' },
    { src: './assets/pattern-02.jpg', alt: 'Poste com padrão de entrada em frente a um imóvel' },
    { src: './assets/pattern-03.jpg', alt: 'Padrão de entrada em poste em área externa' }
  ]
};
const gallerySelection = { solar: 0, pattern: 0 };
const files = [
  { input: elements['bill-photo'], label: elements['bill-file-name'] },
  { input: elements['pattern-photo'], label: elements['pattern-file-name'] }
];
let invalidControl;
let isSubmitting = false;

function clearError() {
  elements['error-message'].textContent = '';
  if (invalidControl) {
    invalidControl.removeAttribute('aria-invalid');
    const descriptions = (invalidControl.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== 'error-message');
    if (descriptions.length) invalidControl.setAttribute('aria-describedby', descriptions.join(' '));
    else invalidControl.removeAttribute('aria-describedby');
    invalidControl = null;
  }
}

function showError({ field, message }) {
  clearError();
  invalidControl = elements[field] || groups[field]?.[0];
  elements['error-message'].textContent = message;
  if (invalidControl) {
    invalidControl.setAttribute('aria-invalid', 'true');
    invalidControl.setAttribute('aria-describedby', `${invalidControl.getAttribute('aria-describedby') || ''} error-message`.trim());
    invalidControl.focus();
  }
}

function selectOption(key, value) {
  groups[key].forEach((button) => {
    const selected = button.dataset[key] === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function focusHeading() {
  elements['step-title'].focus({ preventScroll: true });
  elements.form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

function renderGallery() {
  const photos = galleryPhotos[state.service];
  if (!photos) return;
  const selected = gallerySelection[state.service];
  const main = photos[selected];
  elements['gallery-main'].src = main.src;
  elements['gallery-main'].alt = main.alt;
  elements['gallery-counter'].textContent = `Foto ${selected + 1} de ${photos.length}`;
  elements['gallery-thumbs'].replaceChildren(...photos.flatMap((photo, index) => {
    if (index === selected) return [];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-thumb';
    button.dataset.galleryIndex = String(index);
    button.setAttribute('aria-label', `Mostrar foto ${index + 1}: ${photo.alt}`);
    const preview = document.createElement('img');
    preview.src = photo.src;
    preview.alt = '';
    preview.loading = 'lazy';
    button.append(preview);
    return [button];
  }));
}

function renderStep({ focus = true } = {}) {
  clearError();
  const { step, service } = state;
  const start = step === 0;
  const solar = service === 'solar';
  const label = SERVICE_LABELS[service];
  form.hidden = false;
  elements['result-view'].hidden = true;
  for (const id of ['head-meta', 'progress-track', 'action-row', 'back-button']) elements[id].hidden = start;
  elements['step-kicker'].textContent = label || '';
  elements['step-counter'].textContent = start ? '' : `${step} de 3`;
  const titles = ['Solicite seu orçamento', `${label} — 1 de 3`, solar ? 'Qual o consumo médio de energia?' : 'Padrão / Poste — 2 de 3', 'Contato — 3 de 3'];
  const descriptions = ['Responda algumas informações para nossa equipe analisar seu projeto.', 'Onde será feita a instalação?', solar ? 'Informe o consumo em kWh ou selecione uma foto da conta de luz.' : 'Adicione mais um detalhe do seu pedido.', 'Como nossa equipe pode falar com você?'];
  elements['step-title'].textContent = titles[step];
  elements['step-description'].textContent = descriptions[step];
  elements['progress-value'].style.width = `${step / 3 * 100}%`;
  elements['progress-track'].setAttribute('aria-valuenow', String(step));
  elements['progress-track'].setAttribute('aria-valuetext', `Etapa ${step} de 3`);
  panels.forEach((panel) => {
    panel.hidden = Number(panel.dataset.step) !== step;
  });
  for (const suffix of ['context', 'evidence']) {
    elements[`solar-${suffix}`].hidden = !solar;
    elements[`pattern-${suffix}`].hidden = solar;
  }
  if (step === 1) renderGallery();
  // Inactive controls must not participate in keyboard submission or validation.
  form.querySelectorAll('input, select, textarea').forEach((input) => { input.disabled = Boolean(input.closest('[hidden]')); });
  elements['next-label'].textContent = step === 3 ? 'Enviar pedido' : 'Próximo';
  elements['next-icon'].setAttribute('d', step === 3 ? 'm5 12 4 4L19 6' : 'M5 12h14M13 6l6 6-6 6');
  if (focus) focusHeading();
}

function readData() {
  const value = (id) => elements[id].value.trim();
  const photoInput = state.service === 'solar' ? elements['bill-photo'] : elements['pattern-photo'];
  return {
    service: state.service,
    city: value(`city-${state.service}`),
    property: value(`property-${state.service}`),
    serviceCase: state.serviceCase,
    project: state.project,
    consumption: value('consumption'),
    photo: photoInput.files[0]?.name || '',
    name: value('name'), phone: value('phone'), bestTime: value('best-time'), notes: value('notes')
  };
}

function showResult(data, submitted) {
  const rows = summaryRows(data, { photoStored: submitted.photoStored }).map(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const title = document.createElement('span');
    const content = document.createElement('strong');
    title.textContent = label;
    content.textContent = value;
    row.append(title, content);
    return row;
  });
  elements.summary.replaceChildren(...rows);
  elements['send-whatsapp'].href = submitted.whatsappUrl;
  elements['result-meta-text'].textContent = submitted.photoStored
    ? 'Pedido e foto registrados. Abra o WhatsApp e envie a mensagem para iniciar a conversa.'
    : 'Pedido registrado. Abra o WhatsApp e envie a mensagem para iniciar a conversa.';
  elements['head-meta'].hidden = true;
  elements['progress-track'].hidden = true;
  elements['step-title'].textContent = 'Pedido registrado';
  elements['step-description'].textContent = `Referência ${submitted.id}. Confira os dados e envie a mensagem pelo WhatsApp.`;
  form.hidden = true;
  elements['result-view'].hidden = false;
  focusHeading();
}

form.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-gallery-index')) {
    gallerySelection[state.service] = Number(button.dataset.galleryIndex);
    renderGallery();
    return;
  }
  for (const key of ['service', 'case', 'project']) {
    if (!button.hasAttribute(`data-${key}`)) continue;
    state[key === 'case' ? 'serviceCase' : key] = button.dataset[key];
    selectOption(key, button.dataset[key]);
    clearError();
    if (key === 'service') {
      state.step = 1;
      renderStep();
    }
    break;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.step || isSubmitting) return;
  const data = readData();
  // Validate previous steps again when editing a completed request.
  const steps = state.step === 3 ? [1, 2, 3] : [state.step];
  for (const step of steps) {
    const error = step === 2 && state.service === 'solar' && elements.consumption.validity.badInput
      ? { field: 'consumption', message: 'Informe um consumo numérico válido.' }
      : validateStep(data, step);
    if (error) {
      if (state.step !== step) { state.step = step; renderStep(); }
      showError(error);
      return;
    }
  }
  if (state.step !== 3) { state.step += 1; renderStep(); return; }
  const payload = new FormData();
  payload.set('data', JSON.stringify(data));
  payload.set('website', elements.website.value);
  const selectedFile = (state.service === 'solar' ? elements['bill-photo'] : elements['pattern-photo']).files[0];
  if (selectedFile) payload.set('photo', selectedFile);
  isSubmitting = true;
  elements['next-button'].disabled = true;
  elements['next-label'].textContent = 'Enviando pedido…';
  try {
    const response = await fetch('/api/submit', { method: 'POST', body: payload });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o pedido.');
    showResult(data, result);
  } catch (error) {
    elements['error-message'].textContent = error.message || 'Atendimento indisponível. Tente novamente.';
    elements['error-message'].focus();
  } finally {
    isSubmitting = false;
    elements['next-button'].disabled = false;
    if (!form.hidden) elements['next-label'].textContent = 'Enviar pedido';
  }
});

elements['back-button'].addEventListener('click', () => {
  state.step = Math.max(0, state.step - 1);
  renderStep();
});
elements['edit-button'].addEventListener('click', () => { state.step = 3; renderStep(); });
elements.phone.addEventListener('blur', () => { elements.phone.value = formatPhone(elements.phone.value); });
form.addEventListener('input', clearError);
form.addEventListener('change', (event) => { if (event.target.type !== 'file') clearError(); });

files.forEach(({ input, label }) => {
  input.addEventListener('change', () => {
    clearError();
    const file = input.files[0];
    const message = validatePhoto(file);
    if (message) input.value = '';
    label.textContent = !message && file ? file.name : 'Nenhuma imagem selecionada';
    if (message) showError({ field: input.id, message });
  });
});

elements['restart-button'].addEventListener('click', () => {
  Object.assign(state, { step: 0, service: '', serviceCase: '', project: '' });
  gallerySelection.solar = 0;
  gallerySelection.pattern = 0;
  form.reset();
  files.forEach(({ label }) => { label.textContent = 'Nenhuma imagem selecionada'; });
  for (const key of ['service', 'case', 'project']) selectOption(key, '');
  elements.summary.replaceChildren();
  elements['send-whatsapp'].removeAttribute('href');
  renderStep();
});

renderStep({ focus: false });
