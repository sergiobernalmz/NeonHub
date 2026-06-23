const { sequelize } = require('../config/database');

const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Store = require('./Store');
const Product = require('./Product');
const Category = require('./Category');
const Customer = require('./Customer');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const SustainabilityMetric = require('./SustainabilityMetric');
const Supplier = require('./Supplier');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Report = require('./Report');
const ReportComment = require('./ReportComment');
const SupportTicket = require('./SupportTicket');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Certification = require('./Certification');
const ProductCertification = require('./ProductCertification');
const Transaction = require('./Transaction');
const StripeEvent = require('./StripeEvent');
const ProvisioningJob = require('./ProvisioningJob');
const PaymentRecord = require('./PaymentRecord');
const UserStore = require('./UserStore');
const SsoToken = require('./SsoToken');
const ActivationToken = require('./ActivationToken');
const UserPermission = require('./UserPermission');
const PasswordChangeToken = require('./PasswordChangeToken');
const UserSession = require('./UserSession');
const Return = require('./Return');
const DiscountCode = require('./DiscountCode');

let cachedModels = null;
let associationsInitialized = false;

const initializeModels = () => {
  if (cachedModels && associationsInitialized) {
    return cachedModels;
  }

  const models = {
    User: User(sequelize),
    Role: Role(sequelize),
    UserRole: UserRole(sequelize),
    Store: Store(sequelize),
    Product: Product(sequelize),
    Category: Category(sequelize),
    Customer: Customer(sequelize),
    Order: Order(sequelize),
    OrderItem: OrderItem(sequelize),
    Invoice: Invoice(sequelize),
    InvoiceItem: InvoiceItem(sequelize),
    SustainabilityMetric: SustainabilityMetric(sequelize),
    Supplier: Supplier(sequelize),
    Notification: Notification(sequelize),
    AuditLog: AuditLog(sequelize),
    Report: Report(sequelize),
    ReportComment: ReportComment(sequelize),
    SupportTicket: SupportTicket.init(sequelize),
    Cart: Cart(sequelize),
    CartItem: CartItem(sequelize),
    Certification: Certification,
    ProductCertification: ProductCertification,
    Transaction: Transaction(sequelize),
    StripeEvent: StripeEvent(sequelize),
    ProvisioningJob: ProvisioningJob(sequelize),
    PaymentRecord: PaymentRecord(sequelize),
    UserStore: UserStore(sequelize),
    SsoToken: SsoToken(sequelize),
    ActivationToken: ActivationToken(sequelize),
    UserPermission: UserPermission(sequelize),
    PasswordChangeToken: PasswordChangeToken(sequelize),
    UserSession: UserSession(sequelize),
    Return: Return(sequelize),
    DiscountCode: DiscountCode(sequelize)
  };

  // Define associations
  if (!associationsInitialized) {
    setupAssociations(models);
    associationsInitialized = true;
  }

  cachedModels = models;

  return models;
};

