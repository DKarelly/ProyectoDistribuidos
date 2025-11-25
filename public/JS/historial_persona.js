// JS específico para Historial_Persona.html
// Reutiliza utilidades globales de codigo.js (apiRequest, isAuthenticated, showMessage, formatDisplayDate)

(function () {
  const TBODIES = {
    donaciones: 'tbody-donaciones',
    adopciones: 'tbody-adopciones',
    ahijados: 'tbody-ahijados',
  };

  function getSectionTbody(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return null;
    const byId = document.getElementById(TBODIES[sectionId] || '');
    return byId || section.querySelector('tbody');
  }

  function renderEmptyState(sectionId, message) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    // Limpiar contenido dinámico
    const dynamic = section.querySelector('.dynamic-content');
    if (dynamic) dynamic.remove();
    // Limpiar posibles filas previas
    const tbody = getSectionTbody(sectionId);
    if (tbody) tbody.innerHTML = '';
    // Crear contenedor
    const div = document.createElement('div');
    div.className = 'text-center py-4 dynamic-content';
    div.innerHTML = `<p class="text-muted">${message}</p>`;
    section.appendChild(div);
  }

  async function renderUserDonations() {
    const section = document.getElementById('donaciones');
    if (!section) return;
    try {
      const resp = await apiRequest('/donations/mine');
      const donations = resp.data || resp || [];
      if (!donations || donations.length === 0) {
        renderEmptyState('donaciones', 'Todavía no has realizado donaciones.');
        return;
      }
      // Construir tabla en tbody
      const tbody = getSectionTbody('donaciones');
      if (!tbody) return;
      // Quitar mensajes previos
      const dynamic = section.querySelector('.dynamic-content');
      if (dynamic) dynamic.remove();
      tbody.innerHTML = donations.map(d => cardRowHTML({
        tipo: 'donaciones',
        id: d.idDonacion || d.id || d.iddonacion || d.id_detalle || Math.random(),
        fecha: d.fecha || d.createdAt,
        descripcion: d.detalle || d.descripcion || d.categoria || 'Donación',
        categoria: d.categoria || '—',
        cantidad: (d.monto != null) ? `S/ ${Number(d.monto).toFixed(2)}` : (d.cantidad || '—'),
        detalleExtra: `Detalle: ${(d.detalle || d.descripcion || '—')}`
      }, 4)).join('');
    } catch (error) {
      console.error('Error cargando donaciones del usuario:', error);
      // Evitar mostrar alerta cuando el endpoint no existe; mostrar estado vacío
      renderEmptyState('donaciones', 'No se pudieron cargar tus donaciones.');
    }
  }

  async function renderUserAdoptions() {
    const section = document.getElementById('adopciones');
    if (!section) return;
    try {
      const resp = await apiRequest('/adoptions/mine');
      const adoptions = resp.data || resp || [];
      if (!adoptions || adoptions.length === 0) {
        renderEmptyState('adopciones', 'Todavía no has realizado adopciones.');
        return;
      }
      const tbody = getSectionTbody('adopciones');
      if (!tbody) return;
      const dynamic = section.querySelector('.dynamic-content');
      if (dynamic) dynamic.remove();
      tbody.innerHTML = adoptions.map(a => cardRowHTML({
        tipo: 'adopciones',
        id: a.idAdopcion || a.id || a.idadopcion || Math.random(),
        fecha: a.fechaAdopcion || a.createdAt,
        descripcion: a.nombreAnimal || a.animal?.nombreAnimal || 'Adopción',
        animal: a.nombreAnimal || a.animal?.nombreAnimal || '—',
        estado: a.estado || '—',
        detalleExtra: `Estado: ${a.estado || '—'}`
      }, 3)).join('');
    } catch (error) {
      console.error('Error cargando adopciones del usuario:', error);
      // Evitar alerta duplicada; solo renderear estado vacío
      renderEmptyState('adopciones', 'No se pudieron cargar tus adopciones.');
    }
  }

  async function renderUserGodchildren() {
    const section = document.getElementById('ahijados');
    if (!section) return;
    try {
      const resp = await apiRequest('/apadrinamiento/mine');
      const godchildren = resp.data || resp || [];
      if (!godchildren || godchildren.length === 0) {
        renderEmptyState('ahijados', 'Todavía no tienes ahijados.');
        return;
      }
      const tbody = getSectionTbody('ahijados');
      if (!tbody) return;
      const dynamic = section.querySelector('.dynamic-content');
      if (dynamic) dynamic.remove();
      tbody.innerHTML = godchildren.map(g => cardRowHTML({
        tipo: 'ahijados',
        id: g.idApadrinamiento || g.id || g.idapadrinamiento || Math.random(),
        fecha: g.fechaInicio || g.createdAt || g.fecha,
        descripcion: g.nombreAnimal || g.animal?.nombreAnimal || 'Apadrinamiento',
        animal: g.nombreAnimal || g.animal?.nombreAnimal || '—',
        desde: g.fechaInicio || g.fecha || g.createdAt,
        detalleExtra: 'Compromiso activo'
      }, 2)).join('');
    } catch (error) {
      console.error('Error cargando ahijados del usuario:', error);
      // Evitar alerta innecesaria; mostrar estado vacío
      renderEmptyState('ahijados', 'No se pudieron cargar tus ahijados.');
    }
  }

  function showSubmodule(submodule, evt) {
    const contents = document.querySelectorAll('.submodule-content');
    contents.forEach(content => content.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    const target = document.getElementById(submodule);
    if (target) target.classList.add('active');
    if (evt?.target) evt.target.classList.add('active');
    const titles = {
      'donaciones': 'Mis donaciones',
      'adopciones': 'Mis adopciones',
      'ahijados': 'Mis ahijados'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[submodule];
    document.title = titles[submodule] + ' - Huella Feliz';
  }

  function init() {
    // Enlazar botones
    const btns = document.querySelectorAll('.tab-button');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mod = btn.getAttribute('onclick')?.match(/showSubmodule\('([^']+)'/);
        const sub = mod?.[1] || btn.textContent.trim().toLowerCase();
        showSubmodule(sub, e);
      });
    });

    // Seleccionar submódulo desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const submodule = urlParams.get('submodule');
    if (submodule && ['donaciones', 'adopciones', 'ahijados'].includes(submodule)) {
      showSubmodule(submodule);
    }

    // Validar autenticación
    if (!isAuthenticated()) {
      renderEmptyState('donaciones', 'Necesitas iniciar sesión para ver tus donaciones.');
      renderEmptyState('adopciones', 'Necesitas iniciar sesión para ver tus adopciones.');
      renderEmptyState('ahijados', 'Necesitas iniciar sesión para ver tus ahijados.');
      return;
    }

    // Cargar datos
    renderUserDonations();
    renderUserAdoptions();
    renderUserGodchildren();

    // Inicializar tarjetas dinámicas
    initDynamicCards();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Exponer funciones si se necesitan
  window.showSubmodule = showSubmodule;

  // ---------------- TARJETAS DINÁMICAS -----------------
  let ALL_CARD_DATA = [];

  async function fetchAllForCards() {
    try {
      const [don, ado, ahi] = await Promise.all([
        apiRequest('/donations/mine').catch(() => []),
        apiRequest('/adoptions/mine').catch(() => []),
        apiRequest('/apadrinamiento/mine').catch(() => [])
      ]);
      const donations = (don.data || don || []).map(d => ({
        tipo: 'donaciones',
        id: d.idDonacion || d.id || d.iddonacion || d.id_detalle || Math.random(),
        fecha: d.fecha || d.createdAt,
        descripcion: (d.detalle || d.descripcion || d.categoria || 'Donación'),
        categoria: d.categoria || '—',
        cantidad: d.monto != null ? `S/ ${Number(d.monto).toFixed(2)}` : (d.cantidad || '—'),
        detalleExtra: `Detalle: ${(d.detalle || d.descripcion || '—')}`
      }));
      const adoptions = (ado.data || ado || []).map(a => ({
        tipo: 'adopciones',
        id: a.idAdopcion || a.id || a.idadopcion || Math.random(),
        fecha: a.fechaAdopcion || a.createdAt,
        descripcion: a.nombreAnimal || a.animal?.nombreAnimal || 'Adopción',
        animal: a.nombreAnimal || a.animal?.nombreAnimal || '—',
        estado: a.estado || '—',
        detalleExtra: `Estado: ${a.estado || '—'}`
      }));
      const godchildren = (ahi.data || ahi || []).map(g => ({
        tipo: 'ahijados',
        id: g.idApadrinamiento || g.id || g.idapadrinamiento || Math.random(),
        fecha: g.fechaInicio || g.createdAt || g.fecha,
        descripcion: g.nombreAnimal || g.animal?.nombreAnimal || 'Apadrinamiento',
        animal: g.nombreAnimal || g.animal?.nombreAnimal || '—',
        desde: g.fechaInicio || g.fecha || g.createdAt,
        detalleExtra: 'Compromiso activo'
      }));
      ALL_CARD_DATA = [...donations, ...adoptions, ...godchildren];
    } catch (e) {
      console.error('Error combinando datos para tarjetas:', e);
      ALL_CARD_DATA = [];
    }
  }

  function formatCardDate(iso) {
    if (!iso) return '—';
    const dt = new Date(iso);
    return dt.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: '2-digit' });
  }

  function truncateTxt(txt, max = 100) {
    if (!txt) return '—';
    return txt.length > max ? txt.slice(0, max) + '…' : txt;
  }

  function borderClass(tipo) {
    switch (tipo) {
      case 'donaciones': return 'border-l-4 border-pink-300';
      case 'adopciones': return 'border-l-4 border-pink-400';
      case 'ahijados': return 'border-l-4 border-pink-500';
      default: return 'border-l-4 border-pink-300';
    }
  }

  function cardGradient() {
    return 'background: linear-gradient(135deg, #ef7aa1 0%, #ff6b9d 100%);';
  }

  function createCard(item) {
    const div = document.createElement('div');
    div.className = `bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 ${borderClass(item.tipo)} flex flex-col position-relative`;

    const header = document.createElement('div');
    header.className = 'p-4 border-bottom border-light';
    header.setAttribute('style', cardGradient());

    const badges = document.createElement('div');
    badges.className = 'd-flex flex-wrap gap-2 mb-2';
    badges.innerHTML = `
      <span class="px-2 py-1 small fw-semibold rounded text-white" style="background: rgba(255,255,255,0.25);">ID: #${item.id}</span>
      <span class="px-2 py-1 small fw-semibold rounded text-white text-capitalize" style="background: rgba(255,255,255,0.25);">${item.tipo}</span>
    `;

    const title = document.createElement('h5');
    title.className = 'text-white fw-semibold mb-1';
    title.textContent = truncateTxt(item.descripcion);

    const fechaEl = document.createElement('p');
    fechaEl.className = 'text-white-50 small mb-0';
    fechaEl.textContent = 'Fecha: ' + formatCardDate(item.fecha || item.desde);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-light position-absolute top-0 end-0 m-2 d-flex align-items-center gap-1';
    btn.innerHTML = `<span class="label-text">Ver Detalles</span><i class="bi bi-chevron-down rotate-chevron"></i>`;

    header.appendChild(badges);
    header.appendChild(title);
    header.appendChild(fechaEl);
    header.appendChild(btn);

    const base = document.createElement('div');
    base.className = 'p-3 small d-flex flex-column gap-2 flex-grow-1';
    if (item.tipo === 'donaciones') {
      base.innerHTML = `<div><strong class="text-pink">Categoría:</strong> ${item.categoria}</div><div><strong class="text-pink">Cantidad:</strong> ${item.cantidad}</div>`;
    } else if (item.tipo === 'adopciones') {
      base.innerHTML = `<div><strong class="text-pink">Animal:</strong> ${item.animal}</div><div><strong class="text-pink">Estado:</strong> ${item.estado}</div>`;
    } else if (item.tipo === 'ahijados') {
      base.innerHTML = `<div><strong class="text-pink">Animal:</strong> ${item.animal}</div><div><strong class="text-pink">Desde:</strong> ${formatCardDate(item.desde)}</div>`;
    }

    const expandable = document.createElement('div');
    expandable.className = 'expandable-wrapper bg-pink-50';
    expandable.innerHTML = `
      <div class="p-3 small">
        <h6 class="fw-semibold text-pink">Detalles adicionales</h6>
        <p class="mb-2">${item.detalleExtra || 'Sin detalles adicionales.'}</p>
        <div class="row g-2">
          <div class="col-6">
            <div class="bg-white rounded p-2 shadow-sm">
              <p class="text-muted mb-0 small">ID Registro</p>
              <p class="mb-0 fw-medium">${item.id}</p>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-white rounded p-2 shadow-sm">
              <p class="text-muted mb-0 small">Tipo</p>
              <p class="mb-0 fw-medium text-capitalize">${item.tipo}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    btn.addEventListener('click', () => toggleExpand(expandable, btn));

    div.appendChild(header);
    div.appendChild(base);
    div.appendChild(expandable);
    return div;
  }
  // Construye una fila de tabla con una tarjeta dentro (colspan para ocupar todo el ancho)
  function cardRowHTML(item, colspan = 4) {
    // Reutilizamos HTML de createCard pero como string dentro de una celda
    const baseVisible = (item.tipo === 'donaciones')
      ? `<div><strong class="text-pink">Categoría:</strong> ${item.categoria}</div><div><strong class="text-pink">Cantidad:</strong> ${item.cantidad}</div>`
      : (item.tipo === 'adopciones')
        ? `<div><strong class="text-pink">Animal:</strong> ${item.animal}</div><div><strong class="text-pink">Estado:</strong> ${item.estado}</div>`
        : `<div><strong class="text-pink">Animal:</strong> ${item.animal}</div><div><strong class="text-pink">Desde:</strong> ${formatCardDate(item.desde)}</div>`;

    const html = `
      <tr>
        <td colspan="${colspan}">
          <div class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 ${borderClass(item.tipo)} position-relative">
            <div class="p-4 border-bottom border-light" style="${cardGradient()}">
              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="px-2 py-1 small fw-semibold rounded text-white" style="background: rgba(255,255,255,0.25);">ID: #${item.id}</span>
                <span class="px-2 py-1 small fw-semibold rounded text-white text-capitalize" style="background: rgba(255,255,255,0.25);">${item.tipo}</span>
              </div>
              <h5 class="text-white fw-semibold mb-1">${truncateTxt(item.descripcion)}</h5>
              <p class="text-white-50 small mb-0">Fecha: ${formatCardDate(item.fecha || item.desde)}</p>
              <button class="btn btn-sm btn-light position-absolute top-0 end-0 m-2 d-flex align-items-center gap-1 card-toggle">
                <span class="label-text">Ver Detalles</span>
                <i class="bi bi-chevron-down rotate-chevron"></i>
              </button>
            </div>
            <div class="p-3 small d-flex flex-column gap-2">
              ${baseVisible}
            </div>
            <div class="expandable-wrapper bg-pink-50">
              <div class="p-3 small">
                <h6 class="fw-semibold text-pink">Detalles adicionales</h6>
                <p class="mb-2">${item.detalleExtra || 'Sin detalles adicionales.'}</p>
                <div class="row g-2">
                  <div class="col-6">
                    <div class="bg-white rounded p-2 shadow-sm">
                      <p class="text-muted mb-0 small">ID Registro</p>
                      <p class="mb-0 fw-medium">${item.id}</p>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="bg-white rounded p-2 shadow-sm">
                      <p class="text-muted mb-0 small">Tipo</p>
                      <p class="mb-0 fw-medium text-capitalize">${item.tipo}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
    return html;
  }

  function toggleExpand(expandable, button) {
    const expanded = expandable.classList.toggle('expanded');
    const chevron = button.querySelector('.rotate-chevron');
    const label = button.querySelector('.label-text');
    if (chevron) chevron.classList.toggle('rotated', expanded);
    if (label) label.textContent = expanded ? 'Ocultar Detalles' : 'Ver Detalles';
  }

  function renderCards(filter) {
    const grid = document.getElementById('tarjetas-grid');
    const empty = document.getElementById('tarjetas-empty');
    if (!grid) return;
    grid.innerHTML = '';
    let data = ALL_CARD_DATA;
    if (filter && filter !== 'todos') data = data.filter(d => d.tipo === filter);
    if (data.length === 0) {
      if (empty) empty.classList.remove('d-none');
      return;
    }
    if (empty) empty.classList.add('d-none');
    data.forEach(item => grid.appendChild(createCard(item)));
  }

  function initCardFilters() {
    const container = document.getElementById('tarjetas-filtros');
    if (!container) return;
    container.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        renderCards(btn.getAttribute('data-filter'));
      });
    });
  }

  async function initDynamicCards() {
    // Ya no usamos sección separada; solo aseguramos datos para estilos/funciones compartidas
    if (!isAuthenticated()) return;
    await fetchAllForCards();
    // Nada más: el render ocurre en cada submódulo
  }

  // Estilos adicionales para expansión (inyectar si no existe)
  const styleId = 'tarjetas-expand-style';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
      .expandable-wrapper { max-height:0; overflow:hidden; transition:max-height .35s ease; }
      .expandable-wrapper.expanded { max-height:600px; }
      .rotate-chevron { transition: transform .3s ease; }
      .rotate-chevron.rotated { transform: rotate(180deg); }
      .active-filter { outline:2px solid #ef7aa1; }
      .text-pink { color:#ef3b7d; }
    `;
    document.head.appendChild(st);
  }

  // Delegación para toggles dentro de tarjetas en tablas
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-toggle');
    if (!btn) return;
    const card = btn.closest('div');
    const expandable = card?.querySelector('.expandable-wrapper');
    if (!expandable) return;
    const chevron = btn.querySelector('.rotate-chevron');
    const label = btn.querySelector('.label-text');
    const expanded = expandable.classList.toggle('expanded');
    if (chevron) chevron.classList.toggle('rotated', expanded);
    if (label) label.textContent = expanded ? 'Ocultar Detalles' : 'Ver Detalles';
  });
})();
