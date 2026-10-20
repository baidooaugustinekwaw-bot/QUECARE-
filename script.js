// QueueCare: an array-based FIFO queue demonstration.
const queue = [];
const history = [];
let customersServed = 0;
let lastServed = null;

const $ = (id) => document.getElementById(id);
const form = $('customerForm');
const nameInput = $('customerName');
const serviceInput = $('serviceType');
const message = $('message');
const queueBody = $('queueBody');
const searchInput = $('searchInput');
const dialog = $('confirmDialog');
let pendingConfirm = null;

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
function timeText(date) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}
function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? '#b91c1c' : '#15803d';
}
function render() {
  $('waitingStat').textContent = queue.length;
  $('servedStat').textContent = customersServed;
  $('nextStat').textContent = queue.length ? queue[0].name : '—';
  $('queueBadge').textContent = queue.length;
  $('serveNext').disabled = queue.length === 0;
  $('undoServe').disabled = !lastServed;

  const term = searchInput.value.trim().toLowerCase();
  const visible = queue.map((person, index) => ({ ...person, position: index + 1 }))
    .filter(person => person.name.toLowerCase().includes(term) || person.service.toLowerCase().includes(term));

  if (!visible.length) {
    queueBody.innerHTML = `<tr><td colspan="5" class="empty-state">${queue.length ? 'No customers match your search.' : 'Your queue is empty. Add a customer to get started.'}</td></tr>`;
  } else {
    queueBody.innerHTML = visible.map(person => `
      <tr>
        <td><span class="position-chip">${person.position}</span></td>
        <td class="customer-cell">${escapeText(person.name)}</td>
        <td><span class="service-chip">${escapeText(person.service)}</span></td>
        <td>${timeText(person.arrivedAt)}</td>
        <td><button class="row-action" type="button" data-remove="${person.id}" aria-label="Remove ${escapeText(person.name)}">Remove</button></td>
      </tr>`).join('');
  }

  $('historyList').innerHTML = history.length ? history.slice(0, 8).map(person => `
    <li><div><div class="history-name">${escapeText(person.name)}</div>
    <div class="history-meta">${escapeText(person.service)} · Served ${timeText(person.servedAt)}</div></div>
    <span class="history-time">Completed</span></li>`).join('') : '<li class="empty-state">No customers have been served yet.</li>';
}
function confirmAction(title, text, action) {
  $('dialogTitle').textContent = title;
  $('dialogText').textContent = text;
  pendingConfirm = action;
  dialog.showModal();
}
$('confirmAction').addEventListener('click', event => {
  event.preventDefault();
  dialog.close();
  if (pendingConfirm) pendingConfirm();
  pendingConfirm = null;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { showMessage('Please enter a customer name.', true); nameInput.focus(); return; }
  if (queue.some(person => person.name.toLowerCase() === name.toLowerCase())) {
    showMessage('That customer is already waiting in the queue.', true);
    nameInput.focus();
    return;
  }
  queue.push({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    service: serviceInput.value,
    arrivedAt: new Date()
  }); // ENQUEUE: add to the back of the array.
  showMessage(`${name} has joined the queue.`);
  form.reset();
  nameInput.focus();
  render();
});

$('serveNext').addEventListener('click', () => {
  if (!queue.length) { showMessage('There are no customers waiting.', true); return; }
  const customer = queue.shift(); // DEQUEUE: remove the first array item (FIFO).
  customer.servedAt = new Date();
  lastServed = customer;
  history.unshift(customer);
  customersServed += 1;
  $('nowServing').textContent = customer.name;
  $('servingType').textContent = customer.service;
  $('servingAvatar').textContent = initials(customer.name);
  showMessage(`Now serving ${customer.name}.`);
  render();
});

$('undoServe').addEventListener('click', () => {
  if (!lastServed) return;
  const customer = lastServed;
  queue.unshift({ id: customer.id, name: customer.name, service: customer.service, arrivedAt: customer.arrivedAt });
  const historyIndex = history.findIndex(person => person.id === customer.id);
  if (historyIndex !== -1) history.splice(historyIndex, 1);
  customersServed = Math.max(0, customersServed - 1);
  lastServed = null;
  $('nowServing').textContent = 'No customer served yet';
  $('servingType').textContent = 'Serve the next person when ready.';
  $('servingAvatar').textContent = '—';
  showMessage(`${customer.name} was returned to the front of the queue.`);
  render();
});

queueBody.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = queue.findIndex(person => person.id === button.dataset.remove);
  if (index < 0) return;
  const [removed] = queue.splice(index, 1);
  showMessage(`${removed.name} was removed from the waiting list.`);
  render();
});

$('clearQueue').addEventListener('click', () => {
  if (!queue.length) { showMessage('The waiting list is already empty.'); return; }
  confirmAction('Clear the waiting list?', `This will remove all ${queue.length} waiting customer(s). Recently served history will remain.`, () => {
    queue.length = 0;
    showMessage('The waiting list has been cleared.');
    render();
  });
});
$('clearHistory').addEventListener('click', () => {
  if (!history.length) { showMessage('There is no service history to clear.'); return; }
  confirmAction('Clear service history?', 'This will remove the recently served list from this screen.', () => {
    history.length = 0;
    lastServed = null;
    showMessage('Service history cleared.');
    render();
  });
});
searchInput.addEventListener('input', render);
render();
