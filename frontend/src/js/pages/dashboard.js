import { api } from '../api.js';
import { statusBadge, fmtDate } from '../app.js';

export async function renderDashboard(el) {
  el.innerHTML = '<div class="loading">Laddar dashboard…</div>';
  const data = await api.get('/dashboard');

  const statusLabels = { ny: 'Ny', planerad: 'Planerad', pagaende: 'Pågående', klar: 'Klar', fakturerad: 'Fakturerad' };

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Översikt över verkstadens arbetsflöde</div>
      </div>
      <a href="#/work-orders/new" class="btn btn-primary">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Ny arbetsorder
      </a>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Öppna ordrar</div>
        <div class="stat-value" style="color:var(--primary)">${data.total_open}</div>
        <div class="stat-sub">Ny + Planerad + Pågående</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pågående</div>
        <div class="stat-value" style="color:var(--warning)">${data.by_status.pagaende || 0}</div>
        <div class="stat-sub">Just nu i arbete</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Schemalagda idag</div>
        <div class="stat-value" style="color:var(--purple)">${data.scheduled_today}</div>
        <div class="stat-sub">Planerade idag</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Aktiva tidmätningar</div>
        <div class="stat-value" style="color:var(--success)">${data.active_timers}</div>
        <div class="stat-sub">Mekaniker i arbete</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Senaste arbetsorder</span>
          <a href="#/work-orders" class="btn btn-ghost btn-sm">Visa alla</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Order</th><th>Kund</th><th>Fordon</th><th>Status</th><th>Skapad</th>
            </tr></thead>
            <tbody>
              ${data.recent_orders.length ? data.recent_orders.map(o => `
                <tr class="clickable" onclick="location.hash='#/work-orders/${o.id}'">
                  <td><strong>${o.order_number}</strong></td>
                  <td>${o.customer?.name || '–'}</td>
                  <td>${o.vehicle?.license_plate || '–'}</td>
                  <td>${statusBadge(o.status)}</td>
                  <td class="text-muted">${fmtDate(o.created_at)}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:28px">Inga arbetsorder ännu</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Status-fördelning</span></div>
        <div class="card-body">
          ${Object.entries(data.by_status).map(([s, count]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>${statusBadge(s)}</div>
              <strong>${count}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
