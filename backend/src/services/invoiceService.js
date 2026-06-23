const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Invoice, InvoiceItem, Customer, Product, Store, sequelize } = require('../models');

// número secuencial seguro por tienda y año. La restricción unique actúa de red de seguridad.
const generateInvoiceNumber = async (storeSubdomain, year, tx) => {
    const prefix = storeSubdomain.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    const pattern = `F${year}-${prefix}-%`;

    const count = await Invoice.count({
        where: { invoice_number: { [Op.like]: pattern } },
        transaction: tx
    });

    return `F${year}-${prefix}-${String(count + 1).padStart(4, '0')}`;
};

const generateInvoiceFromOrder = async (order) => {
    if (!order.user_id || !order.customer_id || !order.items?.length) return null;

    const t = await sequelize.transaction();
    try {
        const storeSubdomain = order.store?.subdomain || order.store_id;
        const year = new Date().getFullYear();
        const invoiceNumber = await generateInvoiceNumber(storeSubdomain, year, t);

        const itemsTotal     = order.items.reduce(
            (sum, item) => sum + parseFloat(item.line_total || 0), 0
        );
        const discountAmount = parseFloat(order.discount_amount || 0);
        const shippingAmount = parseFloat(order.shipping_amount || 0);
        const totalWithTax   = parseFloat((itemsTotal - discountAmount + shippingAmount).toFixed(2));
        const taxRate        = 0.21;
        const taxAmount      = parseFloat((totalWithTax * taxRate / (1 + taxRate)).toFixed(2));
        const subtotal       = parseFloat((totalWithTax - taxAmount).toFixed(2));

        const invoice = await Invoice.create({
            invoice_number: invoiceNumber,
            customer_id:    order.customer_id,
            order_id:       order.id,
            created_by:     order.user_id,
            status:         'paid',
            invoice_date:   new Date(),
            due_date:       new Date(),
            paid_date:      new Date(),
            subtotal,
            tax_amount:     taxAmount,
            discount_amount: discountAmount,
            total_amount:   totalWithTax,
            paid_amount:    totalWithTax,
        }, { transaction: t });

        await Promise.all(order.items.map(item =>
            InvoiceItem.create({
                invoice_id:    invoice.id,
                product_id:    item.product_id,
                quantity:      item.quantity,
                unit_price:    item.unit_price,
                discount_rate: 0,
                tax_rate:      0.21,
                line_total:    item.line_total,
            }, { transaction: t })
        ));

        await t.commit();
        console.log(`🧾 Invoice ${invoiceNumber} generated for order ${order.order_number}`);
        return invoice;
    } catch (err) {
        await t.rollback();
        console.error('Error al generar la factura:', err.message);
        return null;
    }
};

