const overlay = () => document.getElementById('modal-overlay');
const box = () => document.getElementById('modal-box');

export function openModal({ title, body, size = '', onClose } = {}) {
  const b = box();
  b.className = `modal-box ${size}`;
  b.innerHTML = `
    <div class="modal-header">
      <h2>${title || ''}</h2>
      <button class="modal-close" id="modal-close-btn">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
    </div>
    <div class="modal-body">${typeof body === 'string' ? body : ''}</div>
  `;
  if (typeof body !== 'string' && body instanceof HTMLElement) {
    b.querySelector('.modal-body').appendChild(body);
  }
  overlay().classList.remove('hidden');

  const close = () => closeModal();
  document.getElementById('modal-close-btn').addEventListener('click', close);
  overlay().addEventListener('click', (e) => { if (e.target === overlay()) close(); }, { once: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });

  if (onClose) overlay()._onClose = onClose;
}

export function closeModal() {
  const o = overlay();
  const cb = o._onClose;
  o.classList.add('hidden');
  box().innerHTML = '';
  o._onClose = null;
  if (cb) cb();
}

export function modalBody() {
  return box().querySelector('.modal-body');
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    openModal({
      title: 'Bekräfta',
      body: `
        <p style="margin-bottom:20px">${message}</p>
        <div class="modal-footer" style="padding:0;border:none">
          <button class="btn btn-secondary" id="confirm-no">Avbryt</button>
          <button class="btn btn-danger" id="confirm-yes">Ta bort</button>
        </div>
      `,
      onClose: () => resolve(false),
    });
    document.getElementById('confirm-yes').addEventListener('click', () => { closeModal(); resolve(true); });
    document.getElementById('confirm-no').addEventListener('click', () => { closeModal(); resolve(false); });
  });
}
