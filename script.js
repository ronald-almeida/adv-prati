const form = document.getElementById('checkoutForm');
const generateBtn = document.getElementById('generatePix');
const copyBtn = document.querySelector('.secondary-button');
let pixCode = '';

const digits = (value = '') => String(value).replace(/\D/g, '');

function feedback(message, error = false) {
  let el = document.getElementById('pixFeedback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pixFeedback';
    el.className = 'feedback';
    generateBtn.parentElement.appendChild(el);
  }
  el.textContent = message;
  el.style.color = error ? '#b42318' : '#333';
}

function getCustomer() {
  const email = document.getElementById('email').value.trim();
  const emailConfirm = document.getElementById('emailConfirm').value.trim();
  const name = document.getElementById('name').value.trim();
  const taxId = digits(document.getElementById('taxId').value);
  const phone = digits(document.getElementById('phone').value);

  if (!email || !emailConfirm || !name || !taxId || !phone) throw new Error('Preencha todos os dados pessoais.');
  if (email.toLowerCase() !== emailConfirm.toLowerCase()) throw new Error('Os emails informados não coincidem.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Digite um email válido.');
  if (taxId.length !== 11 && taxId.length !== 14) throw new Error('Digite um CPF ou CNPJ válido.');
  if (phone.length < 10 || phone.length > 11) throw new Error('Digite um celular válido.');

  return { email, name, taxId, phone };
}

function ensureModal() {
  let modal = document.getElementById('pixModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'pixModal';
  modal.className = 'pix-modal';
  modal.innerHTML = `<div class="pix-modal-backdrop" data-close-pix></div><div class="pix-modal-card" role="dialog" aria-modal="true"><button class="pix-modal-close" type="button" data-close-pix>×</button><h3>Pagamento via Pix</h3><p class="pix-modal-subtitle">Escaneie o QR Code ou copie o código Pix.</p><div id="pixModalQr" class="pix-modal-qr"></div><div class="pix-code-label">Código Pix copia e cola</div><textarea id="pixCodeField" class="pix-code-field" readonly></textarea><button id="pixModalCopy" class="pix-modal-copy" type="button">Copiar código Pix</button><div id="pixModalFeedback" class="pix-modal-feedback"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-pix]').forEach(el => el.addEventListener('click', closeModal));
  modal.querySelector('#pixModalCopy').addEventListener('click', () => copyPix(modal.querySelector('#pixModalFeedback')));
  return modal;
}

function openModal() {
  const modal = ensureModal();
  modal.classList.add('open');
  document.body.classList.add('pix-modal-open');
}

function closeModal() {
  const modal = document.getElementById('pixModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('pix-modal-open');
}

async function generatePix() {
  const old = generateBtn.innerHTML;
  try {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Gerando código...';
    feedback('');
    const customer = getCustomer();
    const response = await fetch('/api/create-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o Pix.');
    pixCode = data.copypaste || '';
    if (!pixCode || !data.qrCode) throw new Error('O Pix foi criado, mas os dados de pagamento não foram retornados corretamente.');
    const modal = ensureModal();
    modal.querySelector('#pixCodeField').value = pixCode;
    modal.querySelector('#pixModalQr').innerHTML = `<img src="${data.qrCode}" alt="QR Code Pix">`;
    openModal();
    copyBtn.disabled = false;
    feedback('Código Pix gerado com sucesso.');
  } catch (error) {
    feedback(error.message || 'Erro ao gerar o Pix.', true);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = old;
  }
}

async function copyPix(target) {
  if (!pixCode) {
    feedback('Gere o código Pix primeiro.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(pixCode);
    if (target) target.textContent = 'Código Pix copiado.';
    else feedback('Código Pix copiado.');
  } catch {
    const area = document.createElement('textarea');
    area.value = pixCode;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    if (target) target.textContent = 'Código Pix copiado.';
    else feedback('Código Pix copiado.');
  }
}

generateBtn.addEventListener('click', generatePix);
copyBtn.disabled = true;
copyBtn.addEventListener('click', () => copyPix());
form.addEventListener('submit', event => event.preventDefault());
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
