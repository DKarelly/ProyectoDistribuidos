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
      const data = resp.data || resp || [];
      
      // Renderizar todas las solicitudes/adopciones en una sola tabla
      const tbodyAdopciones = document.getElementById('tbody-adopciones');
      if (tbodyAdopciones) {
        if (data.length === 0) {
          tbodyAdopciones.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aún no tienes solicitudes de adopción</td></tr>';
        } else {
          tbodyAdopciones.innerHTML = data.map(item => {
            const estado = (item.estadosolicitud || 'PENDIENTE').toUpperCase();
            let estadoClass = 'bg-warning text-dark';
            let estadoTexto = 'Pendiente';
            
            if (estado === 'EN_REVISION') {
              estadoClass = 'bg-info text-white';
              estadoTexto = 'En Revisión';
            } else if (estado === 'APROBADO') {
              estadoClass = 'bg-success text-white';
              estadoTexto = item.idadopcion ? 'Adoptado ✓' : 'Aprobado';
            } else if (estado === 'RECHAZADO') {
              estadoClass = 'bg-danger text-white';
              estadoTexto = 'Rechazado';
            }
            
            const fecha = item.idadopcion 
              ? (item.fechaadopcion ? new Date(item.fechaadopcion).toLocaleDateString('es-PE') : '-')
              : (item.fechasolicitud ? new Date(item.fechasolicitud).toLocaleDateString('es-PE') : '-');
            
            return `
              <tr>
                <td><strong>${item.nombreanimal || 'Sin nombre'}</strong></td>
                <td>${fecha}</td>
                <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                <td>
                  <button class="btn btn-sm btn-pink btn-ver-solicitud" data-solicitud='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
                    <i class="bi bi-eye"></i> Ver
                  </button>
                </td>
              </tr>
            `;
          }).join('');
          
          // Agregar event listeners para los botones de ver
          tbodyAdopciones.querySelectorAll('.btn-ver-solicitud').forEach(btn => {
            btn.addEventListener('click', () => {
              const solicitud = JSON.parse(btn.dataset.solicitud.replace(/&#39;/g, "'"));
              mostrarDetalleSolicitud(solicitud);
            });
          });
        }
      }
      
      // Quitar mensaje de estado vacío si hay datos
      const dynamic = section.querySelector('.dynamic-content');
      if (dynamic) dynamic.remove();
      
    } catch (error) {
      console.error('Error cargando adopciones del usuario:', error);
      const tbodyAdopciones = document.getElementById('tbody-adopciones');
      if (tbodyAdopciones) tbodyAdopciones.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error cargando</td></tr>';
    }
  }

  // Función para mostrar el detalle de una solicitud
  function mostrarDetalleSolicitud(solicitud) {
    const estado = (solicitud.estadosolicitud || 'PENDIENTE').toUpperCase();
    let estadoClass = 'warning';
    let estadoTexto = 'Pendiente';
    let estadoIcon = 'clock';
    
    if (estado === 'EN_REVISION') {
      estadoClass = 'info';
      estadoTexto = 'En Revisión';
      estadoIcon = 'hourglass-split';
    } else if (estado === 'APROBADO') {
      estadoClass = 'success';
      estadoTexto = solicitud.idadopcion ? '¡Adoptado!' : 'Aprobado';
      estadoIcon = 'check-circle';
    } else if (estado === 'RECHAZADO') {
      estadoClass = 'danger';
      estadoTexto = 'Rechazado';
      estadoIcon = 'x-circle';
    }

    const modalBody = document.getElementById('detalleSolicitudBodyHistorial');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <!-- Estado -->
      <div class="text-center mb-4">
        <div class="rounded-circle bg-${estadoClass} bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-2" style="width: 70px; height: 70px;">
          <i class="bi bi-${estadoIcon}-fill text-${estadoClass}" style="font-size: 2.5rem;"></i>
        </div>
        <h5 class="mb-1">
          <span class="badge bg-${estadoClass} fs-6 px-3 py-2">${estadoTexto}</span>
        </h5>
        <p class="text-muted small mb-0">
          Solicitud #${solicitud.idsolicitudadopcion || 'N/A'} • 
          ${solicitud.fechasolicitud ? new Date(solicitud.fechasolicitud).toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'}) : 'Sin fecha'}
        </p>
      </div>

      <!-- Información del Animal -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header text-white py-2" style="background: linear-gradient(135deg, #ef7aa1 0%, #ff6b9d 100%);">
          <h6 class="mb-0"><i class="bi bi-heart-fill me-2"></i>Animal que deseas adoptar</h6>
        </div>
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-4 text-center mb-3 mb-md-0">
              ${solicitud.imagenanimal 
                ? `<img src="files/${solicitud.imagenanimal}" class="rounded-circle shadow" style="width: 120px; height: 120px; object-fit: cover;" alt="${solicitud.nombreanimal}">`
                : `<div class="rounded-circle d-inline-flex align-items-center justify-content-center shadow" style="width: 120px; height: 120px; background: linear-gradient(135deg, #ffeef4 0%, #ffe0eb 100%);">
                    <i class="bi bi-piggy-bank" style="font-size: 3rem; color: #ef7aa1;"></i>
                  </div>`
              }
              <h4 class="fw-bold mt-3 mb-0" style="color: #ef3b7d;">${solicitud.nombreanimal || 'Sin nombre'}</h4>
            </div>
            <div class="col-md-8">
              <div class="row g-2">
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">🐾 Especie</small>
                    <strong>${solicitud.especieanimal || 'N/A'}</strong>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">🏷️ Raza</small>
                    <strong>${solicitud.razaanimal || 'N/A'}</strong>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">📅 Edad</small>
                    <strong>${solicitud.edadmesesanimal 
                      ? (solicitud.edadmesesanimal >= 12 
                          ? Math.floor(solicitud.edadmesesanimal/12) + ' año(s)' 
                          : solicitud.edadmesesanimal + ' mes(es)') 
                      : 'N/A'}</strong>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">⚧️ Género</small>
                    <strong>${solicitud.generoanimal === 'M' ? 'Macho' : solicitud.generoanimal === 'H' ? 'Hembra' : 'N/A'}</strong>
                  </div>
                </div>
                ${solicitud.tamano ? `
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">📏 Tamaño</small>
                    <strong>${solicitud.tamano}</strong>
                  </div>
                </div>` : ''}
                ${solicitud.pelaje ? `
                <div class="col-6">
                  <div class="border rounded p-2 text-center bg-light">
                    <small class="text-muted d-block">🧶 Pelaje</small>
                    <strong>${solicitud.pelaje}</strong>
                  </div>
                </div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Motivo -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-light py-2">
          <h6 class="mb-0"><i class="bi bi-chat-quote me-2"></i>Tu motivo de adopción</h6>
        </div>
        <div class="card-body">
          <p class="mb-0 fst-italic text-secondary">"${solicitud.motivosolicitud || 'No especificado'}"</p>
        </div>
      </div>

      ${solicitud.observaciones ? `
        <div class="alert ${estado === 'RECHAZADO' ? 'alert-danger' : 'alert-info'} mb-4">
          <h6 class="alert-heading fw-bold">
            <i class="bi bi-${estado === 'RECHAZADO' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            Mensaje del Refugio
          </h6>
          <p class="mb-0">${solicitud.observaciones}</p>
        </div>
      ` : ''}
      
      ${solicitud.idadopcion ? `
        <div class="alert alert-success text-center mb-0">
          <i class="bi bi-check-circle-fill me-2" style="font-size: 1.5rem;"></i>
          <h5 class="alert-heading fw-bold mb-1">¡Felicidades! Adopción Completada</h5>
          <p class="mb-0">
            Fecha de adopción: <strong>${solicitud.fechaadopcion ? new Date(solicitud.fechaadopcion).toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'}) : 'N/A'}</strong>
          </p>
        </div>
      ` : ''}
    `;

    // Mostrar el modal
    const modalElement = document.getElementById('modalDetalleSolicitud');
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) {
      modal = new bootstrap.Modal(modalElement);
    }
    modal.show();
  }

  // Exponer función para uso global
  window.mostrarDetalleSolicitud = mostrarDetalleSolicitud;

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
      const adoptions = (ado.data || ado || []).map(a => {
        const estado = (a.estadosolicitud || 'PENDIENTE').toUpperCase();
        let estadoTexto = estado;
        if (estado === 'EN_REVISION') estadoTexto = 'En Revisión';
        else if (estado === 'APROBADO') estadoTexto = 'Aprobado';
        else if (estado === 'RECHAZADO') estadoTexto = 'Rechazado';
        else if (estado === 'PENDIENTE') estadoTexto = 'Pendiente';
        
        return {
          tipo: 'adopciones',
          id: a.idsolicitudadopcion || a.idadopcion || Math.random(),
          fecha: a.fechasolicitud || a.fechaadopcion,
          descripcion: a.nombreanimal || 'Adopción',
          animal: a.nombreanimal || '—',
          estado: estadoTexto,
          detalleExtra: a.idadopcion 
            ? `✅ Adopción completada el ${a.fechaadopcion ? new Date(a.fechaadopcion).toLocaleDateString('es-PE') : 'N/A'}`
            : `Estado: ${estadoTexto}${a.observaciones ? ' - ' + a.observaciones : ''}`
        };
      });
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
