import { api } from '../api.js';
import { statusBadge, fmtDate, fmtDuration } from '../app.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUS_FLOW = {
  ny:          { next: 'planerad',  label: 'Markera Planerad' },
  planerad:    { next: 'pagaende',  label: 'Starta arbete' },
  pagaende:    { next: 'klar',      label: 'Markera Klar' },
  klar:        { next: 'fakturerad',label: 'Markera Fakturerad' },
  fakturerad:  { next: null,        label: null },
};

export async function renderWorkOrders(el, params = {}) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Arbetsorder</div>
        <div class="page-subtitle">Alla arbetsordrar</div>
      </div>
      <a href="#/work-orders/new" class="btn btn-primary">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Ny arbetsorder
      </a>
    </div>
    <div class="card">
      <div class="card-header" style="gap:12px;flex-wrap:wrap">
        <div class="search-wrap">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input type="search" id="wo-search" placeholder="Sök order, kund, beskrivning…">
        </div>
        <select id="wo-status-filter" style="width:auto;min-width:140px">
          <option value="">Alla statusar</option>
          <option value="ny">Ny</option>
          <option value="planerad">Planerad</option>
          <option value="pagaende">Pågående</option>
          <option value="klar">Klar</option>
          <option value="fakturerad">Fakturerad</option>
        </select>
      </div>
      <div id="wo-list"><div class="loading">Laddar…</div></div>
    </div>
  `;

  let timer;
  document.getElementById('wo-search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
  document.getElementById('wo-status-filter').addEventListener('change', reload);

  async function reload() {
    const list = document.getElementById('wo-list');
    if (!list) return;
    const q = document.getElementById('wo-search')?.value || '';
    const status = document.getElementById('wo-status-filter')?.value || '';
    let url = `/work-orders?`;
    if (q) url += `q=${encodeURIComponent(q)}&`;
    if (status) url += `status=${status}&`;
    const orders = await api.get(url);
    if (!orders.length) {
      list.innerHTML = `<div class="empty-state"><p>Inga arbetsorder hittades</p></div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Order</th><th>Kund</th><th>Fordon</th>
            <th>Beskrivning</th><th>Tilldelad</th>
            <th>Schemalagd</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr class="clickable" onclick="location.hash='#/work-orders/${o.id}'">
                <td><strong>${o.order_number}</strong></td>
                <td>${o.customer?.name || '–'}</td>
                <td>${o.vehicle?.license_plate ? `<span class="font-mono">${o.vehicle.license_plate}</span>` : '–'}</td>
                <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.description}</td>
                <td>${o.assigned_to_user?.full_name || '–'}</td>
                <td class="text-muted">${o.scheduled_date ? fmtDate(o.scheduled_date) : '–'}</td>
                <td>${statusBadge(o.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  await reload();
}

export async function renderNewWorkOrder(el, params = {}) {
  const [customers, vehicles, users] = await Promise.all([
    api.get('/customers'),
    api.get('/vehicles'),
    api.get('/users'),
  ]);

  const preCustomer = params.customer ? parseInt(params.customer) : '';
  const preVehicle = params.vehicle ? parseInt(params.vehicle) : '';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/work-orders" class="btn btn-ghost btn-sm" style="margin-bottom:8px">← Tillbaka</a>
        <div class="page-title">Ny arbetsorder</div>
      </div>
    </div>
    <div class="card" style="max-width:700px">
      <div class="card-body">
        <form id="wo-form">
          <div class="form-row">
            <div class="field">
              <label>Kund *</label>
              <select id="wo-customer" name="customer_id" required>
                <option value="">Välj kund…</option>
                ${customers.map(c => `<option value="${c.id}" ${c.id == preCustomer ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Fordon</label>
              <select id="wo-vehicle" name="vehicle_id">
                <option value="">Välj fordon (valfritt)…</option>
                ${vehicles.map(v => `<option value="${v.id}" data-customer="${v.customer_id}" ${v.id == preVehicle ? 'selected' : ''}>${v.license_plate} – ${v.make || ''} ${v.model || ''} (${v.customer?.name || ''})</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field"><label>Beskrivning / Felbeskrivning *</label><textarea name="description" rows="3" required placeholder="Beskriv felet eller arbetet som ska utföras…"></textarea></div>
          <div class="form-row">
            <div class="field">
              <label>Tilldelad mekaniker</label>
              <select name="assigned_to">
                <option value="">Ej tilldelad</option>
                ${users.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Schemalagd</label>
              <input type="datetime-local" name="scheduled_date">
            </div>
          </div>
          <div class="field"><label>Interna anteckningar</label><textarea name="internal_notes" rows="2" placeholder="Interna kommentarer…"></textarea></div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <a href="#/work-orders" class="btn btn-secondary">Avbryt</a>
            <button type="submit" class="btn btn-primary">Skapa arbetsorder</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Filter vehicles by selected customer
  const custSel = document.getElementById('wo-customer');
  const vehSel = document.getElementById('wo-vehicle');
  custSel.addEventListener('change', () => {
    const cid = custSel.value;
    Array.from(vehSel.options).forEach(opt => {
      if (!opt.value) return;
      opt.style.display = (!cid || opt.dataset.customer == cid) ? '' : 'none';
    });
    if (vehSel.selectedOptions[0]?.dataset.customer != cid) vehSel.value = '';
  });
  if (preCustomer) custSel.dispatchEvent(new Event('change'));

  document.getElementById('wo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.customer_id = Number(body.customer_id);
    body.vehicle_id = body.vehicle_id ? Number(body.vehicle_id) : null;
    body.assigned_to = body.assigned_to ? Number(body.assigned_to) : null;
    if (!body.scheduled_date) body.scheduled_date = null;
    if (!body.internal_notes) body.internal_notes = null;
    try {
      const wo = await api.post('/work-orders', body);
      showToast(`${wo.order_number} skapad`, 'success');
      location.hash = `#/work-orders/${wo.id}`;
    } catch (err) { showToast(err.message, 'error'); }
  });
}

export async function renderWorkOrderDetail(el, id) {
  el.innerHTML = '<div class="loading">Laddar…</div>';
  await loadDetail(el, id);
}

async function loadDetail(el, id) {
  const [wo, users, articles] = await Promise.all([
    api.get(`/work-orders/${id}`),
    api.get('/users'),
    api.get('/articles'),
  ]);

  const flow = STATUS_FLOW[wo.status];
  const totalParts = wo.lines.reduce((s, l) => s + parseFloat(l.quantity) * parseFloat(l.unit_price), 0);
  const totalMins = wo.time_entries.filter(e => e.end_time).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  el.innerHTML = `
    <div class="page-header">
      <a href="#/work-orders" class="btn btn-ghost btn-sm">← Tillbaka</a>
    </div>

    <div class="order-header-bar">
      <div>
        <div class="order-number">${wo.order_number}</div>
        <div class="order-desc">${wo.description}</div>
        <div style="margin-top:8px">${statusBadge(wo.status)}</div>
      </div>
      <div class="order-actions">
        ${flow?.next ? `
          <button class="btn btn-primary" onclick="window._advanceStatus('${wo.id}','${flow.next}')">
            ${flow.label}
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="window._editWO(${wo.id})">Redigera</button>
        <a href="#/scanner?order=${wo.id}" class="btn btn-secondary">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H4v2a1 1 0 01-2 0V5a1 1 0 011-1zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-2 0V4h-2a1 1 0 01-1-1zM3 16a1 1 0 011 1h2v-2a1 1 0 112 0v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1zm13 0a1 1 0 00-1 1v2h-2a1 1 0 100 2h3a1 1 0 001-1v-3a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          Scanner
        </a>
        <button class="btn btn-ghost" onclick="window._showInvoice(${wo.id})">Fakturaunderlag</button>
      </div>
    </div>

    <div class="order-meta">
      <div>
        <div class="meta-group">
          <h3>Kund</h3>
          <div class="meta-row"><span class="meta-label">Kund:</span>
            <strong><a href="#/customers/${wo.customer_id}">${wo.customer?.name || '–'}</a></strong>
          </div>
          <div class="meta-row"><span class="meta-label">Telefon:</span>${wo.customer?.phone || '–'}</div>
          <div class="meta-row"><span class="meta-label">E-post:</span>${wo.customer?.email || '–'}</div>
        </div>
      </div>
      <div>
        <div class="meta-group">
          <h3>Fordon & Planering</h3>
          ${wo.vehicle ? `
            <div class="meta-row"><span class="meta-label">Reg.nr:</span>
              <strong><a href="#/vehicles/${wo.vehicle_id}">${wo.vehicle.license_plate}</a></strong>
            </div>
            <div class="meta-row"><span class="meta-label">Fordon:</span>${wo.vehicle.make || ''} ${wo.vehicle.model || ''} ${wo.vehicle.year ? '(' + wo.vehicle.year + ')' : ''}</div>
          ` : '<div class="meta-row text-muted">Inget fordon kopplat</div>'}
          <div class="meta-row"><span class="meta-label">Tilldelad:</span>${wo.assigned_to_user?.full_name || '–'}</div>
          <div class="meta-row"><span class="meta-label">Schemalagd:</span>${wo.scheduled_date ? fmtDate(wo.scheduled_date) : '–'}</div>
          <div class="meta-row"><span class="meta-label">Skapad:</span>${fmtDate(wo.created_at)}</div>
        </div>
      </div>
    </div>

    ${wo.internal_notes ? `
      <div class="alert alert-info" style="margin-bottom:20px">
        <strong>Interna anteckningar:</strong> ${wo.internal_notes}
      </div>
    ` : ''}

    <div class="tabs">
      <div class="tab active" data-tab="parts">Reservdelar (${wo.lines.length})</div>
      <div class="tab" data-tab="time">Tid (${fmtDuration(totalMins)})</div>
    </div>

    <div id="tab-parts">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-secondary" id="add-line-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Lägg till artikel
        </button>
        <a href="#/scanner?order=${wo.id}" class="btn btn-ghost">Öppna scanner</a>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Artikel</th><th>Art.nr</th><th class="text-right">Antal</th>
              <th>Enhet</th><th class="text-right">À-pris</th><th class="text-right">Totalt</th><th></th>
            </tr></thead>
            <tbody id="lines-tbody">
              ${wo.lines.map(l => lineRow(l)).join('') || '<tr><td colspan="7" class="text-muted" style="text-align:center;padding:24px">Inga reservdelar</td></tr>'}
            </tbody>
            ${wo.lines.length ? `
              <tfoot>
                <tr class="total-row">
                  <td colspan="5">Summa reservdelar</td>
                  <td class="text-right">${fmtPrice(totalParts)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>
    </div>

    <div id="tab-time" class="hidden">
      <div id="timer-section" style="margin-bottom:16px"></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Mekaniker</th><th>Typ</th><th>Start</th><th>Stopp</th><th class="text-right">Tid</th><th></th></tr></thead>
            <tbody>
              ${wo.time_entries.map(e => `
                <tr>
                  <td>${e.user?.full_name || '–'}</td>
                  <td>${e.entry_type}</td>
                  <td>${fmtDate(e.start_time, true)}</td>
                  <td>${e.end_time ? fmtDate(e.end_time, true) : '<span class="badge badge-pagaende">Pågår</span>'}</td>
                  <td class="text-right quantity-cell">${e.duration_minutes != null ? fmtDuration(e.duration_minutes) : '–'}</td>
                  <td>
                    ${!e.end_time ? `<button class="btn btn-sm btn-danger" onclick="window._stopTimer(${e.id}, ${id})">Stopp</button>` : ''}
                    <button class="btn-icon" onclick="window._deleteTE(${e.id}, ${id})">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:24px">Inga tidposter</td></tr>'}
            </tbody>
            ${wo.time_entries.filter(e=>e.end_time).length ? `
              <tfoot>
                <tr class="total-row">
                  <td colspan="4">Total tid</td>
                  <td class="text-right">${fmtDuration(totalMins)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>
    </div>
  `;

  // Tabs
  el.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      el.querySelectorAll('[id^="tab-"]').forEach(x => x.classList.add('hidden'));
      document.getElementById(`tab-${t.dataset.tab}`).classList.remove('hidden');
    });
  });

  // Timer section
  loadTimerSection(id);

  // Add line
  document.getElementById('add-line-btn').addEventListener('click', () => openAddLineForm(wo.id, articles, () => loadDetail(el, id)));

  // Handlers
  window._advanceStatus = async (orderId, nextStatus) => {
    await api.put(`/work-orders/${orderId}`, { status: nextStatus });
    showToast('Status uppdaterad', 'success');
    loadDetail(el, id);
  };
  window._editWO = (orderId) => openEditWOForm(orderId, users, () => loadDetail(el, id));
  window._deleteLine = async (lineId) => {
    if (await confirmDialog('Ta bort denna rad?')) {
      await api.delete(`/work-orders/${id}/lines/${lineId}`);
      loadDetail(el, id);
    }
  };
  window._stopTimer = async (entryId, orderId) => {
    await api.post(`/time-entries/${entryId}/stop`, {});
    showToast('Tidmätning stoppad', 'success');
    loadDetail(el, orderId);
  };
  window._deleteTE = async (entryId, orderId) => {
    if (await confirmDialog('Ta bort tidpost?')) {
      await api.delete(`/time-entries/${entryId}`);
      loadDetail(el, orderId);
    }
  };
  window._showInvoice = async (orderId) => {
    const inv = await api.get(`/work-orders/${orderId}/invoice`);
    openModal({
      title: `Fakturaunderlag – ${inv.order_number}`,
      size: 'modal-lg',
      body: `
        <p><strong>Kund:</strong> ${inv.customer?.name || '–'}</p>
        <p style="margin-top:4px"><strong>Fordon:</strong> ${inv.vehicle ? `${inv.vehicle.license_plate} ${inv.vehicle.make || ''} ${inv.vehicle.model || ''}` : '–'}</p>
        <p style="margin-top:4px"><strong>Ärende:</strong> ${inv.description}</p>
        <hr class="divider">
        <h3 style="margin-bottom:12px">Reservdelar</h3>
        <table style="width:100%;margin-bottom:16px">
          <thead><tr><th>Artikel</th><th class="text-right">Antal</th><th class="text-right">À-pris</th><th class="text-right">Totalt</th></tr></thead>
          <tbody>
            ${inv.lines.map(l => `<tr><td>${l.description}</td><td class="text-right">${l.quantity} ${l.unit}</td><td class="text-right">${l.unit_price.toLocaleString('sv-SE')} kr</td><td class="text-right">${l.total.toLocaleString('sv-SE', {minimumFractionDigits:2})} kr</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">Inga delar</td></tr>'}
          </tbody>
          <tfoot><tr class="total-row"><td colspan="3">Summa delar</td><td class="text-right">${inv.parts_total.toLocaleString('sv-SE', {minimumFractionDigits:2})} kr</td></tr></tfoot>
        </table>
        <h3 style="margin-bottom:12px">Arbetstid</h3>
        <table style="width:100%">
          <thead><tr><th>Mekaniker</th><th>Typ</th><th class="text-right">Tid</th></tr></thead>
          <tbody>
            ${inv.time_entries.map(e => `<tr><td>${e.user}</td><td>${e.type}</td><td class="text-right">${fmtDuration(e.minutes || 0)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">Ingen tid</td></tr>'}
          </tbody>
          <tfoot><tr class="total-row"><td colspan="2">Total tid</td><td class="text-right">${fmtDuration(inv.labor_minutes)}</td></tr></tfoot>
        </table>
      `,
    });
  };
}

async function loadTimerSection(orderId) {
  const section = document.getElementById('timer-section');
  if (!section) return;
  const active = await api.get('/time-entries/active').catch(() => null);
  if (active && active.work_order_id == orderId) {
    const start = new Date(active.start_time + 'Z');
    section.innerHTML = `
      <div class="timer-card">
        <div class="timer-label">Aktiv tidmätning</div>
        <div class="timer-display" id="detail-clock">00:00:00</div>
        <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:4px;margin-bottom:16px">Startad ${fmtDate(active.start_time, true)}</div>
        <button class="btn btn-danger" onclick="window._stopTimer(${active.id}, ${orderId})">Stoppa</button>
      </div>
    `;
    const tick = () => {
      const e = document.getElementById('detail-clock');
      if (!e) { clearInterval(iv); return; }
      const diff = Math.floor((Date.now() - start.getTime()) / 1000);
      e.textContent = [Math.floor(diff/3600), Math.floor((diff%3600)/60), diff%60].map(n=>String(n).padStart(2,'0')).join(':');
    };
    tick();
    const iv = setInterval(tick, 1000);
  } else if (!active) {
    section.innerHTML = `
      <div class="card">
        <div class="card-body">
          <form id="start-timer-inline" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
            <div class="field" style="margin:0;min-width:160px">
              <label>Typ av arbete</label>
              <select name="entry_type">
                <option value="övrigt">Övrigt</option>
                <option value="felsökning">Felsökning</option>
                <option value="reparation">Reparation</option>
                <option value="provkörning">Provkörning</option>
              </select>
            </div>
            <button type="submit" class="btn btn-success" style="margin-bottom:16px">
              ▶ Starta tidmätning
            </button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('start-timer-inline').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { entry_type } = Object.fromEntries(new FormData(e.target));
      try {
        await api.post('/time-entries/start', { work_order_id: orderId, entry_type });
        showToast('Tidmätning startad', 'success');
        loadTimerSection(orderId);
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
}

function lineRow(l) {
  const total = parseFloat(l.quantity) * parseFloat(l.unit_price);
  return `<tr>
    <td>${l.description}</td>
    <td class="font-mono text-muted">${l.article?.article_number || '–'}</td>
    <td class="text-right quantity-cell">${l.quantity}</td>
    <td>${l.unit}</td>
    <td class="text-right">${fmtPrice(l.unit_price)}</td>
    <td class="text-right">${fmtPrice(total)}</td>
    <td>
      <button class="btn-icon" onclick="window._deleteLine(${l.id})">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </button>
    </td>
  </tr>`;
}

function openAddLineForm(orderId, articles, onSaved) {
  openModal({
    title: 'Lägg till artikel',
    body: `
      <form id="add-line-form">
        <div class="field">
          <label>Välj artikel från lager</label>
          <select id="line-article-select">
            <option value="">– Välj artikel eller lägg till manuellt –</option>
            ${articles.map(a => `<option value="${a.id}" data-name="${a.name}" data-price="${a.price}" data-unit="${a.unit}">${a.name} (${a.article_number || a.barcode || '–'})</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Beskrivning *</label><input type="text" name="description" required id="line-desc"></div>
        <div class="form-row">
          <div class="field"><label>Antal</label><input type="number" name="quantity" value="1" step="0.01" min="0.01" required></div>
          <div class="field"><label>Enhet</label><input type="text" name="unit" value="st"></div>
        </div>
        <div class="field"><label>À-pris (kr)</label><input type="number" name="unit_price" value="0" step="0.01" min="0" id="line-price"></div>
        <div class="modal-footer" style="padding:0;border:none;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
          <button type="submit" class="btn btn-primary">Lägg till</button>
        </div>
      </form>
    `,
  });
  document.getElementById('line-article-select').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt.value) {
      document.getElementById('line-desc').value = opt.dataset.name;
      document.getElementById('line-price').value = opt.dataset.price;
      document.querySelector('[name="unit"]').value = opt.dataset.unit || 'st';
    }
  });
  document.getElementById('add-line-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const artSel = document.getElementById('line-article-select');
    body.article_id = artSel.value ? Number(artSel.value) : null;
    body.quantity = parseFloat(body.quantity);
    body.unit_price = parseFloat(body.unit_price);
    try {
      await api.post(`/work-orders/${orderId}/lines`, body);
      showToast('Rad tillagd', 'success');
      closeModal();
      onSaved?.();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function openEditWOForm(orderId, users, onSaved) {
  api.get(`/work-orders/${orderId}`).then(wo => {
    openModal({
      title: 'Redigera arbetsorder',
      size: 'modal-lg',
      body: `
        <form id="edit-wo-form">
          <div class="field"><label>Beskrivning *</label><textarea name="description" required>${wo.description}</textarea></div>
          <div class="form-row">
            <div class="field">
              <label>Tilldelad</label>
              <select name="assigned_to">
                <option value="">Ej tilldelad</option>
                ${users.map(u => `<option value="${u.id}" ${wo.assigned_to == u.id ? 'selected' : ''}>${u.full_name}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Schemalagd</label>
              <input type="datetime-local" name="scheduled_date" value="${wo.scheduled_date ? wo.scheduled_date.slice(0,16) : ''}">
            </div>
          </div>
          <div class="field"><label>Interna anteckningar</label><textarea name="internal_notes">${wo.internal_notes || ''}</textarea></div>
          <div class="modal-footer" style="padding:0;border:none;margin-top:8px">
            <button type="button" class="btn btn-ghost btn-danger" onclick="window._confirmDeleteWO(${orderId})">Ta bort order</button>
            <div style="flex:1"></div>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
            <button type="submit" class="btn btn-primary">Spara</button>
          </div>
        </form>
      `,
    });
    document.getElementById('edit-wo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      body.assigned_to = body.assigned_to ? Number(body.assigned_to) : null;
      if (!body.scheduled_date) body.scheduled_date = null;
      if (!body.internal_notes) body.internal_notes = null;
      try {
        await api.put(`/work-orders/${orderId}`, body);
        showToast('Arbetsorder uppdaterad', 'success');
        closeModal();
        onSaved?.();
      } catch (err) { showToast(err.message, 'error'); }
    });
    window._confirmDeleteWO = async (oid) => {
      if (await confirmDialog('Ta bort denna arbetsorder permanent?')) {
        await api.delete(`/work-orders/${oid}`);
        showToast('Arbetsorder borttagen', 'success');
        closeModal();
        location.hash = '#/work-orders';
      }
    };
  });
}

function fmtPrice(p) {
  return parseFloat(p).toLocaleString('sv-SE', { minimumFractionDigits: 2 }) + ' kr';
}
