const loginForm = document.getElementById('login-form');
const inviteForm = document.getElementById('invite-form');
const section = document.getElementById('orders-section');
const list = document.getElementById('orders-list');
const status = document.getElementById('admin-status');
const imageUrls = [];
let inviteToken = new URLSearchParams(location.hash.slice(1)).get('invite_token');
if (inviteToken) {
  history.replaceState(null, '', location.pathname + location.search);
  loginForm.hidden = true;
  inviteForm.hidden = false;
}

function addText(parent, tag, label, value) {
  const element = document.createElement(tag);
  element.textContent = label ? `${label}: ${value}` : value;
  parent.append(element);
}

async function loadPhoto(id, container) {
  const response = await fetch(`/api/photo?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
  if (!response.ok) { addText(container, 'p', '', 'Foto temporariamente indisponível.'); return; }
  const url = URL.createObjectURL(await response.blob());
  imageUrls.push(url);
  const image = document.createElement('img');
  image.src = url;
  image.alt = 'Foto enviada com o pedido';
  container.append(image);
}

async function loadOrders() {
  const response = await fetch('/api/orders', { credentials: 'same-origin' });
  if (!response.ok) {
    loginForm.hidden = false;
    section.hidden = true;
    status.textContent = response.status === 403 ? 'Entre com uma conta autorizada como admin.' : 'Pedidos indisponíveis.';
    return;
  }
  const { orders } = await response.json();
  imageUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
  list.replaceChildren();
  if (!orders.length) addText(list, 'p', '', 'Ainda não há pedidos.');
  for (const order of orders) {
    const card = document.createElement('article');
    card.className = 'admin-order';
    addText(card, 'h2', '', `${order.data.service === 'solar' ? 'Energia Solar' : 'Padrão / Poste'} · ${order.data.name}`);
    addText(card, 'p', 'Referência', order.id);
    addText(card, 'p', 'Recebido', new Date(order.savedAt).toLocaleString('pt-BR'));
    addText(card, 'p', 'Cidade e imóvel', `${order.data.city} · ${order.data.property}`);
    if (order.data.service === 'solar') addText(card, 'p', 'Consumo', order.data.consumption || 'Consultar conta enviada');
    else {
      addText(card, 'p', 'Necessidade', order.data.serviceCase);
      addText(card, 'p', 'Projeto ou orientação', order.data.project);
    }
    addText(card, 'p', 'Contato', `${order.data.phone} · ${order.data.bestTime || 'A combinar'}`);
    if (order.data.notes) addText(card, 'p', 'Observação', order.data.notes);
    list.append(card);
    if (order.data.photo) loadPhoto(order.id, card).catch(() => addText(card, 'p', '', 'Foto temporariamente indisponível.'));
  }
  loginForm.hidden = true;
  section.hidden = false;
  status.textContent = '';
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = 'Entrando…';
  const fields = new FormData(loginForm);
  try {
    const response = await fetch('/api/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') })
    });
    if (!response.ok) throw new Error('Confira seu acesso e tente novamente.');
    loginForm.reset();
    await loadOrders();
  } catch (error) { status.textContent = error.message; }
});

inviteForm.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = new FormData(inviteForm);
  const password = String(fields.get('password') || '');
  if (password !== fields.get('confirm')) {
    status.textContent = 'As senhas não coincidem.';
    return;
  }
  status.textContent = 'Ativando acesso…';
  try {
    const response = await fetch('/api/accept-invite', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, password })
    });
    if (!response.ok) throw new Error('Convite inválido ou expirado. Peça um novo convite.');
    inviteToken = null;
    inviteForm.reset();
    inviteForm.hidden = true;
    loginForm.hidden = false;
    await loadOrders();
    if (section.hidden) status.textContent = 'Acesso ativado. Entre com sua nova senha.';
  } catch (error) { status.textContent = error.message; }
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  imageUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
  list.replaceChildren();
  section.hidden = true;
  loginForm.hidden = false;
  status.textContent = '';
});

if (!inviteToken) loadOrders().catch(() => { status.textContent = 'Não foi possível carregar os pedidos.'; });
