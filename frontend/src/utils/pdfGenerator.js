// funciones para generar PDFs
export const generatePDFReport = (reportData, config) => {
  // abrimos una ventana nueva para el contenido del PDF
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana para generar el PDF. Verifica que no esté bloqueada por el navegador.')
  }

  const reportTitle = getReportTitle(config.type)
  const dateRangeText = getDateRangeText(config.dateRange)
  
  // generamos el HTML que se va a imprimir como PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle} - ${dateRangeText}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #64748b;
          margin: 5px 0 0 0;
          font-size: 16px;
        }
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .section-title {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: 600;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          background: #f8fafc;
        }
        .stat-label {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
        }
        .stat-change {
          font-size: 12px;
          margin-top: 5px;
        }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #f1f5f9;
          font-weight: 600;
          color: #374151;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
        .chart-placeholder {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          color: #64748b;
          margin: 20px 0;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportTitle}</h1>
        <p>Período: ${dateRangeText} | Generado: ${new Date().toLocaleString('es-ES')}</p>
      </div>

      ${generateReportContent(reportData, config)}

      <div class="footer">
        <p>${config.storeName || 'NeonHub'} - Reporte generado automáticamente el ${new Date().toLocaleDateString('es-ES')}</p>
      </div>

      <script>
        // imprimimos automáticamente cuando carga la página
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
        
        // cerramos la ventana después de imprimir
        window.onafterprint = function() {
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `

  // escribimos el contenido en la ventana nueva
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

const getReportTitle = (type) => {
  const titles = {
    general: 'Reporte General del Dashboard',
    sales: 'Reporte Detallado de Ventas',
    products: 'Reporte de Productos y Categorías',
    sustainability: 'Reporte de Sostenibilidad y Métricas Ambientales'
  }
  return titles[type] || 'Reporte Personalizado'
}

const getDateRangeText = (dateRange) => {
  const ranges = {
    week: 'Última Semana',
    month: 'Último Mes',
    quarter: 'Último Trimestre',
    year: 'Último Año',
    custom: 'Rango Personalizado'
  }
  return ranges[dateRange] || 'Período Seleccionado'
}

const generateReportContent = (reportData, config) => {
  let content = ''

  // Si reportData tiene la estructura típica del dashboard
  if (!reportData || typeof reportData !== 'object') {
    return '<div class="section"><p>No hay datos disponibles para mostrar en este reporte.</p></div>'
  }

  // Estadísticas principales
  if (reportData.summary || reportData.stats) {
    const stats = reportData.stats || reportData.summary
    content += `
      <div class="section">
        <div class="section-title">📊 Estadísticas Principales</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total de Pedidos</div>
            <div class="stat-value">${(stats.totalOrders ?? 0).toLocaleString('es-ES')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ingresos Totales</div>
            <div class="stat-value">€${parseFloat(stats.totalRevenue ?? 0).toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Nuevos Clientes</div>
            <div class="stat-value">${(stats.newCustomers ?? 0).toLocaleString('es-ES')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Valor Promedio del Pedido</div>
            <div class="stat-value">€${Number(stats.averageOrderValue ?? 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
    `
  }

  // Datos de ventas - adaptar estructura
  if (reportData.charts?.salesTrend && reportData.charts.salesTrend.length > 0) {
    content += `
      <div class="section">
        <div class="section-title">💰 Tendencia de Ventas</div>
        ${config.includeCharts ? '<div class="chart-placeholder">📈 Gráfico de tendencia de ventas (se mostraría aquí en la versión completa)</div>' : ''}
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedidos</th>
              <th>Ingresos</th>
              <th>Crecimiento</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.charts.salesTrend.slice(0, 10).map(item => `
              <tr>
                <td>${item.date || item.month || 'N/A'}</td>
                <td>${(item.orders || 0).toLocaleString('es-ES')}</td>
                <td>€${parseFloat(item.revenue || item.total || 0).toFixed(2)}</td>
                <td class="${(item.growth || 0) >= 0 ? 'positive' : 'negative'}">
                  ${(item.growth || 0) >= 0 ? '+' : ''}${(item.growth || 0)}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // Productos más vendidos
  if (reportData.charts?.topProducts && reportData.charts.topProducts.length > 0) {
    content += `
      <div class="section">
        <div class="section-title">� Productos Más Vendidos</div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad Vendida</th>
              <th>Ingresos</th>
              <th>Popularidad</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.charts.topProducts.map((product, index) => `
              <tr>
                <td>${product.name || 'Producto sin nombre'}</td>
                <td>${(product.quantity || 0).toLocaleString('es-ES')}</td>
                <td>€${parseFloat(product.revenue || 0).toFixed(2)}</td>
                <td>#${index + 1}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // Distribución por categorías
  if (reportData.charts?.categoryDistribution && reportData.charts.categoryDistribution.length > 0) {
    content += `
      <div class="section">
        <div class="section-title">🏷️ Distribución por Categorías</div>
        ${config.includeCharts ? '<div class="chart-placeholder">🥧 Gráfico circular de categorías (se mostraría aquí en la versión completa)</div>' : ''}
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Productos</th>
              <th>Porcentaje</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.charts.categoryDistribution.map(category => {
              const total = reportData.charts.categoryDistribution.reduce((sum, cat) => sum + (cat.count || 0), 0)
              const percentage = total > 0 ? ((category.count || 0) / total * 100).toFixed(1) : 0
              return `
                <tr>
                  <td>${category.name || 'Sin categoría'}</td>
                  <td>${(category.count || 0).toLocaleString('es-ES')}</td>
                  <td>${percentage}%</td>
                  <td>€${parseFloat(category.revenue || 0).toFixed(2)}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // Métricas de sostenibilidad (solo si el módulo está activo)
  if (reportData.sustainability && config.features?.sustainability !== false) {
    const rateRaw = String(reportData.sustainability.recyclingRate ?? 0)
    const recyclingRateStr = rateRaw.endsWith('%') ? rateRaw : rateRaw + '%'
    content += `
      <div class="section">
        <div class="section-title">🌱 Métricas de Sostenibilidad</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">🌿 Productos Eco</div>
            <div class="stat-value">${reportData.sustainability.ecoProducts || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">♻️ Reciclables</div>
            <div class="stat-value">${reportData.sustainability.recyclable || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">📦 Total Productos</div>
            <div class="stat-value">${reportData.sustainability.totalProducts || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">♻️ Tasa de Reciclaje</div>
            <div class="stat-value">${recyclingRateStr}</div>
          </div>
        </div>
      </div>
    `
  }

  // Descuentos (solo si el módulo está activo y hay datos)
  if (reportData.discounts && config.features?.discounts) {
    const d = reportData.discounts
    content += `
      <div class="section">
        <div class="section-title">🏷️ Descuentos Aplicados en el Período</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Pedidos con descuento</div>
            <div class="stat-value">${d.ordersWithDiscount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Importe total descontado</div>
            <div class="stat-value">€${d.totalDiscounted.toFixed(2)}</div>
          </div>
          ${d.topCode ? `
          <div class="stat-card">
            <div class="stat-label">Código más usado</div>
            <div class="stat-value">${d.topCode}</div>
          </div>` : ''}
        </div>
      </div>
    `
  }

  // Información del período
  if (reportData.meta?.dateRange) {
    content += `
      <div class="section">
        <div class="section-title">📅 Información del Período</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Fecha de Inicio:</strong></td>
              <td>${new Date(reportData.meta.dateRange.start).toLocaleDateString('es-ES')}</td>
            </tr>
            <tr>
              <td><strong>Fecha de Fin:</strong></td>
              <td>${new Date(reportData.meta.dateRange.end).toLocaleDateString('es-ES')}</td>
            </tr>
            <tr>
              <td><strong>Tipo de Reporte:</strong></td>
              <td>${getReportTitle(config.type)}</td>
            </tr>
            <tr>
              <td><strong>Generado:</strong></td>
              <td>${new Date().toLocaleString('es-ES')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  }

  // Si no hay contenido específico, mostrar un resumen básico
  if (!content) {
    content = `
      <div class="section">
        <div class="section-title">📊 Resumen del Reporte</div>
        <p>Este reporte fue generado para el período seleccionado.</p>
        <p><strong>Tipo:</strong> ${getReportTitle(config.type)}</p>
        <p><strong>Período:</strong> ${getDateRangeText(config.dateRange)}</p>
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <div class="chart-placeholder">
          Los datos del reporte se procesarán y mostrarán aquí cuando estén disponibles.
        </div>
      </div>
    `
  }

  return content
}