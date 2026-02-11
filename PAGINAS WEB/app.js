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
  const STORE_OPENING = 9; // 9 AM
  const STORE_CLOSING = 23; // 11 PM

  function save(){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function updateCartBubble(){
    const count = cartEl.querySelector('.cart-count');
    if(count) count.textContent = cart.length;
    else cartEl.textContent = cart.length;
  }

  function showToast(text){
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(16px)';},1600);
    setTimeout(()=>t.remove(),2000);
  }

  function addItem(name, price){
    cart.push({name, price});
    save();
    updateCartBubble();
    // Trigger jump animation
    cartEl.classList.add('jump');
    setTimeout(()=>cartEl.classList.remove('jump'), 400);
    showToast(`${name} añadido al pedido`);
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

  function generateWhatsText(){
    const grouped = groupItems();
    if(grouped.length === 0) return '';
    // Productos listados como: Nombre xCantidad
    const productos = grouped.map(it => `${it.name} x${it.qty}`).join(' - ');
    const total = grouped.reduce((s,it) => s + it.subtotal, 0);
    let text = `Hola ByteFood! 🍔 Vengo de la web y quiero realizar el siguiente pedido: ${productos} - Total: $${total.toFixed(2)}.`;
    const delivery = deliveryInput.value.trim();
    if(delivery){
      text += ` Dirección: ${delivery}.`;
    }
    // Agregar ubicación de Google Maps si está disponible
    if(window.userLocation){
      const mapsLink = `https://www.google.com/maps?q=${window.userLocation.lat},${window.userLocation.lng}`;
      text += ` Mi ubicación es: ${mapsLink}`;
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
      statusText.textContent = 'Cerrado';
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
      },
      (err)=>{
        showToast('No se pudo obtener la ubicación');
        geolocationBtn.disabled = false;
        geolocationBtn.textContent = '📍';
      }
    );
  }

  function sendWhatsApp(){
    const text = generateWhatsText();
    if(!text){ showToast('El carrito está vacío'); return; }
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
          <div class="qty">Precio: $${item.price.toFixed(2)}</div>
        </div>
        <div class="item-actions">
          <div class="qty-controls">
            <button class="qty-btn minus" data-name="${item.name}" aria-label="Restar">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn plus" data-name="${item.name}" data-price="${item.price}" aria-label="Sumar">+</button>
          </div>
          <div class="subtotal">$${item.subtotal.toFixed(2)}</div>
        </div>
      `;
      cartItemsEl.appendChild(li);
    });
    cartTotalEl.textContent = `$${total.toFixed(2)}`;
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

  // Clear & checkout
  clearBtn.addEventListener('click', clearCart);
  checkoutBtn.addEventListener('click', ()=>{
    if(cart.length === 0){ showToast('El carrito está vacío'); return; }
    showToast('Gracias por tu compra');
    clearCart();
    closeModal();
  });

  // Send WhatsApp
  sendWhatsBtn.addEventListener('click', sendWhatsApp);

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
  // Verificar estado del local cada minuto
  setInterval(checkStoreStatus, 60000);
})();
