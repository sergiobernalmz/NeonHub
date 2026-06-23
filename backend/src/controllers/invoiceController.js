const { Op } = require('sequelize');
const { Invoice, InvoiceItem, Customer, Order, Product, Store } = require('../models');
const { generateInvoicePDF } = require('../services/invoiceService');

const invoiceController = {

    // GET /api/invoices  — CEO: todas las facturas de su tienda
    list: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const { status, from, to, page = 1, limit = 30 } = req.query;
            const where = { '$customer.store_id$': req.tenant.id };
            if (status) where.status = status;
            if (from || to) {
                where.invoice_date = {};
                if (from) where.invoice_date[Op.gte] = new Date(from);
                if (to)   where.invoice_date[Op.lte] = new Date(to);
            }

            const { count, rows } = await Invoice.findAndCountAll({
                where,
                include: [
                    { model: Customer, as: 'customer', attributes: ['first_name', 'last_name', 'email'] },
                    { model: Order,    as: 'order',    attributes: ['order_number'] },
                ],
                order:  [['invoice_date', 'DESC']],
                limit:  parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                subQuery: false,
            });

            return res.json({ success: true, data: rows, total: count });
        } catch (err) {
            console.error('Error listing invoices:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/stats  — CEO: estadísticas resumen
    stats: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const storeWhere = { '$customer.store_id$': req.tenant.id };
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [total, thisMonth, count] = await Promise.all([
                Invoice.sum('total_amount', { where: { ...storeWhere, status: 'paid' }, include: [{ model: Customer, as: 'customer', attributes: [] }] }),
                Invoice.sum('total_amount', { where: { ...storeWhere, status: 'paid', invoice_date: { [Op.gte]: startOfMonth } }, include: [{ model: Customer, as: 'customer', attributes: [] }] }),
                Invoice.count({ where: storeWhere, include: [{ model: Customer, as: 'customer', attributes: [] }] }),
            ]);

            return res.json({ success: true, data: { total: total || 0, this_month: thisMonth || 0, count: count || 0 } });
        } catch (err) {
            console.error('Error invoice stats:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/:id  — CEO: detalle de una factura
    detail: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const invoice = await Invoice.findOne({
                where: { id: req.params.id, '$customer.store_id$': req.tenant.id },
                include: [
                    { model: Customer, as: 'customer', attributes: ['first_name', 'last_name', 'email'] },
                    { model: Order,    as: 'order',    attributes: ['order_number'] },
                    { model: InvoiceItem, as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name'] }] },
                ],
            });

            if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
            return res.json({ success: true, data: invoice });
        } catch (err) {
            console.error('Error invoice detail:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/:id/pdf  — CEO: descargar PDF
    pdf: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const invoice = await Invoice.findOne({
                where: { id: req.params.id, '$customer.store_id$': req.tenant.id },
                include: [
                    { model: Customer,    as: 'customer',  attributes: ['first_name', 'last_name', 'email'] },
                    { model: Order,       as: 'order',     attributes: ['order_number'] },
                    { model: InvoiceItem, as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name'] }] },
                ],
            });

            if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

            const store  = await Store.findByPk(req.tenant.id, { attributes: ['name', 'subdomain'] });
            const pdfBuf = await generateInvoicePDF(invoice.toJSON(), store.name, store.subdomain);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoice_number}.pdf"`);
            return res.send(pdfBuf);
        } catch (err) {
            console.error('Error generating PDF:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/my  — Customer: sus propias facturas
    myInvoices: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const customer = await Customer.findOne({
                where: { email: req.user.email, store_id: req.tenant.id },
                attributes: ['id'],
            });

            if (!customer) return res.json({ success: true, data: [] });

            const invoices = await Invoice.findAll({
                where: { customer_id: customer.id },
                include: [
                    { model: Order,       as: 'order',     attributes: ['order_number'] },
                    { model: InvoiceItem, as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name'] }] },
                ],
                order: [['invoice_date', 'DESC']],
            });

            return res.json({ success: true, data: invoices });
        } catch (err) {
            console.error('Error my invoices:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/:id/preview  — Customer: previsualizar su factura en JSON
    getPreview: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const customer = await Customer.findOne({
                where: { email: req.user.email, store_id: req.tenant.id },
                attributes: ['id'],
            });

            if (!customer) return res.status(403).json({ success: false, message: 'No autorizado' });

            const invoice = await Invoice.findOne({
                where: { id: req.params.id, customer_id: customer.id },
                include: [
                    { model: Customer,    as: 'customer',  attributes: ['first_name', 'last_name', 'email'] },
                    { model: Order,       as: 'order',     attributes: ['order_number'] },
                    { model: InvoiceItem, as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name'] }] },
                ],
            });

            if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

            return res.json({ success: true, data: invoice });
        } catch (err) {
            console.error('Error invoice preview:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /api/invoices/:id/pdf-customer  — Customer: descargar su propio PDF
    pdfCustomer: async (req, res) => {
        try {
            if (!req.tenant?.id) {
                return res.status(400).json({ success: false, message: 'Contexto de tienda requerido' });
            }

            const customer = await Customer.findOne({
                where: { email: req.user.email, store_id: req.tenant.id },
                attributes: ['id'],
            });

            if (!customer) return res.status(403).json({ success: false, message: 'No autorizado' });

            const invoice = await Invoice.findOne({
                where: { id: req.params.id, customer_id: customer.id },
                include: [
                    { model: Customer,    as: 'customer',  attributes: ['first_name', 'last_name', 'email'] },
                    { model: Order,       as: 'order',     attributes: ['order_number'] },
                    { model: InvoiceItem, as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name'] }] },
                ],
            });

            if (!invoice) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

            const store  = await Store.findByPk(req.tenant.id, { attributes: ['name', 'subdomain'] });
            const pdfBuf = await generateInvoicePDF(invoice.toJSON(), store.name, store.subdomain);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoice_number}.pdf"`);
            return res.send(pdfBuf);
        } catch (err) {
            console.error('Error generating customer PDF:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },
};

module.exports = invoiceController;
