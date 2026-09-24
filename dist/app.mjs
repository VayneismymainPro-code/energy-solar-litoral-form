import { SERVICE_LABELS, fieldsForActiveService, formatPhone, validatePhoto, validateStep, summaryRows } from './form-core.mjs';
import { submissionErrorMessage } from './submission-error.mjs';

if (new URLSearchParams(location.hash.slice(1)).has('invite_token')) {
  location.replace(`/admin.html${location.hash}`);
}

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
  { input: elements['bill-photo'], label: elements['bill-file-name'], clearButton: elements['clear-bill-photo'] },
  { input: elements['pattern-photo'], label: elements['pattern-file-name'], clearButton: elements['clear-pattern-photo'] }
];
let invalidControl;
let hasSubmittedOrder = false;

function clearError() {
  if (!invalidControl && !elements['error-message'].textContent) return;
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

function showSubmissionError(message) {
  clearError();
  elements['error-message'].textContent = message;
  elements['error-message'].focus();
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
  elements['service-gallery'].dataset.galleryService = state.service;
  elements['gallery-main'].src = main.src;
  elements['gallery-main'].alt = main.alt;
  elements['gallery-open'].setAttribute('aria-label', `Ampliar foto ${selected + 1} de ${photos.length}: ${main.alt}`);
  elements['gallery-counter'].textContent = `Foto ${selected + 1} de ${photos.length}`;
  elements['gallery-dialog-title'].textContent = `Foto ampliada — ${SERVICE_LABELS[state.service]}`;
  elements['gallery-dialog-image'].src = main.src;
  elements['gallery-dialog-image'].alt = main.alt;
  elements['gallery-thumbs'].replaceChildren(...photos.map((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gallery-thumb${index === selected ? ' is-active' : ''}`;
    button.dataset.galleryIndex = String(index);
    button.setAttribute('aria-label', `Foto ${index + 1}: ${photo.alt}`);
    button.setAttribute('aria-pressed', String(index === selected));
    const preview = document.createElement('img');
    preview.src = photo.src;
    preview.alt = '';
    preview.loading = 'lazy';
    button.append(preview);
    return button;
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
  elements['customer-reviews'].hidden = true;
  for (const id of ['head-meta', 'progress-track', 'action-row', 'back-button']) elements[id].hidden = start;
  elements['step-kicker'].textContent = label || '';
  elements['step-counter'].textContent = start ? '' : `${step} de 3`;
  const titles = ['Seu projeto começa aqui.', 'Onde será a instalação?', solar ? 'Qual é o consumo médio de energia?' : 'O que está definido até agora?', 'Como a equipe pode falar com você?'];
  const descriptions = [
    'Escolha um serviço e responda às perguntas para organizar seu pedido.',
    solar ? 'Informe a cidade e o tipo de imóvel.' : 'Informe a cidade, o tipo de imóvel e o que você precisa resolver.',
    solar ? 'Informe o consumo médio mensal em kWh ou selecione uma foto da conta de luz.' : 'Informe o que souber sobre o projeto e a tensão de rede. Se quiser, inclua uma foto.',
    'Informe seu nome e WhatsApp. O melhor horário é opcional.'
  ];
  elements['step-title'].textContent = titles[step];
  elements['step-description'].textContent = descriptions[step];
  elements['edit-note'].hidden = step !== 3 || !hasSubmittedOrder;
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
  return fieldsForActiveService({
    service: state.service,
    city: value(`city-${state.service}`),
    property: value(`property-${state.service}`),
    serviceCase: state.serviceCase,
    project: state.project,
    voltage: value('voltage'),
    consumption: value('consumption'),
    photo: photoInput.files[0]?.name || '',
    name: value('name'), phone: value('phone'), bestTime: value('best-time'), notes: value('notes')
  });
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
  hasSubmittedOrder = true;
  elements['edit-note'].hidden = true;
  elements['head-meta'].hidden = true;
  elements['progress-track'].hidden = true;
  elements['step-title'].textContent = 'Pedido registrado';
  elements['step-description'].textContent = 'Confira os dados e continue pelo WhatsApp.';
  form.hidden = true;
  elements['result-view'].hidden = false;
  elements['customer-reviews'].hidden = false;
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

elements['gallery-open'].addEventListener('click', () => {
  if (!elements['gallery-dialog'].open) elements['gallery-dialog'].showModal();
});
elements['gallery-dialog-close'].addEventListener('click', () => elements['gallery-dialog'].close());
elements['gallery-dialog'].addEventListener('close', () => elements['gallery-open'].focus({ preventScroll: true }));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.step || elements['next-button'].disabled) return;
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
  elements['next-button'].disabled = true;
  elements['next-label'].textContent = 'Enviando pedido…';
  try {
    let response;
    try {
      response = await fetch('/api/submit', { method: 'POST', body: payload });
    } catch {
      showSubmissionError(submissionErrorMessage({ networkError: true }));
      return;
    }
    let result;
    try {
      result = await response.json();
    } catch {
      showSubmissionError(submissionErrorMessage({ status: response.status, responseParsed: false }));
      return;
    }
    if (!response.ok) {
      showSubmissionError(submissionErrorMessage({
        status: response.status,
        message: typeof result?.error === 'string' ? result.error : ''
      }));
      return;
    }
    if (typeof result?.id !== 'string' || typeof result.whatsappUrl !== 'string' || typeof result.photoStored !== 'boolean') {
      showSubmissionError(submissionErrorMessage({ status: response.status, responseParsed: false }));
      return;
    }
    showResult(data, result);
  } finally {
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

files.forEach(({ input, label, clearButton }) => {
  input.addEventListener('change', () => {
    clearError();
    const file = input.files[0];
    const message = validatePhoto(file);
    if (message) input.value = '';
    label.textContent = !message && file ? file.name : 'Nenhuma imagem selecionada';
    clearButton.hidden = Boolean(message) || !file;
    if (message) showError({ field: input.id, message });
  });
  clearButton.addEventListener('click', () => {
    input.value = '';
    label.textContent = 'Nenhuma imagem selecionada';
    clearButton.hidden = true;
    clearError();
    input.focus();
  });
});

elements['restart-button'].addEventListener('click', () => {
  Object.assign(state, { step: 0, service: '', serviceCase: '', project: '' });
  hasSubmittedOrder = false;
  gallerySelection.solar = 0;
  gallerySelection.pattern = 0;
  form.reset();
  files.forEach(({ label, clearButton }) => {
    label.textContent = 'Nenhuma imagem selecionada';
    clearButton.hidden = true;
  });
  for (const key of ['service', 'case', 'project']) selectOption(key, '');
  elements.summary.replaceChildren();
  elements['send-whatsapp'].removeAttribute('href');
  renderStep();
});

renderStep({ focus: false });
