const { Certification, ProductCertification, Product } = require('../models');
const certificationDataService = require('../services/certificationDataService');
const { Op } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const getProductInclude = (storeId, extra = {}) => ({
  model: Product,
  as: 'Product',
  ...(storeId ? { where: { store_id: storeId }, required: true } : {}),
  ...extra
});

class CertificationController {

  
  async getCertifications(req, res) {
    try {
      const { type, region, active = 'true', page = 1, limit = 50 } = req.query;

      const whereCondition = {};
      if (type) whereCondition.type = type;
      if (region) whereCondition.region = region.toUpperCase();
      if (active === 'true') whereCondition.isActive = true;

      const offset = (page - 1) * parseInt(limit);

      const { count, rows: certifications } = await Certification.findAndCountAll({
        where: whereCondition,
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          certifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo certificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo certificaciones',
        error: error.message
      });
    }
  }

  
  async getCertificationById(req, res) {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const certification = await Certification.findByPk(id, {
        include: [{
          model: ProductCertification,
          as: 'certificationProducts',
          include: [{
            ...getProductInclude(storeId),
            attributes: ['id', 'name', 'sku', 'image']
          }]
        }]
      });

      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certificación no encontrada'
        });
      }

      res.json({
        success: true,
        data: certification
      });

    } catch (error) {
      console.error('Error obteniendo certificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo certificación',
        error: error.message
      });
    }
  }

  
  async createCertification(req, res) {
    try {
      const certificationData = req.body;

      // Validar que no exista una certificación con el mismo código
      const existingCert = await Certification.findOne({
        where: { code: certificationData.code }
      });

      if (existingCert) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una certificación con ese código'
        });
      }

      const certification = await Certification.create(certificationData);

      res.status(201).json({
        success: true,
        data: certification,
        message: 'Certificación creada exitosamente'
      });

    } catch (error) {
      console.error('Error creando certificación:', error);
      res.status(400).json({
        success: false,
        message: 'Error creando certificación',
        error: error.message
      });
    }
  }

  
  async updateCertification(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const certification = await Certification.findByPk(id);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certificación no encontrada'
        });
      }

      await certification.update(updateData);

      res.json({
        success: true,
        data: certification,
        message: 'Certificación actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error actualizando certificación:', error);
      res.status(400).json({
        success: false,
        message: 'Error actualizando certificación',
        error: error.message
      });
    }
  }

  
  async deleteCertification(req, res) {
    try {
      const { id } = req.params;

      const certification = await Certification.findByPk(id);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certificación no encontrada'
        });
      }

      // Verificar si tiene productos asociados activos
      const activeProducts = await ProductCertification.count({
        where: {
          certificationId: id,
          status: 'active'
        }
      });

      if (activeProducts > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar. Hay ${activeProducts} productos con esta certificación activa`
        });
      }

      await certification.destroy();

      res.json({
        success: true,
        message: 'Certificación eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando certificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando certificación',
        error: error.message
      });
    }
  }

  
  async assignCertificationToProduct(req, res) {
    try {
      const { productId, certificationId } = req.params;
      const certificationData = req.body;
      const storeId = resolveStoreId(req);

      // Verificar que existan el producto y la certificación
      const [product, certification] = await Promise.all([
        Product.findOne({
          where: {
            id: productId,
            ...(storeId ? { store_id: storeId } : {})
          }
        }),
        Certification.findByPk(certificationId)
      ]);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certificación no encontrada'
        });
      }

      // Verificar si ya existe esta certificación para el producto
      const existingCert = await ProductCertification.findOne({
        where: {
          productId,
          certificationId,
          certificationNumber: certificationData.certificationNumber
        }
      });

      if (existingCert) {
        return res.status(400).json({
          success: false,
          message: 'Esta certificación ya está asignada al producto'
        });
      }

      // Intentar verificar la certificación usando APIs externas
      const verificationData = await certificationDataService.verifyProductCertification(
        certificationData.certificationNumber,
        certification.code
      );

      // Crear la certificación del producto
      const productCertification = await ProductCertification.create({
        productId,
        certificationId,
        certificationNumber: certificationData.certificationNumber,
        issueDate: verificationData.issueDate || certificationData.issueDate,
        expiryDate: verificationData.expiryDate || certificationData.expiryDate,
        status: verificationData.verified ? 'active' : 'pending',
        verificationStatus: verificationData.verified ? 'verified' : 'unverified',
        score: verificationData.score || certificationData.score,
        level: verificationData.level || certificationData.level,
        certifyingBody: verificationData.certifyingBody || certificationData.certifyingBody,
        certificateUrl: certificationData.certificateUrl,
        verificationUrl: verificationData.verificationUrl,
        cost: certificationData.cost,
        renewalCost: certificationData.renewalCost,
        notes: certificationData.notes,
        isPublic: certificationData.isPublic !== false,
        priority: certificationData.priority || 1,
        verificationData: verificationData.metadata || null,
        lastVerification: verificationData.verified ? new Date() : null
      });

      // Incluir datos de la certificación en la respuesta
      const result = await ProductCertification.findByPk(productCertification.id, {
        include: [
          { model: Product, as: 'Product' },
          { model: Certification, as: 'Certification' }
        ]
      });

      res.status(201).json({
        success: true,
        data: result,
        verification: verificationData,
        message: 'Certificación asignada exitosamente'
      });

    } catch (error) {
      console.error('Error asignando certificación:', error);
      res.status(400).json({
        success: false,
        message: 'Error asignando certificación al producto',
        error: error.message
      });
    }
  }

  
  async getProductCertifications(req, res) {
    try {
      const { productId } = req.params;
      const { activeOnly = 'true' } = req.query;
      const storeId = resolveStoreId(req);

      const product = await Product.findOne({
        where: {
          id: productId,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const whereCondition = { productId };
      if (activeOnly === 'true') {
        whereCondition.status = 'active';
        whereCondition.isPublic = true;
      }

      const certifications = await ProductCertification.findAll({
        where: whereCondition,
        include: [{
          model: Certification,
          as: 'Certification'
        }],
        order: [['priority', 'ASC'], ['expiryDate', 'DESC']]
      });

      res.json({
        success: true,
        data: certifications
      });

    } catch (error) {
      console.error('Error obteniendo certificaciones del producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo certificaciones del producto',
        error: error.message
      });
    }
  }

  
  async verifyProductCertification(req, res) {
    try {
      const { productId, certificationId } = req.params;
      const storeId = resolveStoreId(req);

      const productCertification = await ProductCertification.findOne({
        where: { productId, certificationId },
        include: [
          getProductInclude(storeId),
          { model: Certification, as: 'Certification' }
        ]
      });

      if (!productCertification) {
        return res.status(404).json({
          success: false,
          message: 'Certificación del producto no encontrada'
        });
      }

      // Realizar verificación en tiempo real
      const verificationData = await certificationDataService.verifyProductCertification(
        productCertification.certificationNumber,
        productCertification.Certification.code
      );

      // Actualizar datos de verificación
      await productCertification.update({
        verificationStatus: verificationData.verified ? 'verified' : 'error',
        lastVerification: new Date(),
        verificationData: verificationData.metadata || null,
        nextVerification: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        score: verificationData.score || productCertification.score,
        level: verificationData.level || productCertification.level
      });

      res.json({
        success: true,
        data: productCertification,
        verification: verificationData,
        message: verificationData.verified ?
          'Certificación verificada exitosamente' :
          'No se pudo verificar la certificación'
      });

    } catch (error) {
      console.error('Error verificando certificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando certificación',
        error: error.message
      });
    }
  }

  
  async getExpiringCertifications(req, res) {
    try {
      const { days = 30 } = req.query;
      const storeId = resolveStoreId(req);

      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + parseInt(days));

      const expiringCertifications = await ProductCertification.findAll({
        where: {
          status: 'active',
          expiryDate: {
            [Op.between]: [new Date(), warningDate]
          }
        },
        include: [
          getProductInclude(storeId),
          { model: Certification, as: 'Certification' }
        ],
        order: [['expiryDate', 'ASC']]
      });

      res.json({
        success: true,
        data: expiringCertifications,
        count: expiringCertifications.length
      });

    } catch (error) {
      console.error('Error obteniendo certificaciones por vencer:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo certificaciones por vencer',
        error: error.message
      });
    }
  }

  
  async updateExpiredCertifications(req, res) {
    try {
      const storeId = resolveStoreId(req);

      const expiredCertifications = await ProductCertification.findAll({
        where: {
          expiryDate: {
            [Op.lt]: new Date()
          },
          status: {
            [Op.ne]: 'expired'
          }
        },
        include: [
          getProductInclude(storeId),
          { model: Certification, as: 'Certification' }
        ]
      });

      const updatePromises = expiredCertifications.map(cert =>
        cert.update({ status: 'expired' })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        updated: expiredCertifications.length,
        message: `${expiredCertifications.length} certificaciones marcadas como expiradas`
      });

    } catch (error) {
      console.error('Error actualizando certificaciones expiradas:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando certificaciones expiradas',
        error: error.message
      });
    }
  }

  
  async getCertificationStats(req, res) {
    try {
      const stats = await certificationDataService.getCertificationStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de certificaciones',
        error: error.message
      });
    }
  }

  
  async initializeBaseCertifications(req, res) {
    try {
      const result = await certificationDataService.initializeBaseCertifications();

      res.json({
        success: result,
        message: result ?
          'Certificaciones base inicializadas exitosamente' :
          'Error inicializando certificaciones base'
      });

    } catch (error) {
      console.error('Error inicializando certificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error inicializando certificaciones base',
        error: error.message
      });
    }
  }

  
  async verifyAllPendingCertifications(req, res) {
    try {
      const storeId = resolveStoreId(req);

      const pendingCertifications = await ProductCertification.findAll({
        where: {
          [Op.or]: [
            { nextVerification: null },
            { nextVerification: { [Op.lte]: new Date() } }
          ],
          status: 'active'
        },
        include: [
          getProductInclude(storeId),
          { model: Certification, as: 'Certification' }
        ]
      });

      const verificationPromises = pendingCertifications.map(async (productCert) => {
        try {
          const verificationData = await certificationDataService.verifyProductCertification(
            productCert.certificationNumber,
            productCert.Certification.code
          );

          await productCert.update({
            verificationStatus: verificationData.verified ? 'verified' : 'error',
            lastVerification: new Date(),
            verificationData: verificationData.metadata || null,
            nextVerification: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });

          return {
            id: productCert.id,
            verified: verificationData.verified,
            product: productCert.Product?.name || 'Producto desconocido'
          };
        } catch (error) {
          console.error(`Error verificando certificación ${productCert.id}:`, error);
          return {
            id: productCert.id,
            verified: false,
            error: error.message
          };
        }
      });

      const results = await Promise.all(verificationPromises);
      const verified = results.filter(r => r.verified).length;
      const failed = results.filter(r => !r.verified).length;

      res.json({
        success: true,
        data: {
          total: results.length,
          verified,
          failed,
          results
        },
        message: `Verificación completada: ${verified} exitosas, ${failed} fallidas`
      });

    } catch (error) {
      console.error('Error verificando certificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando certificaciones pendientes',
        error: error.message
      });
    }
  }

  
  async getStoreCertifiedProducts(req, res) {
    try {
      const storeId = resolveStoreId(req);
      if (!storeId) return res.status(400).json({ success: false, message: 'Tenant context required' });

      const productCerts = await ProductCertification.findAll({
        include: [
          {
            model: Product,
            as: 'Product',
            where: { store_id: storeId },
            required: true,
            attributes: ['id', 'name', 'sku', 'images', 'is_active']
          },
          {
            model: Certification,
            as: 'Certification',
            attributes: ['id', 'name', 'code', 'color', 'type']
          }
        ],
        order: [['productId', 'ASC']]
      });

      const productsMap = {};
      for (const pc of productCerts) {
        const pid = pc.Product.id;
        if (!productsMap[pid]) {
          productsMap[pid] = { product: pc.Product, certifications: [] };
        }
        productsMap[pid].certifications.push({
          id: pc.id,
          certificationId: pc.certificationId,
          status: pc.status,
          expiryDate: pc.expiryDate,
          certification: pc.Certification
        });
      }

      res.json({ success: true, data: Object.values(productsMap) });
    } catch (error) {
      console.error('Error obteniendo productos certificados:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo productos certificados', error: error.message });
    }
  }

  
  async simpleAssignCertification(req, res) {
    try {
      const { productId, certificationId } = req.params;
      const { expiryDate, notes } = req.body || {};
      const storeId = resolveStoreId(req);

      const [product, certification] = await Promise.all([
        Product.findOne({ where: { id: productId, ...(storeId ? { store_id: storeId } : {}) } }),
        Certification.findByPk(certificationId)
      ]);

      if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      if (!certification) return res.status(404).json({ success: false, message: 'Certificación no encontrada' });

      const existing = await ProductCertification.findOne({ where: { productId, certificationId } });
      if (existing) return res.json({ success: true, data: existing, message: 'Ya asignada' });

      const now = new Date();
      const expiry = expiryDate
        ? new Date(expiryDate)
        : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      const pc = await ProductCertification.create({
        productId,
        certificationId,
        certificationNumber: `MAN-${certificationId}-${productId.substring(0, 8).toUpperCase()}`,
        issueDate: now,
        expiryDate: expiry,
        status: 'active',
        verificationStatus: 'pending',
        certifyingBody: certification.issuer || 'Manual',
        isPublic: true,
        priority: 1,
        notes: notes || null
      });

      res.status(201).json({ success: true, data: pc, message: 'Certificación asignada' });
    } catch (error) {
      console.error('Error asignando certificación:', error);
      res.status(500).json({ success: false, message: 'Error asignando certificación', error: error.message });
    }
  }

  
  async removeProductCertification(req, res) {
    try {
      const { productId, certificationId } = req.params;
      const storeId = resolveStoreId(req);

      const product = await Product.findOne({
        where: { id: productId, ...(storeId ? { store_id: storeId } : {}) }
      });
      if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      const deleted = await ProductCertification.destroy({ where: { productId, certificationId } });
      if (deleted === 0) return res.status(404).json({ success: false, message: 'Certificación no asignada a este producto' });

      res.json({ success: true, message: 'Certificación eliminada del producto' });
    } catch (error) {
      console.error('Error eliminando certificación del producto:', error);
      res.status(500).json({ success: false, message: 'Error eliminando certificación', error: error.message });
    }
  }

  
  async searchProductsByCertification(req, res) {
    try {
      const { certificationId, type, region, minScore, maxPrice } = req.query;
      const storeId = resolveStoreId(req);

      const whereCondition = { status: 'active', isPublic: true };
      if (certificationId) whereCondition.certificationId = certificationId;
      if (minScore) whereCondition.score = { [Op.gte]: parseFloat(minScore) };

      const certificationWhere = {};
      if (type) certificationWhere.type = type;
      if (region) certificationWhere.region = region.toUpperCase();

      const productWhere = {};
      if (maxPrice) productWhere.price = { [Op.lte]: parseFloat(maxPrice) };
      if (storeId) productWhere.store_id = storeId;

      const products = await ProductCertification.findAll({
        where: whereCondition,
        include: [
          {
            ...getProductInclude(storeId),
            where: productWhere,
            attributes: ['id', 'name', 'sku', 'price', 'image', 'description']
          },
          {
            model: Certification,
            as: 'Certification',
            where: certificationWhere
          }
        ],
        order: [['score', 'DESC'], ['expiryDate', 'DESC']]
      });

      res.json({
        success: true,
        data: products,
        count: products.length
      });

    } catch (error) {
      console.error('Error buscando productos certificados:', error);
      res.status(500).json({
        success: false,
        message: 'Error buscando productos por certificación',
        error: error.message
      });
    }
  }
}

module.exports = new CertificationController();