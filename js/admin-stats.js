// ==========================================================================
// Panel de estadísticas (admin.html → pestaña "Estadísticas").
//
// No hace ninguna llamada nueva a Firestore: reutiliza los pedidos que
// js/admin.js ya ha cargado (window.__adminPedidos), y se mantiene al día
// escuchando el evento 'admin-pedidos-cargados' que admin.js dispara cada
// vez que carga o actualiza esa lista. Todo el cálculo (agrupar por semana,
// sumar libros vendidos) se hace aquí, en el navegador — así no depende de
// Google Analytics ni de tocar las Cloud Functions.
//
// Solo se cuentan en las estadísticas los pedidos con pagado === true: un
// pedido "pendiente" sin pagar no es una venta real todavía.
// ==========================================================================
(function () {
  var chartEl, topListEl, topEmptyEl, rangoSelect;
  var resumenPedidosEl, resumenIngresosEl, resumenTicketEl, resumenUnidadesEl;
  var pedidosActuales = [];
  var yaInicializado = false;

  function fmtEUR(n) {
    return (n || 0).toFixed(2).replace('.', ',') + '\u00A0€';
  }

  // Lunes (00:00 hora local) de la semana ISO a la que pertenece "fecha".
  function lunesDeSemana(fecha) {
    var d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    var diaSemana = (d.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
    d.setDate(d.getDate() - diaSemana);
    return d;
  }

  function fmtEtiquetaSemana(lunes) {
    return String(lunes.getDate()).padStart(2, '0') + '/' + String(lunes.getMonth() + 1).padStart(2, '0');
  }

  function construirSemanas(n) {
    var lunesActual = lunesDeSemana(new Date());
    var semanas = [];
    for (var i = n - 1; i >= 0; i--) {
      var inicio = new Date(lunesActual);
      inicio.setDate(inicio.getDate() - i * 7);
      var fin = new Date(inicio);
      fin.setDate(fin.getDate() + 7);
      semanas.push({ inicio: inicio, fin: fin, label: fmtEtiquetaSemana(inicio), pedidos: 0, ingresos: 0 });
    }
    return semanas;
  }

  function fechaPedido(pedido) {
    return pedido.createdAt && pedido.createdAt.toDate ? pedido.createdAt.toDate() : null;
  }

  function calcular(pedidos, numSemanas) {
    var semanas = construirSemanas(numSemanas);
    var inicioVentana = semanas[0].inicio;
    var libros = {}; // id -> { titulo, cantidad, ingresos }
    var totalPedidos = 0, totalIngresos = 0, totalUnidades = 0;

    pedidos.forEach(function (pedido) {
      if (!pedido.pagado) return;
      var fecha = fechaPedido(pedido);
      if (!fecha || fecha < inicioVentana) return;

      var lunes = lunesDeSemana(fecha);
      for (var i = 0; i < semanas.length; i++) {
        if (lunes.getTime() === semanas[i].inicio.getTime()) {
          semanas[i].pedidos += 1;
          semanas[i].ingresos += pedido.total || 0;
          break;
        }
      }

      totalPedidos += 1;
      totalIngresos += pedido.total || 0;

      (pedido.items || []).forEach(function (it) {
        var key = it.titulo || '(sin título)';
        if (!libros[key]) libros[key] = { titulo: key, cantidad: 0, ingresos: 0 };
        libros[key].cantidad += it.cantidad || 0;
        libros[key].ingresos += (it.precio || 0) * (it.cantidad || 0);
        totalUnidades += it.cantidad || 0;
      });
    });

    var topLibros = Object.keys(libros).map(function (k) { return libros[k]; })
      .sort(function (a, b) { return b.cantidad - a.cantidad; })
      .slice(0, 10);

    return { semanas: semanas, topLibros: topLibros, totalPedidos: totalPedidos, totalIngresos: totalIngresos, totalUnidades: totalUnidades };
  }

  function renderChart(semanas) {
    var maxIngresos = semanas.reduce(function (m, s) { return Math.max(m, s.ingresos); }, 0);
    if (maxIngresos <= 0) {
      chartEl.innerHTML = '<p class="orders-empty">Todavía no hay ventas pagadas en este periodo.</p>';
      return;
    }
    chartEl.innerHTML = semanas.map(function (s) {
      var alturaPct = Math.max(3, Math.round((s.ingresos / maxIngresos) * 100));
      var titulo = 'Semana del ' + s.label + ': ' + s.pedidos + ' pedido(s), ' + fmtEUR(s.ingresos);
      return (
        '<div class="admin-chart-col" title="' + escapeHTML(titulo) + '">' +
          '<span class="admin-chart-value">' + (s.ingresos > 0 ? fmtEUR(s.ingresos) : '') + '</span>' +
          '<div class="admin-chart-bar"><div class="admin-chart-bar-fill" style="height:' + alturaPct + '%"></div></div>' +
          '<span class="admin-chart-label">' + s.label + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderTopLibros(topLibros) {
    if (topLibros.length === 0) {
      topListEl.innerHTML = '';
      topEmptyEl.hidden = false;
      return;
    }
    topEmptyEl.hidden = true;
    var maxCantidad = topLibros[0].cantidad || 1;
    topListEl.innerHTML = topLibros.map(function (libro) {
      var anchoPct = Math.max(6, Math.round((libro.cantidad / maxCantidad) * 100));
      return (
        '<li class="admin-top-item">' +
          '<div class="admin-top-item-head">' +
            '<span class="admin-top-item-titulo">' + escapeHTML(libro.titulo) + '</span>' +
            '<span class="admin-top-item-cantidad">' + libro.cantidad + '&nbsp;uds · ' + fmtEUR(libro.ingresos) + '</span>' +
          '</div>' +
          '<div class="admin-top-item-track"><div class="admin-top-item-fill" style="width:' + anchoPct + '%"></div></div>' +
        '</li>'
      );
    }).join('');
  }

  function renderResumen(datos) {
    resumenPedidosEl.textContent = String(datos.totalPedidos);
    resumenIngresosEl.textContent = fmtEUR(datos.totalIngresos);
    resumenTicketEl.textContent = fmtEUR(datos.totalPedidos > 0 ? datos.totalIngresos / datos.totalPedidos : 0);
    resumenUnidadesEl.textContent = String(datos.totalUnidades);
  }

  function refrescar() {
    if (!chartEl) return;
    var numSemanas = parseInt(rangoSelect.value, 10) || 8;
    var datos = calcular(pedidosActuales, numSemanas);
    renderChart(datos.semanas);
    renderTopLibros(datos.topLibros);
    renderResumen(datos);
  }

  function inicializar() {
    if (yaInicializado) return;
    chartEl = document.getElementById('adminChartSemanas');
    topListEl = document.getElementById('adminTopLibros');
    topEmptyEl = document.getElementById('adminTopLibrosEmpty');
    rangoSelect = document.getElementById('adminStatsRango');
    resumenPedidosEl = document.getElementById('adminResumenPedidos');
    resumenIngresosEl = document.getElementById('adminResumenIngresos');
    resumenTicketEl = document.getElementById('adminResumenTicket');
    resumenUnidadesEl = document.getElementById('adminResumenUnidades');
    if (!chartEl || !rangoSelect) return;

    rangoSelect.addEventListener('change', refrescar);
    yaInicializado = true;
    refrescar();
  }

  window.addEventListener('admin-pedidos-cargados', function (e) {
    pedidosActuales = e.detail || [];
    inicializar();
    refrescar();
  });

  // Si el script se carga después de que admin.js ya haya disparado el
  // evento (por ejemplo, al recargar la pestaña), recupera los datos que
  // admin.js dejó en window.__adminPedidos.
  if (window.__adminPedidos) {
    pedidosActuales = window.__adminPedidos;
  }

  window.adminStats = {
    refrescar: function () {
      inicializar();
      refrescar();
    }
  };
})();
