import API_BASE_URL from '../config/api'
import { generatePDFReport } from '../utils/pdfGenerator';

class ReportService {
  
  async generateReport(type = 'general', dateRange = 'month') {
    try {
      const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/dashboard/report?type=${type}&dateRange=${dateRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'No se pudo generar el reporte');
      }

      return result.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  
  exportReportAsPDF(reportData, config, filename = 'report') {
    try {
      generatePDFReport(reportData, config);
    } catch (error) {
      console.error('Error exporting PDF report:', error);
      throw error;
    }
  }

  
  exportReportAsJSON(reportData, filename = 'report') {
    try {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  
  exportReportAsCSV(reportData, filename = 'report', storeName = '', features = {}) {
    try {
      const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('es-ES') } catch { return iso } }
      const fmtMoney = (n) => `€${Number(n || 0).toFixed(2)}`

      let csvContent = '';

      // añadimos la sección de resumen
      csvContent += `${storeName || 'NeonHub'} — RESUMEN DEL REPORTE\n`;
      csvContent += `Período,${fmtDate(reportData.meta.dateRange.start)} - ${fmtDate(reportData.meta.dateRange.end)}\n`;
      csvContent += `Total Pedidos,${reportData.summary.totalOrders}\n`;
      csvContent += `Ingresos Totales,${fmtMoney(reportData.summary.totalRevenue)}\n`;
      csvContent += `Nuevos Clientes,${reportData.summary.newCustomers}\n`;
      csvContent += `Valor Promedio del Pedido,${fmtMoney(reportData.summary.averageOrderValue)}\n`;
      csvContent += '\n';

      // añadimos los datos de tendencia de ventas
      csvContent += 'TENDENCIA DE VENTAS\n';
      csvContent += 'Fecha,Pedidos,Ingresos\n';
      reportData.charts.salesTrend.forEach(item => {
        csvContent += `${fmtDate(item.date)},${item.orders},${fmtMoney(item.revenue)}\n`;
      });
      csvContent += '\n';

      // añadimos los productos más vendidos
      csvContent += 'PRODUCTOS MÁS VENDIDOS\n';
      csvContent += 'Producto,Cantidad Vendida,Ingresos\n';
      reportData.charts.topProducts.forEach(item => {
        csvContent += `${item.name},${item.quantity},${fmtMoney(item.revenue)}\n`;
      });

      // sección de descuentos (solo si el módulo está activo)
      if (features.discounts && reportData.discounts) {
        const d = reportData.discounts
        csvContent += '\n';
        csvContent += 'DESCUENTOS APLICADOS EN EL PERÍODO\n';
        csvContent += `Pedidos con descuento,${d.ordersWithDiscount}\n`;
        csvContent += `Importe total descontado,${fmtMoney(d.totalDiscounted)}\n`;
        if (d.topCode) csvContent += `Código más usado,${d.topCode}\n`;
      }

      // sección de sostenibilidad (solo si el módulo está activo)
      if (features.sustainability && reportData.sustainability) {
        const s = reportData.sustainability
        const rate = String(s.recyclingRate ?? 0)
        csvContent += '\n';
        csvContent += 'MÉTRICAS DE SOSTENIBILIDAD\n';
        csvContent += `Productos Eco,${s.ecoProducts ?? '-'}\n`;
        csvContent += `Reciclables,${s.recyclable ?? '-'}\n`;
        csvContent += `Total Productos,${s.totalProducts ?? '-'}\n`;
        csvContent += `Tasa de Reciclaje,${rate.endsWith('%') ? rate : rate + '%'}\n`;
      }

      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV report:', error);
      throw error;
    }
  }

  
  printReport(reportData, storeName = '', features = {}) {
    try {
      const printWindow = window.open('', '_blank');
      const printContent = this.generatePrintableHTML(reportData, storeName, features);

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (error) {
      console.error('Error printing report:', error);
      throw error;
    }
  }

  
  generatePrintableHTML(reportData, storeName = '', features = {}) {
    const currentDate = new Date().toLocaleDateString('es-ES');
    const name = storeName || 'NeonHub';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte ${name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { margin-bottom: 30px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .section { margin-bottom: 30px; }
          .sustainability { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${name} - Reporte de Dashboard</h1>
          <p>Generado el: ${currentDate}</p>
          <p>Período: ${new Date(reportData.meta.dateRange.start).toLocaleDateString('es-ES')} - 
                      ${new Date(reportData.meta.dateRange.end).toLocaleDateString('es-ES')}</p>
        </div>

        <div class="section summary">
          <h2>Resumen Ejecutivo</h2>
          <table class="table">
            <tr><th>Métrica</th><th>Valor</th></tr>
            <tr><td>Total de Pedidos</td><td>${reportData.summary.totalOrders}</td></tr>
            <tr><td>Ingresos Totales</td><td>€${Number(reportData.summary.totalRevenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Nuevos Clientes</td><td>${reportData.summary.newCustomers}</td></tr>
            <tr><td>Valor Promedio del Pedido</td><td>€${Number(reportData.summary.averageOrderValue || 0).toFixed(2)}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Productos Más Vendidos</h2>
          <table class="table">
            <thead>
              <tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
            </thead>
            <tbody>
              ${reportData.charts.topProducts.map(product => `
                <tr>
                  <td>${product.name}</td>
                  <td>${product.quantity}</td>
                  <td>€${Number(product.revenue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${features.discounts && reportData.discounts ? `
        <div class="section">
          <h2>Descuentos Aplicados en el Período</h2>
          <table class="table">
            <tr><th>Pedidos con descuento</th><td>${reportData.discounts.ordersWithDiscount}</td></tr>
            <tr><th>Importe total descontado</th><td>€${Number(reportData.discounts.totalDiscounted || 0).toFixed(2)}</td></tr>
            ${reportData.discounts.topCode ? `<tr><th>Código más usado</th><td>${reportData.discounts.topCode}</td></tr>` : ''}
          </table>
        </div>` : ''}

        ${features.sustainability && reportData.sustainability ? (() => {
          const s = reportData.sustainability;
          const rate = String(s.recyclingRate ?? 0);
          return `
        <div class="section sustainability">
          <h2>Métricas de Sostenibilidad</h2>
          <table class="table">
            <tr><th>Productos Eco</th><td>${s.ecoProducts ?? '-'}</td></tr>
            <tr><th>Productos Reciclables</th><td>${s.recyclable ?? '-'}</td></tr>
            <tr><th>Total Productos</th><td>${s.totalProducts ?? '-'}</td></tr>
            <tr><th>Tasa de Reciclaje</th><td>${rate.endsWith('%') ? rate : rate + '%'}</td></tr>
          </table>
        </div>`;
        })() : ''}
      </body>
      </html>
    `;
  }
}

export default new ReportService();