const setupAssociations = (models) => {
  const {
    User,
    Role,
    UserRole,
    Store,
    Product,
    Category,
    Customer,
    Order,
    OrderItem,
    Invoice,
    InvoiceItem,
    SustainabilityMetric,
    Supplier,
    Notification,
    AuditLog,
    Report,
    ReportComment,
    SupportTicket,
    Cart,
    CartItem,
    Certification,
    ProductCertification,
    Transaction,
    StripeEvent,
    ProvisioningJob,
    PaymentRecord,
    UserStore,
    SsoToken,
    ActivationToken,
    UserPermission,
    UserSession,
    Return
  } = models;

  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'roles'
  });
  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'users'
  });

  UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  UserRole.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

  User.hasMany(UserRole, { foreignKey: 'user_id', as: 'userRoles' });
  Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'userRoles' });

  Store.hasMany(User, { foreignKey: 'store_id', as: 'users' });
  User.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Store.hasMany(Product, { foreignKey: 'store_id', as: 'products' });
  Product.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Store.hasMany(Order, { foreignKey: 'store_id', as: 'orders' });
  Order.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Store.hasMany(Customer, { foreignKey: 'store_id', as: 'customers' });
  Customer.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Store.hasMany(Category, { foreignKey: 'store_id', as: 'categories' });
  Category.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
  Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

  Supplier.hasMany(Product, { foreignKey: 'supplier_id', as: 'products' });
  Product.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

  Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
  Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });

  Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });

  Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

  OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });

  Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
  Customer.hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });

  Invoice.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
  Order.hasOne(Invoice, { foreignKey: 'order_id', as: 'invoice' });

  Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  User.hasMany(Invoice, { foreignKey: 'created_by', as: 'createdInvoices' });

  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  InvoiceItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Product.hasMany(InvoiceItem, { foreignKey: 'product_id', as: 'invoiceItems' });

  SustainabilityMetric.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
  User.hasMany(SustainabilityMetric, { foreignKey: 'recorded_by', as: 'sustainabilityMetrics' });

  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

  AuditLog.belongsTo(User,  { foreignKey: 'user_id',  as: 'user' });
  User.hasMany(AuditLog,    { foreignKey: 'user_id',  as: 'auditLogs' });
  AuditLog.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  Store.hasMany(AuditLog,   { foreignKey: 'store_id', as: 'auditLogs' });

  Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });
  Report.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
  User.hasMany(Report, { foreignKey: 'reporter_id', as: 'reportedIssues' });
  User.hasMany(Report, { foreignKey: 'assigned_to', as: 'assignedReports' });

  Report.hasMany(ReportComment, { foreignKey: 'report_id', as: 'comments' });
  ReportComment.belongsTo(Report, { foreignKey: 'report_id', as: 'report' });

  ReportComment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(ReportComment, { foreignKey: 'user_id', as: 'reportComments' });

  User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
  Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
  CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

  CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' });

  Product.belongsToMany(Certification, {
    through: ProductCertification,
    foreignKey: 'productId',
    otherKey: 'certificationId',
    as: 'certifications'
  });
  Certification.belongsToMany(Product, {
    through: ProductCertification,
    foreignKey: 'certificationId',
    otherKey: 'productId',
    as: 'products'
  });

  ProductCertification.belongsTo(Product, { foreignKey: 'productId', as: 'Product' });
  ProductCertification.belongsTo(Certification, { foreignKey: 'certificationId', as: 'Certification' });
  Product.hasMany(ProductCertification, { foreignKey: 'productId', as: 'productCertifications' });
  Certification.hasMany(ProductCertification, { foreignKey: 'certificationId', as: 'certificationProducts' });

  Transaction.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
  Order.hasMany(Transaction, { foreignKey: 'order_id', as: 'transactions' });

  StripeEvent.hasOne(ProvisioningJob, { foreignKey: 'stripe_event_id', as: 'provisioningJob' });
  ProvisioningJob.belongsTo(StripeEvent, { foreignKey: 'stripe_event_id', as: 'stripeEvent' });

  Store.hasMany(ProvisioningJob, { foreignKey: 'store_id', as: 'provisioningJobs' });
  ProvisioningJob.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  Store.hasMany(PaymentRecord, { foreignKey: 'store_id', as: 'paymentRecords' });
  PaymentRecord.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

  UserStore.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserStore.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  User.hasMany(UserStore, { foreignKey: 'user_id', as: 'userStores' });
  Store.hasMany(UserStore, { foreignKey: 'store_id', as: 'userStores' });
  User.belongsToMany(Store, { through: UserStore, foreignKey: 'user_id', otherKey: 'store_id', as: 'stores' });
  Store.belongsToMany(User, { through: UserStore, foreignKey: 'store_id', otherKey: 'user_id', as: 'storeUsers' });

  SsoToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  SsoToken.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  User.hasMany(SsoToken, { foreignKey: 'user_id', as: 'ssoTokens' });

  ActivationToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  ActivationToken.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  User.hasMany(ActivationToken, { foreignKey: 'user_id', as: 'activationTokens' });

  UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserPermission.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  User.hasMany(UserPermission, { foreignKey: 'user_id', as: 'userPermissions' });

  UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(UserSession, { foreignKey: 'user_id', as: 'sessions' });

  Return.belongsTo(Order,    { foreignKey: 'order_id',    as: 'order' });
  Return.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
  Return.belongsTo(Store,    { foreignKey: 'store_id',    as: 'store' });
  Order.hasOne(Return,       { foreignKey: 'order_id',    as: 'return' });

  console.log('✅ Model associations setup completed');
};

const models = initializeModels();

module.exports = {
  ...models,
  sequelize,
  initializeModels,
  setupAssociations
};