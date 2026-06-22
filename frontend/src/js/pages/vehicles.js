import { api } from '../api.js';
import { fmtDate } from '../app.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderVehicles(el, params = {}) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Fordon</div>
        <div class="page-subtitle">Fordonsregister</div>
      </div>
      <button class="btn btn-primary" id="new-vehicle-btn">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Nytt fordon
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-wrap">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input type="search" id="vehicle-search" placeholder="Sök reg.nr…">
        </div>
      </div>
      <div id="vehicle-list"><div class="loading">Laddar…</div></div>
    </div>
  `;

  document.getElementById('new-vehicle-btn').addEventListener('click', () =>
    openVehicleForm(null, params.customer_id || null, reload)
  );

  let timer;
  document.getElementById('vehicle-search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => loadList(e.target.value), 300);
  });

  async function loadList(q = '') {
    const list = document.getElementById('vehicle-list');
    if (!list) return;
    let url = `/vehicles?`;
    if (q) url += `q=${encodeURIComponent(q)}&`;
    const vehicles = await api.get(url);
    if (!vehicles.length) {
      list.innerHTML = `<div class="empty-state"><p>Inga fordon hittade</p></div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Reg.nr</th><th>Märke / Modell</th><th>År</th><th>Kund</th><th>Mätarst.</th><th></th></tr></thead>
          <tbody>
            ${vehicles.map(v => `
              <tr>
                <td><strong><a href="#/vehicles/${v.id}">${v.license_plate}</a></strong></td>
                <td>${v.make || ''} ${v.model || ''}</td>
                <td>${v.year || '–'}</td>
                <td>${v.customer?.name || '–'}</td>
                <td>${v.odometer ? v.odometer.toLocaleString('sv-SE') + ' mil' : '–'}</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn-icon" title="Redigera" onclick="window._editVehicle(${v.id})">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                    </button>
                    <button class="btn-icon" title="Ta bort" onclick="window._deleteVehicle(${v.id}, '${v.license_plate}')">
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

  function reload() { loadList(document.getElementById('vehicle-search')?.value || ''); }

  window._editVehicle = async (id) => {
    const v = await api.get(`/vehicles/${id}`);
    openVehicleForm(v, null, reload);
  };
  window._deleteVehicle = async (id, plate) => {
    if (await confirmDialog(`Ta bort fordonet <strong>${plate}</strong>?`)) {
      await api.delete(`/vehicles/${id}`);
      showToast('Fordon borttaget', 'success');
      reload();
    }
  };

  await loadList();
}

export async function renderVehicleDetail(el, id) {
  el.innerHTML = '<div class="loading">Laddar…</div>';
  const v = await api.get(`/vehicles/${id}`);
  const orders = await api.get(`/work-orders`).then(all => all.filter(o => o.vehicle_id == id)).catch(() => []);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/vehicles" class="btn btn-ghost btn-sm" style="margin-bottom:8px">← Tillbaka</a>
        <div class="page-title">${v.license_plate}</div>
        <div class="page-subtitle">${v.make || ''} ${v.model || ''} ${v.year ? '(' + v.year + ')' : ''}</div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="window._editVehicle2(${v.id})">Redigera</button>
        <a href="#/work-orders/new?vehicle=${v.id}&customer=${v.customer_id}" class="btn btn-primary">Ny arbetsorder</a>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">
      <div class="card">
        <div class="card-header"><span class="card-title">Fordonsdata</span></div>
        <div class="card-body">
          ${row('Kund', v.customer ? `<a href="#/customers/${v.customer_id}">${v.customer.name}</a>` : '–')}
          ${row('Regnummer', v.license_plate)}
          ${row('Chassinr', v.vin)}
          ${row('Märke', v.make)}
          ${row('Modell', v.model)}
          ${row('Årsmodell', v.year)}
          ${row('Motor', v.engine)}
          ${row('Växellåda', v.gearbox)}
          ${row('Mätarst.', v.odometer ? v.odometer.toLocaleString('sv-SE') + ' mil' : null)}
          ${v.notes ? `<hr class="divider"><p class="text-small text-muted">${v.notes}</p>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Arbetsorder-historik</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Beskrivning</th><th>Status</th><th>Datum</th></tr></thead>
            <tbody>
              ${orders.length
                ? orders.map(o => `
                  <tr class="clickable" onclick="location.hash='#/work-orders/${o.id}'">
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.description}</td>
                    <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
                    <td class="text-muted">${fmtDate(o.created_at)}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px">Inga arbetsorder</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  window._editVehicle2 = async (id) => {
    const v = await api.get(`/vehicles/${id}`);
    openVehicleForm(v, null, () => renderVehicleDetail(el, id));
  };
}

function row(label, value) {
  if (!value) return '';
  return `<div class="meta-row"><span class="meta-label">${label}:</span><span>${value}</span></div>`;
}
function statusLabel(s) {
  return { ny: 'Ny', planerad: 'Planerad', pagaende: 'Pågående', klar: 'Klar', fakturerad: 'Fakturerad' }[s] || s;
}

async function openVehicleForm(vehicle, defaultCustomerId, onSaved) {
  const customers = await api.get('/customers');
  openModal({
    title: vehicle ? 'Redigera fordon' : 'Nytt fordon',
    size: 'modal-lg',
    body: `
      <form id="vehicle-form">
        <div class="form-row">
          <div class="field">
            <label>Kund *</label>
            <select name="customer_id" required>
              <option value="">Välj kund…</option>
              ${customers.map(c => `<option value="${c.id}" ${(vehicle?.customer_id == c.id || defaultCustomerId == c.id) ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Reg.nr *</label><input type="text" name="license_plate" value="${vehicle?.license_plate || ''}" required style="text-transform:uppercase" placeholder="ABC 123"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Chassinummer (VIN)</label><input type="text" name="vin" value="${vehicle?.vin || ''}"></div>
          <div class="field"><label>Årsmodell</label><input type="number" name="year" value="${vehicle?.year || ''}" min="1900" max="2099"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Märke</label><input type="text" name="make" value="${vehicle?.make || ''}" placeholder="t.ex. Scania"></div>
          <div class="field"><label>Modell</label><input type="text" name="model" value="${vehicle?.model || ''}" placeholder="t.ex. R500"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Motor</label><input type="text" name="engine" value="${vehicle?.engine || ''}"></div>
          <div class="field"><label>Växellåda</label><input type="text" name="gearbox" value="${vehicle?.gearbox || ''}"></div>
        </div>
        <div class="field"><label>Mätarställning (mil)</label><input type="number" name="odometer" value="${vehicle?.odometer || ''}"></div>
        <div class="field"><label>Anteckningar</label><textarea name="notes">${vehicle?.notes || ''}</textarea></div>
        <div class="modal-footer" style="padding:0;border:none;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
          <button type="submit" class="btn btn-primary">${vehicle ? 'Spara' : 'Skapa fordon'}</button>
        </div>
      </form>
    `,
  });

  document.getElementById('vehicle-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    ['year', 'odometer', 'customer_id'].forEach(k => { if (body[k]) body[k] = Number(body[k]); else body[k] = null; });
    Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
    try {
      if (vehicle) {
        await api.put(`/vehicles/${vehicle.id}`, body);
        showToast('Fordon uppdaterat', 'success');
      } else {
        await api.post('/vehicles', body);
        showToast('Fordon skapat', 'success');
      }
      closeModal();
      onSaved?.();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
