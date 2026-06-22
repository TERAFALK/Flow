import { api } from '../api.js';
import { fmtDate } from '../app.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderCustomers(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Kunder</div>
        <div class="page-subtitle">Kundregister</div>
      </div>
      <button class="btn btn-primary" id="new-customer-btn">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Ny kund
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-wrap">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input type="search" id="customer-search" placeholder="Sök kund…">
        </div>
      </div>
      <div id="customer-list"><div class="loading">Laddar…</div></div>
    </div>
  `;

  document.getElementById('new-customer-btn').addEventListener('click', () => openCustomerForm(null, reload));

  let searchTimer;
  document.getElementById('customer-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadList(e.target.value), 300);
  });

  async function loadList(q = '') {
    const list = document.getElementById('customer-list');
    if (!list) return;
    const customers = await api.get(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (!customers.length) {
      list.innerHTML = `<div class="empty-state"><p>Inga kunder hittade</p></div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Namn</th><th>Org.nr</th><th>Telefon</th><th>E-post</th><th>Ort</th><th></th></tr></thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td><strong><a href="#/customers/${c.id}">${c.name}</a></strong></td>
                <td>${c.org_number || '–'}</td>
                <td>${c.phone || '–'}</td>
                <td>${c.email || '–'}</td>
                <td>${c.city || '–'}</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn-icon" title="Redigera" onclick="window._editCustomer(${c.id})">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                    </button>
                    <button class="btn-icon" title="Ta bort" onclick="window._deleteCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function reload() { loadList(document.getElementById('customer-search')?.value || ''); }

  window._editCustomer = async (id) => {
    const c = await api.get(`/customers/${id}`);
    openCustomerForm(c, reload);
  };
  window._deleteCustomer = async (id, name) => {
    if (await confirmDialog(`Ta bort kunden <strong>${name}</strong>? Detta kan inte ångras.`)) {
      await api.delete(`/customers/${id}`);
      showToast('Kund borttagen', 'success');
      reload();
    }
  };

  await loadList();
}

export async function renderCustomerDetail(el, id) {
  el.innerHTML = '<div class="loading">Laddar…</div>';
  const c = await api.get(`/customers/${id}`);
  const vehicles = await api.get(`/vehicles?customer_id=${id}`);
  const orders = await api.get(`/work-orders?q=${encodeURIComponent(c.name)}`).catch(() => []);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/customers" class="btn btn-ghost btn-sm" style="margin-bottom:8px">← Tillbaka</a>
        <div class="page-title">${c.name}</div>
        <div class="page-subtitle">${c.org_number || ''}</div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="window._editCustomer2(${c.id})">Redigera</button>
        <a href="#/work-orders/new?customer=${c.id}" class="btn btn-primary">Ny arbetsorder</a>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:20px;align-items:start">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Kontaktuppgifter</span></div>
          <div class="card-body">
            ${row('Telefon', c.phone)} ${row('E-post', c.email)}
            ${row('Adress', c.address)} ${row('Ort', `${c.postal_code || ''} ${c.city || ''}`.trim())}
            ${c.notes ? `<hr class="divider"><p class="text-small text-muted">${c.notes}</p>` : ''}
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Fordon (${vehicles.length})</span>
            <a href="#/vehicles/new?customer=${c.id}" class="btn btn-ghost btn-sm">+ Lägg till</a>
          </div>
          <div class="card-body" style="padding:0">
            ${vehicles.length ? vehicles.map(v => `
              <a href="#/vehicles/${v.id}" style="display:block;padding:12px 16px;border-bottom:1px solid var(--border-light)">
                <strong>${v.license_plate}</strong>
                <span class="text-muted text-small"> ${v.make || ''} ${v.model || ''} ${v.year || ''}</span>
              </a>
            `).join('') : '<p class="text-muted text-small" style="padding:16px">Inga fordon registrerade</p>'}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Arbetsorder-historik</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Fordon</th><th>Beskrivning</th><th>Status</th><th>Datum</th></tr></thead>
            <tbody>
              ${orders.filter(o => o.customer_id == id).length
                ? orders.filter(o => o.customer_id == id).map(o => `
                  <tr class="clickable" onclick="location.hash='#/work-orders/${o.id}'">
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.vehicle?.license_plate || '–'}</td>
                    <td>${o.description}</td>
                    <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
                    <td class="text-muted">${fmtDate(o.created_at)}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:24px">Inga arbetsorder</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  window._editCustomer2 = async (id) => {
    const c = await api.get(`/customers/${id}`);
    openCustomerForm(c, () => renderCustomerDetail(el, id));
  };
}

function row(label, value) {
  if (!value) return '';
  return `<div class="meta-row"><span class="meta-label">${label}:</span><span>${value}</span></div>`;
}

function statusLabel(s) {
  return { ny: 'Ny', planerad: 'Planerad', pagaende: 'Pågående', klar: 'Klar', fakturerad: 'Fakturerad' }[s] || s;
}

function openCustomerForm(customer, onSaved) {
  openModal({
    title: customer ? 'Redigera kund' : 'Ny kund',
    size: 'modal-lg',
    body: `
      <form id="customer-form">
        <div class="form-row">
          <div class="field"><label>Namn *</label><input type="text" name="name" value="${customer?.name || ''}" required></div>
          <div class="field"><label>Org.nr</label><input type="text" name="org_number" value="${customer?.org_number || ''}"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Telefon</label><input type="text" name="phone" value="${customer?.phone || ''}"></div>
          <div class="field"><label>E-post</label><input type="email" name="email" value="${customer?.email || ''}"></div>
        </div>
        <div class="field"><label>Adress</label><input type="text" name="address" value="${customer?.address || ''}"></div>
        <div class="form-row">
          <div class="field"><label>Postnummer</label><input type="text" name="postal_code" value="${customer?.postal_code || ''}"></div>
          <div class="field"><label>Ort</label><input type="text" name="city" value="${customer?.city || ''}"></div>
        </div>
        <div class="field"><label>Anteckningar</label><textarea name="notes">${customer?.notes || ''}</textarea></div>
        <div class="modal-footer" style="padding:0;border:none;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
          <button type="submit" class="btn btn-primary">${customer ? 'Spara' : 'Skapa kund'}</button>
        </div>
      </form>
    `,
  });

  document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    Object.keys(body).forEach(k => { if (!body[k]) body[k] = null; });
    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, body);
        showToast('Kund uppdaterad', 'success');
      } else {
        await api.post('/customers', body);
        showToast('Kund skapad', 'success');
      }
      closeModal();
      onSaved?.();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
