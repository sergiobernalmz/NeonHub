# NeonHub — Modelo de Datos

**Versión**: 1.0
**Fecha**: 10 de abril de 2026
**Base de datos**: PostgreSQL (producción) | MySQL (tests) | SQLite (fallback tests)
**ORM**: Sequelize

---

## 1. Resumen de modelos (26)

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios del sistema (admins, empleados, clientes) |
| `Role` | Roles con permisos JSON |
| `UserRole` | Relación N:M entre usuarios y roles |
| `Store` | Tenant SaaS (tienda/empresa) |
| `Product` | Producto del catálogo |
| `Category` | Categorías de productos |
| `ProductCertification` | Relación N:M producto-certificación |
| `Certification` | Certificaciones ecológicas |
| `SustainabilityMetric` | Métricas ecológicas por producto |
| `Customer` | Cliente (puede coincidir con User) |
| `Order` | Pedido |
| `OrderItem` | Línea de un pedido |
| `Cart` | Carrito de compras |
| `CartItem` | Ítem en carrito |
| `Invoice` | Factura |
| `InvoiceItem` | Línea de factura |
| `Transaction` | Registro de transacción de pago |
| `PaymentRecord` | Detalle de pago (Stripe) |
| `StripeEvent` | Eventos de webhook de Stripe |
| `Report` | Reporte interno |
| `ReportComment` | Comentario en un reporte |
| `SupportTicket` | Ticket de soporte |
| `Notification` | Notificación interna |
| `Supplier` | Proveedor |
| `ProvisioningJob` | Job de aprovisionamiento de nuevo tenant |
| `AuditLog` | Log de auditoría de acciones |

---

## 2. Diagrama ER — Núcleo del sistema

```mermaid
erDiagram
    Store {
        int id PK
        string name
        string domain
        string subdomain
        string api_key
        string status
        int owner_id FK
        timestamp created_at
    }

    User {
        int id PK
        string username
        string email
        string password_hash
        string first_name
        string last_name
        int store_id FK
        boolean is_active
        boolean email_verified
        timestamp created_at
    }

    Role {
        int id PK
        string name
        int level
        json permissions
    }

    UserRole {
        int user_id FK
        int role_id FK
    }

    Store ||--o{ User : "tiene"
    User ||--o{ UserRole : "tiene"
    Role ||--o{ UserRole : "asignado a"
    Store ||--|| User : "owner"
```

---

## 3. Diagrama ER — Catálogo

```mermaid
erDiagram
    Store {
        int id PK
        string name
    }

    Product {
        int id PK
        int store_id FK
        string name
        string sku
        string slug
        text description
        decimal price
        int stock
        int category_id FK
        string image_url
        boolean is_active
        timestamp created_at
    }

    Category {
        int id PK
        int store_id FK
        string name
        string slug
        int parent_id FK
    }

    Certification {
        int id PK
        string name
        string issuer
        string description
        string badge_url
    }

    ProductCertification {
        int product_id FK
        int certification_id FK
        date issued_at
        date expires_at
    }

    SustainabilityMetric {
        int id PK
        int product_id FK
        decimal carbon_footprint
        decimal recyclability_score
        decimal eco_score
        string materials
        timestamp updated_at
    }

    Supplier {
        int id PK
        int store_id FK
        string name
        string contact_email
        boolean is_sustainable
    }

    Store ||--o{ Product : "tiene"
    Store ||--o{ Category : "tiene"
    Category ||--o{ Product : "clasifica"
    Product ||--o{ ProductCertification : "tiene"
    Certification ||--o{ ProductCertification : "asignada a"
    Product ||--o| SustainabilityMetric : "tiene"
    Supplier ||--o{ Product : "suministra"
```

---

## 4. Diagrama ER — Pedidos y pagos

```mermaid
erDiagram
    Customer {
        int id PK
        int store_id FK
        int user_id FK
        string email
        string first_name
        string last_name
        string phone
        text address
        timestamp created_at
    }

    Order {
        int id PK
        int store_id FK
        int customer_id FK
        string order_number
        string status
        decimal total_amount
        decimal tax_amount
        string payment_status
        string stripe_payment_intent_id
        timestamp created_at
    }

    OrderItem {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }

    Invoice {
        int id PK
        int store_id FK
        int order_id FK
        string invoice_number
        decimal total
        string status
        timestamp issued_at
    }

    InvoiceItem {
        int id PK
        int invoice_id FK
        string description
        int quantity
        decimal unit_price
    }

    Transaction {
        int id PK
        int store_id FK
        int order_id FK
        string stripe_payment_intent_id
        decimal amount
        string currency
        string status
        timestamp created_at
    }

    PaymentRecord {
        int id PK
        int transaction_id FK
        string provider
        string provider_reference
        decimal amount
        string status
    }

    StripeEvent {
        int id PK
        string stripe_event_id
        string event_type
        json payload
        boolean processed
        timestamp received_at
    }

    Cart {
        int id PK
        int store_id FK
        int user_id FK
        string session_id
        timestamp updated_at
    }

    CartItem {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity
    }

    Customer ||--o{ Order : "realiza"
    Order ||--o{ OrderItem : "contiene"
    Order ||--o| Invoice : "genera"
    Invoice ||--o{ InvoiceItem : "contiene"
    Order ||--o{ Transaction : "tiene"
    Transaction ||--o| PaymentRecord : "registra"
    Cart ||--o{ CartItem : "contiene"
```

---

## 5. Diagrama ER — Soporte y notificaciones

```mermaid
erDiagram
    Report {
        int id PK
        int store_id FK
        int user_id FK
        string title
        string type
        string status
        text content
        timestamp created_at
    }

    ReportComment {
        int id PK
        int report_id FK
        int user_id FK
        text content
        timestamp created_at
    }

    SupportTicket {
        int id PK
        int store_id FK
        int customer_id FK
        string subject
        string status
        string priority
        text description
        timestamp created_at
    }

    Notification {
        int id PK
        int user_id FK
        string type
        string title
        text message
        boolean is_read
        timestamp created_at
    }

    AuditLog {
        int id PK
        int user_id FK
        int store_id FK
        string action
        string resource
        string resource_id
        json metadata
        string ip_address
        timestamp created_at
    }

    ProvisioningJob {
        int id PK
        int store_id FK
        string status
        string job_type
        json config
        text error
        timestamp started_at
        timestamp completed_at
    }

    Report ||--o{ ReportComment : "tiene"
    SupportTicket ||--o{ Notification : "genera"
```

---

## 6. Constraints de multi-tenancy relevantes

Todos los modelos principales tienen `store_id` como clave foránea obligatoria. Además se han añadido índices de unicidad por tenant:

| Modelo | Unicidades por tenant |
|--------|----------------------|
| `Product` | `(store_id, sku)`, `(store_id, slug)` |
| `Order` | `(store_id, order_number)` |
| `Customer` | `(store_id, email)`, `(store_id, code)` |
| `Category` | `(store_id, slug)`, `(store_id, name)` |

Estos constraints garantizan que no pueden existir dos SKUs iguales dentro de la misma tienda, pero sí entre tiendas distintas.

---

## 7. Configuración de base de datos por entorno

| Entorno | Motor | Configuración |
|---------|-------|--------------|
| Producción | PostgreSQL | `DATABASE_URL` en `.env` |
| Tests | MySQL | Config en `backend/src/config/database.js` |
| Tests (fallback) | SQLite | Automático si MySQL no disponible |

Ver `backend/src/config/database.js` y `backend/.env.example` para detalles.
