// Manejo del carrito con persistencia y modal
(function(){
  const CART_KEY = 'menu_cart_v1';
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  const cartEl = document.getElementById('cart');
  const modalOverlay = document.getElementById('cart-modal');
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const closeModalBtn = document.getElementById('close-modal');
  const clearBtn = document.getElementById('clear-cart');
  const checkoutBtn = document.getElementById('checkout');
  const sendWhatsBtn = document.getElementById('send-whatsapp');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const searchInput = document.getElementById('search-input');
  const deliveryInput = document.getElementById('delivery-address');
  const geolocationBtn = document.getElementById('geolocation-btn');
  const storeStatus = document.getElementById('store-status');
  const statusText = document.getElementById('status-text');

  const THEME_KEY = 'menu_theme_v1';
  const WHATS_NUMBER = '+51964306693'; // Número con código internacional +51
  const CURRENCY = 'S/';
  let paymentCompleted = false;
  let currentPaymentMethod = null;
  const STORE_OPENING = 9; // 9 AM
  const STORE_CLOSING = 23; // 11 PM

  function save(){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function updateCartBubble(){
    const count = cartEl.querySelector('.cart-count');
    if(count) count.textContent = cart.length;
    else cartEl.textContent = cart.length;
    // Enable/disable actions based on cart and location
    if(sendWhatsBtn){
      // Only allow sending after payment completed
      sendWhatsBtn.disabled = (cart.length === 0) || (!paymentCompleted);
    }
    if(checkoutBtn){
      checkoutBtn.disabled = (cart.length === 0);
    }
  }

  function showToast(text){
    const container = document.getElementById('toast-container') || document.body;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    container.appendChild(t);
    // Remove after 3s with fade-out
    setTimeout(()=>{ t.classList.add('hide'); }, 2700);
    setTimeout(()=>{ t.remove(); }, 3000);
  }

  function addItem(name, price){
    cart.push({name, price});
    save();
    updateCartBubble();
    // Trigger jump animation
    cartEl.classList.add('bounce');
    setTimeout(()=>cartEl.classList.remove('bounce'), 700);
    showToast(`✅ ${name} añadido al carrito`);
  }

  function groupItems(){
    const map = {};
    cart.forEach(it=>{
      if(!map[it.name]) map[it.name] = {name: it.name, price: it.price, qty:0, subtotal:0};
      map[it.name].qty += 1;
      map[it.name].subtotal += Number(it.price);
    });
    return Object.values(map);
  }

  function generateWhatsText(paymentMethod){
    const grouped = groupItems();
    if(grouped.length === 0) return '';
    // Productos listados como: Nombre xCantidad
    const productos = grouped.map(it => `${it.name} x${it.qty}`).join(' - ');
    const total = grouped.reduce((s,it) => s + it.subtotal, 0);
    let text = `Hola ByteFood! 🍔 Vengo de la web y quiero realizar el siguiente pedido: ${productos} - Total: ${CURRENCY}${total.toFixed(2)}.`;
    const delivery = deliveryInput.value.trim();
    if(delivery){
      text += ` Dirección: ${delivery}.`;
    }
    // Instrucciones especiales
    const instructionsEl = document.getElementById('special-instructions');
    if(instructionsEl){
      const ins = instructionsEl.value.trim();
      if(ins) text += ` Instrucciones: ${ins}.`;
    }
    // Agregar ubicación de Google Maps si está disponible
    if(window.userLocation){
      const mapsLink = `https://www.google.com/maps?q=${window.userLocation.lat},${window.userLocation.lng}`;
      text += ` Mi ubicación es: ${mapsLink}`;
    }
    if(paymentMethod){
      text += ` Método de pago: ${paymentMethod}.`;
    }
    return encodeURIComponent(text);
  }

  // Verificar horario del local
  function checkStoreStatus(){
    const hour = new Date().getHours();
    const isOpen = hour >= STORE_OPENING && hour < STORE_CLOSING;
    const buttons = document.querySelectorAll('.add-btn');
    
    if(isOpen){
      storeStatus.classList.remove('closed');
      statusText.textContent = 'Abierto';
      buttons.forEach(btn=>btn.disabled = false);
    } else {
      storeStatus.classList.add('closed');
      statusText.textContent = 'Local Cerrado';
      buttons.forEach(btn=>btn.disabled = true);
    }
  }

  // Geolocalización
  function requestGeolocation(){
    if(!navigator.geolocation){
      showToast('Geolocalización no disponible');
      return;
    }
    geolocationBtn.disabled = true;
    geolocationBtn.textContent = '📍...';
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const {latitude: lat, longitude: lng} = pos.coords;
        window.userLocation = {lat, lng};
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        deliveryInput.value = `📍 Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        showToast('Ubicación capturada');
        geolocationBtn.disabled = false;
        geolocationBtn.textContent = '📍';
        // Update send button availability
        updateCartBubble();
      },
      (err)=>{
        showToast('No se pudo obtener la ubicación');
        geolocationBtn.disabled = false;
        geolocationBtn.textContent = '📍';
      }
    );
  }

  function sendWhatsApp(paymentMethod){
    if(cart.length === 0){ showToast('El carrito está vacío'); return; }
    if(!paymentCompleted){ showToast('Por favor realiza el pago antes de enviar el pedido'); return; }
    const hasAddress = deliveryInput && deliveryInput.value && deliveryInput.value.trim() !== '';
    if(!window.userLocation && !hasAddress){ showToast('Por favor comparte tu ubicación o ingresa una dirección antes de enviar el pedido'); return; }
    const text = generateWhatsText(paymentMethod);
    if(!text){ showToast('Error al generar el mensaje'); return; }
    // opens WhatsApp web or app to a specific number (+51 prefix already included)
    const cleaned = (WHATS_NUMBER||'').replace(/\D/g,'');
    const url = cleaned ? `https://wa.me/${cleaned}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  // Filtering
  function applyFilter(cat){
    const cards = document.querySelectorAll('.card');
    cards.forEach(c=>{
      const ccat = c.dataset.category || 'all';
      if(cat === 'all' || ccat === cat) c.style.display = '';
      else c.style.display = 'none';
    });
  }

  filterBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filterBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.cat);
    });
  });

  // Theme handling
  function applyTheme(t){
    if(t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    themeToggle.checked = (t === 'dark');
  }

  // init theme from storage
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
  themeToggle.addEventListener('change', ()=>{
    const t = themeToggle.checked ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  });

  function renderCartModal(){
    cartItemsEl.innerHTML = '';
    const grouped = groupItems();
    let total = 0;
    grouped.forEach(item=>{
      total += item.subtotal;
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="meta">
          <div class="name">${item.name}</div>
          <div class="qty">Precio: ${CURRENCY}${item.price.toFixed(2)}</div>
        </div>
        <div class="item-actions">
          <div class="qty-controls">
            <button class="qty-btn minus" data-name="${item.name}" aria-label="Restar">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn plus" data-name="${item.name}" data-price="${item.price}" aria-label="Sumar">+</button>
          </div>
          <div class="subtotal">${CURRENCY}${item.subtotal.toFixed(2)}</div>
        </div>
      `;
      cartItemsEl.appendChild(li);
    });
    cartTotalEl.textContent = `${CURRENCY}${total.toFixed(2)}`;
  }

  function openModal(){
    renderCartModal();
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    modalOverlay.classList.remove('active');
    modalOverlay.setAttribute('aria-hidden','true');
  }

  function clearCart(){
    cart = [];
    save();
    updateCartBubble();
    renderCartModal();
    showToast('Carrito vacío');
    // reset payment state
    paymentCompleted = false;
    currentPaymentMethod = null;
    updateCartBubble();
  }

  function removeOne(name){
    const idx = cart.findIndex(i=>i.name === name);
    if(idx > -1) cart.splice(idx,1);
    save();
    updateCartBubble();
    renderCartModal();
  }

  // Attach add button handlers
  document.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.dataset.name || 'Artículo';
      const price = parseFloat(btn.dataset.price) || 0;
      addItem(name, price);
    });
  });

  // Cart bubble opens modal
  cartEl.addEventListener('click', openModal);

  // Close handlers
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closeModal(); });
  // Payment modal elements
  const paymentModal = document.getElementById('payment-modal');
  const paymentOptions = document.querySelectorAll('.payment-option');
  const paymentCardForm = document.getElementById('payment-card-form');
  const paymentQR = document.getElementById('payment-qr');
  const closePaymentBtn = document.getElementById('close-payment');
  const qrImg = document.getElementById('qr-img');
  const qrAmount = document.getElementById('qr-amount');
  const confirmQRBtn = document.getElementById('confirm-qr');

  function openPaymentModal(){
    if(cart.length === 0){ showToast('El carrito está vacío'); return; }
    paymentCardForm.style.display = 'none';
    paymentQR.style.display = 'none';
    paymentModal.classList.add('active');
    paymentModal.setAttribute('aria-hidden','false');
    // set qr amount
    const grouped = groupItems();
    const total = grouped.reduce((s,it)=>s+it.subtotal,0);
    if(qrAmount) qrAmount.textContent = `${CURRENCY}${total.toFixed(2)}`;
    // reset payment selection
    currentPaymentMethod = null;
  }

  function closePaymentModal(){
    paymentModal.classList.remove('active');
    paymentModal.setAttribute('aria-hidden','true');
  }

  closePaymentBtn.addEventListener('click', closePaymentModal);
  paymentModal.addEventListener('click', (e)=>{ if(e.target === paymentModal) closePaymentModal(); });

  paymentOptions.forEach(opt=>{
    opt.addEventListener('click',(e)=>{
      const method = opt.dataset.method;
      // set friendly method name
      currentPaymentMethod = method === 'yape' ? 'Yape' : (method === 'plin' ? 'Plin' : (method === 'card' ? 'Tarjeta' : method));
      if(method === 'card'){
        paymentCardForm.style.display = 'block';
        paymentQR.style.display = 'none';
      } else {
        paymentCardForm.style.display = 'none';
        paymentQR.style.display = 'block';
        // set qr image placeholder with method
        if(qrImg) qrImg.src = method === 'yape' ? 'img/yape-qr.png' : `https://via.placeholder.com/300?text=${encodeURIComponent(method.toUpperCase())}+QR`;
      }
    });
  });

  // Card form handling
  const cardForm = document.getElementById('card-form');
  if(cardForm){
    cardForm.addEventListener('submit',(e)=>{
      e.preventDefault();
      const num = document.getElementById('card-number').value.replace(/\s+/g,'');
      const exp = document.getElementById('card-exp').value;
      const cvv = document.getElementById('card-cvv').value;
      if(!/^\d{13,19}$/.test(num)){ showToast('Número de tarjeta inválido'); return; }
      if(!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp)){ showToast('Fecha inválida (MM/YY)'); return; }
      if(!/^\d{3,4}$/.test(cvv)){ showToast('CVV inválido'); return; }
      // Simulate processing
      showToast('Procesando pago con tarjeta...');
      setTimeout(()=>{
        showToast('💳 Pago procesado con éxito. Generando boleta...');
        paymentCompleted = true;
        currentPaymentMethod = 'Tarjeta';
        // open boleta/receipt window
        openBoleta(currentPaymentMethod);
        closePaymentModal();
        // enable send button
        updateCartBubble();
      },1200);
    });
  }

  // QR confirm
  if(confirmQRBtn){
    confirmQRBtn.addEventListener('click', ()=>{
      // detect which QR method is visible by img src
      const src = qrImg ? qrImg.src : '';
      const method = currentPaymentMethod || (src.toUpperCase().includes('YAPE') ? 'Yape' : (src.toUpperCase().includes('PLIN') ? 'Plin' : 'QR'));
      showToast('Verificando pago...');
      setTimeout(()=>{
        showToast('💳 Pago verificado. Generando boleta...');
        paymentCompleted = true;
        currentPaymentMethod = method;
        // open boleta/receipt window
        openBoleta(method);
        closePaymentModal();
        // enable send button
        updateCartBubble();
      },1000);
    });
  }

  // Clear & checkout
  clearBtn.addEventListener('click', clearCart);
  checkoutBtn.addEventListener('click', ()=>{
    if(cart.length === 0){ showToast('El carrito está vacío'); return; }
    // Abrir modal de pago para que el usuario elija método
    openPaymentModal();
  });

  // Send WhatsApp
  sendWhatsBtn.addEventListener('click', ()=>{ sendWhatsApp(currentPaymentMethod); });

  // Delegate quantity buttons inside modal (+ / -)
  cartItemsEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.qty-btn');
    if(!btn) return;
    const name = btn.dataset.name;
    if(btn.classList.contains('plus')){
      const price = parseFloat(btn.dataset.price) || 0;
      addItem(name, price);
      renderCartModal();
    } else if(btn.classList.contains('minus')){
      removeOne(name);
      renderCartModal();
    }
  });

  // Search functionality
  searchInput.addEventListener('input', (e)=>{
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card=>{
      const title = card.querySelector('.card-title').textContent.toLowerCase();
      const desc = card.querySelector('.card-desc').textContent.toLowerCase();
      const matches = title.includes(query) || desc.includes(query) || query === '';
      card.style.display = matches ? '' : 'none';
    });
  });

  // Geolocation button
  geolocationBtn.addEventListener('click', requestGeolocation);

  // Inicializar
  updateCartBubble();
  checkStoreStatus();
  // Ensure send button disabled until payment
  updateCartBubble();
  // Verificar estado del local cada minuto
  setInterval(checkStoreStatus, 60000);

  // Boleta / ticket generation in new window
  function openBoleta(method){
    const grouped = groupItems();
    const total = grouped.reduce((s,it)=>s+it.subtotal,0);
    const delivery = deliveryInput.value.trim();
    const mapsLink = window.userLocation ? `https://www.google.com/maps?q=${window.userLocation.lat},${window.userLocation.lng}` : '';
    const win = window.open('', '_blank', 'width=480,height=720');
    if(!win) { showToast('No se pudo abrir la boleta (pop-ups bloqueados)'); return; }
    const itemsHtml = grouped.map(it=>`<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${CURRENCY}${it.subtotal.toFixed(2)}</td></tr>`).join('');
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Boleta - ByteFood</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}
          .ticket{max-width:420px;margin:0 auto;border:1px solid #eee;padding:16px;border-radius:8px}
          h2{text-align:center;margin:0 0 8px 0}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          td{padding:6px 4px;border-bottom:1px dashed #ddd}
          .total{font-weight:700;font-size:1.1rem;text-align:right;padding-top:8px}
          .meta{font-size:0.9rem;color:#555;margin-top:8px}
          .actions{margin-top:16px;text-align:center}
          .btn{display:inline-block;padding:8px 12px;border-radius:6px;background:#10b981;color:#fff;text-decoration:none}
        </style>
      </head>
      <body>
        <div class="ticket">
          <h2>ByteFood — Boleta</h2>
          <div class="meta">Fecha: ${new Date().toLocaleString()}</div>
          <table>
            <thead><tr><td>Producto</td><td style="text-align:center">Cant</td><td style="text-align:right">Subtotal</td></tr></thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">Total: ${CURRENCY}${total.toFixed(2)}</div>
          <div class="meta">Método de pago: ${method || 'No especificado'}</div>
          <div class="meta">Dirección: ${delivery || 'No proporcionada'}</div>
          ${mapsLink? `<div class="meta">Mapa: <a href="${mapsLink}" target="_blank">Ver ubicación</a></div>` : ''}
          <div class="actions">
            <a href="#" onclick="window.print();return false;" class="btn">Imprimir / Guardar</a>
          </div>
        </div>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  }
})();