const generateInvoicePDF = (invoice, storeName, storeSubdomain) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const fmt = (n) => `€${parseFloat(n || 0).toFixed(2)}`;
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '-';
        const customer = invoice.customer || invoice.Customer;
        const items    = invoice.items    || invoice.InvoiceItems || [];

        
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#111827').text(storeName, 50, 50);
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
            .text(`${storeSubdomain}.neonhub.es`, 50, 76);

        doc.fontSize(28).font('Helvetica-Bold').fillColor('#1d4ed8')
            .text('FACTURA', 350, 50, { align: 'right', width: 200 });
        doc.fontSize(12).font('Helvetica').fillColor('#111827')
            .text(invoice.invoice_number, 350, 84, { align: 'right', width: 200 });
        doc.fontSize(10).fillColor('#6b7280')
            .text(`Fecha: ${fmtDate(invoice.invoice_date)}`, 350, 100, { align: 'right', width: 200 });
        if (invoice.order) {
            doc.text(`Pedido: ${invoice.order.order_number || ''}`, 350, 114, { align: 'right', width: 200 });
        }

        
        doc.moveTo(50, 135).lineTo(545, 135).strokeColor('#e5e7eb').lineWidth(1).stroke();

        
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280')
            .text('FACTURADO A', 50, 150);
        if (customer) {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
                .text(`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente', 50, 165);
            doc.fontSize(10).font('Helvetica').fillColor('#374151')
                .text(customer.email || '', 50, 180);
        }

        
        const statusColor = invoice.status === 'paid' ? '#16a34a' : '#d97706';
        const statusBg    = invoice.status === 'paid' ? '#dcfce7' : '#fef3c7';
        doc.roundedRect(395, 148, 150, 22, 4).fillColor(statusBg).fill();
        doc.fontSize(10).font('Helvetica-Bold').fillColor(statusColor)
            .text(invoice.status === 'paid' ? 'PAGADA' : invoice.status.toUpperCase(), 395, 155, { width: 150, align: 'center' });

        
        const tableTop = 215;
        doc.rect(50, tableTop, 495, 22).fillColor('#f9fafb').fill();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
            .text('DESCRIPCIÓN',   55,   tableTop + 7)
            .text('CANT.',        340,   tableTop + 7, { width: 40, align: 'right' })
            .text('P. UNIT.',     385,   tableTop + 7, { width: 70, align: 'right' })
            .text('TOTAL',        460,   tableTop + 7, { width: 80, align: 'right' });

        doc.moveTo(50, tableTop + 22).lineTo(545, tableTop + 22).strokeColor('#e5e7eb').stroke();

        
        let y = tableTop + 32;
        items.forEach((item, i) => {
            const productName = item.product?.name || item.Product?.name || 'Producto';
            if (i % 2 === 1) {
                doc.rect(50, y - 5, 495, 20).fillColor('#f9fafb').fill();
            }
            doc.fontSize(10).font('Helvetica').fillColor('#111827')
                .text(productName,                    55,  y, { width: 270 })
                .text(String(item.quantity),          340, y, { width: 40, align: 'right' })
                .text(fmt(item.unit_price),           385, y, { width: 70, align: 'right' })
                .text(fmt(item.line_total),           460, y, { width: 80, align: 'right' });
            y += 22;
        });

        
        const totalsY = Math.max(y + 15, 480);
        doc.moveTo(350, totalsY).lineTo(545, totalsY).strokeColor('#e5e7eb').stroke();

        let ty = totalsY + 10;
        doc.fontSize(10).font('Helvetica').fillColor('#374151')
            .text('Base imponible:',     350, ty, { width: 110 })
            .text(fmt(invoice.subtotal), 460, ty, { width: 80, align: 'right' });
        ty += 16;

        doc.fillColor('#374151')
            .text('IVA (21%):',              350, ty, { width: 110 })
            .text(fmt(invoice.tax_amount),   460, ty, { width: 80, align: 'right' });
        ty += 16;

        const discountAmt = parseFloat(invoice.discount_amount || 0);
        if (discountAmt > 0) {
            doc.fillColor('#16a34a')
                .text('Descuento:',              350, ty, { width: 110 })
                .text(`-${fmt(discountAmt)}`,    460, ty, { width: 80, align: 'right' });
            ty += 16;
        }

        doc.moveTo(350, ty + 3).lineTo(545, ty + 3).strokeColor('#374151').stroke();
        ty += 10;

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827')
            .text('TOTAL:',                   350, ty, { width: 110 })
            .text(fmt(invoice.total_amount),  460, ty, { width: 80, align: 'right' });
        ty += 20;

        if (invoice.status === 'paid') {
            doc.fontSize(10).font('Helvetica').fillColor('#16a34a')
                .text(`Pagado el ${fmtDate(invoice.paid_date)}`, 350, ty, { width: 195, align: 'right' });
        }

        
        doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
            .text('Gracias por su compra.', 50, 750, { align: 'center', width: 495 })
            .text(`${storeName} · ${storeSubdomain}.neonhub.es`, 50, 762, { align: 'center', width: 495 });

        doc.end();
    });
};

module.exports = { generateInvoiceFromOrder, generateInvoicePDF };
