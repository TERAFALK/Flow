import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderScanner(el) {
  const orders = await api.get('/work-orders?status=pagaende').catch(() => []);
  const activeOrders = orders.filter(o => ['ny', 'planerad', 'pagaende'].includes(o.status));

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Scanner</div>
        <div class="page-subtitle">Skanna streckkoder direkt till arbetsorder</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Välj arbetsorder</span></div>
          <div class="card-body">
            <div class="field">
              <label>Arbetsorder</label>
              <select id="scanner-order" style="font-size:14px">
                <option value="">– Välj order –</option>
                ${activeOrders.map(o => `<option value="${o.id}">${o.order_number} – ${o.customer?.name || ''} ${o.vehicle?.license_plate || ''}</option>`).join('')}
              </select>
            </div>
            <div id="selected-order-info"></div>
          </div>
        </div>
        <div class="card" id="scan-lines-card" style="display:none">
          <div class="card-header"><span class="card-title">Skannade artiklar</span></div>
          <div id="scan-lines-body" class="card-body" style="padding:0">
            <div class="empty-state" style="padding:24px"><p>Inga artiklar ännu</p></div>
          </div>
        </div>
      </div>
      <div>
        <div class="scanner-zone" id="scanner-zone">
          <div style="font-size:36px;margin-bottom:12px">📷</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--text-2)">
            Välj en arbetsorder och skanna
          </div>
          <p style="color:var(--text-3);font-size:13px">Rikta streckkodsläsaren mot fältet nedan</p>
          <input type="text" id="scanner-input" class="scanner-input mt-3"
            placeholder="Streckkod…" disabled autocomplete="off"
            style="margin-top:16px">
          <div id="scanner-result"></div>
        </div>
        <div id="stock-warning-box" class="alert alert-warning hidden" style="margin-top:12px"></div>
      </div>
    </div>
  `;

  const orderSel = document.getElementById('scanner-order');
  const input = document.getElementById('scanner-input');
  const resultEl = document.getElementById('scanner-result');
  const zone = document.getElementById('scanner-zone');
  const linesCard = document.getElementById('scan-lines-card');
  const linesBody = document.getElementById('scan-lines-body');
  const warningBox = document.getElementById('stock-warning-box');

  orderSel.addEventListener('change', async () => {
    const id = orderSel.value;
    if (!id) {
      input.disabled = true;
      input.value = '';
      linesCard.style.display = 'none';
      zone.classList.remove('active');
      document.getElementById('selected-order-info').innerHTML = '';
      return;
    }
    const order = activeOrders.find(o => o.id == id);
    document.getElementById('selected-order-info').innerHTML = `
      <div class="alert alert-info" style="margin-top:12px;margin-bottom:0">
        <strong>${order.order_number}</strong><br>
        ${order.customer?.name || ''} · ${order.vehicle?.license_plate || ''}<br>
        <span class="text-small">${order.description}</span>
      </div>
    `;
    input.disabled = false;
    input.focus();
    zone.classList.add('active');
    linesCard.style.display = '';
    await refreshLines(id);
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const barcode = input.value.trim();
    if (!barcode) return;
    const orderId = orderSel.value;
    input.value = '';

    try {
      const result = await api.post(`/work-orders/${orderId}/scan`, { barcode });
      resultEl.innerHTML = `
        <div class="scanner-result found">
          <strong>${result.article.name}</strong> – Antal på order: <strong>${result.line.quantity} ${result.line.unit}</strong>
        </div>
      `;
      if (result.stock_warning) {
        warningBox.innerHTML = `⚠️ Lågt lagersaldo på <strong>${result.article.name}</strong>: ${result.stock_quantity} ${result.article.unit} kvar`;
        warningBox.classList.remove('hidden');
      } else {
        warningBox.classList.add('hidden');
      }
      showToast(`${result.article.name} – ${result.line.quantity} ${result.line.unit}`, 'success', 2000);
      await refreshLines(orderId);
    } catch (err) {
      resultEl.innerHTML = `<div class="scanner-result not-found">❌ ${err.message}</div>`;
      showToast(err.message, 'error', 3000);
    }
    setTimeout(() => input.focus(), 100);
  });

  async function refreshLines(orderId) {
    const lines = await api.get(`/work-orders/${orderId}/lines`);
    if (!lines.length) {
      linesBody.innerHTML = '<div class="empty-state" style="padding:24px"><p>Inga artiklar ännu</p></div>';
      return;
    }
    linesBody.innerHTML = `
      <table style="width:100%">
        <thead><tr><th>Artikel</th><th class="text-right">Antal</th><th class="text-right">Pris</th></tr></thead>
        <tbody>
          ${lines.map(l => `
            <tr>
              <td><strong>${l.description}</strong>
                ${l.article?.article_number ? `<br><small class="font-mono text-muted">${l.article.article_number}</small>` : ''}
              </td>
              <td class="text-right quantity-cell">${l.quantity} ${l.unit}</td>
              <td class="text-right">${parseFloat(l.unit_price).toLocaleString('sv-SE')} kr</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2">Summa delar</td>
            <td class="text-right">${lines.reduce((s, l) => s + parseFloat(l.quantity) * parseFloat(l.unit_price), 0).toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
          </tr>
        </tfoot>
      </table>
    `;
  }
}
