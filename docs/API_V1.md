# NeonHub Public API — v1

Base URL: `https://api.neonhub.es/api/v1`

## Autenticación

Todas las peticiones requieren la cabecera:

```
X-NeonHub-Api-Key: <tu_api_key_secreta>
```

La API key se obtiene en el panel de administración → Configuración → API Keys.

**Rate limit:** 1 000 peticiones / hora por API key. La respuesta incluye las cabeceras estándar `RateLimit-*`.

---

## Endpoints

### Info

#### `GET /api/v1/`
Devuelve información de la tienda autenticada y el mapa de endpoints disponibles.

---

### Productos

#### `GET /api/v1/products`
Lista productos con paginación.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | int | 1 | Página |
| `limit` | int | 50 | Máximo 100 |
| `search` | string | — | Busca en nombre, descripción y SKU |
| `category_id` | UUID | — | Filtra por categoría |
| `in_stock` | boolean | — | `true` devuelve solo productos con stock > 0 |
| `sort` | string | `created_at` | Campo de orden: `name`, `price`, `stock`, `created_at` |
| `order` | string | `desc` | `asc` o `desc` |

**Respuesta**
```json
{
  "success": true,
  "data": [ { ...producto } ],
  "pagination": { "total": 120, "page": 1, "limit": 50, "pages": 3 }
}
```

#### `GET /api/v1/products/:id`
Devuelve un producto por su UUID.

#### `POST /api/v1/products`
Crea un producto.

**Body**
```json
{
  "name": "Camiseta XL",
  "sku": "CAM-XL-001",
  "price": 19.99,
  "stock": 50,
  "description": "Camiseta de algodón talla XL",
  "category_id": "uuid-opcional",
  "images": ["https://..."],
  "track_inventory": true
}
```

- `name` y `price` son obligatorios.
- Si `sku` ya existe en la tienda → `409 Conflict`.

#### `PUT /api/v1/products/:id`
Actualiza campos del producto. Solo se aplican los campos enviados (patch semántico).

Campos permitidos: `name`, `description`, `price`, `compare_at_price`, `stock`, `images`, `category_id`, `sku`.

#### `DELETE /api/v1/products/:id`
Soft-delete del producto.

---

### Pedidos

#### `GET /api/v1/orders/stats`
Estadísticas agregadas de la tienda.

**Query params:** `from` y `to` (fechas ISO 8601, opcional).

**Respuesta**
```json
{
  "success": true,
  "data": {
    "total_orders": 340,
    "total_revenue": 12450.00,
    "average_order_value": 36.62,
    "by_status": { "confirmed": 200, "shipped": 100, "delivered": 40 }
  }
}
```

#### `GET /api/v1/orders`
Lista pedidos con paginación.

**Query params**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | int | 1 | Página |
| `limit` | int | 50 | Máximo 100 |
| `status` | string | — | Filtra por estado |
| `from` | ISO date | — | Fecha mínima de creación |
| `to` | ISO date | — | Fecha máxima de creación |
| `sort` | string | `created_at` | Campo de orden |
| `order` | string | `desc` | `asc` o `desc` |

**Estados válidos:** `draft`, `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`, `completed`

#### `GET /api/v1/orders/:id`
Devuelve un pedido con sus líneas e información del cliente.

#### `POST /api/v1/orders`
Crea un pedido externo (integración Shopify, WooCommerce, etc.).

**Body**
```json
{
  "customer_email": "cliente@ejemplo.com",
  "customer_name": "Ana García",
  "items": [
    {
      "sku": "CAM-XL-001",
      "name": "Camiseta XL",
      "quantity": 2,
      "unit_price": 19.99
    }
  ],
  "total_amount": 39.98,
  "shipping_amount": 0,
  "tax_amount": 0,
  "external_id": "shopify-order-5001",
  "source_platform": "shopify",
  "payment_method": "card",
  "notes": "Enviar antes del viernes"
}
```

- `items` es obligatorio y debe tener al menos un elemento.
- Si `external_id` ya existe en la tienda → `409 Conflict` con `existing_id`.
- El cliente se crea automáticamente si no existe (por email).
- Los ítems se pueden referenciar por `product_id` (UUID) o por `sku`.
- Si el producto tiene `track_inventory = true`, el stock se descuenta automáticamente.

**Respuesta**
```json
{ "success": true, "data": { "id": "uuid", "order_number": "ORD-0001" } }
```

#### `PATCH /api/v1/orders/:id/status`
Actualiza el estado de un pedido.

**Body**
```json
{ "status": "shipped" }
```

---

### Clientes

#### `GET /api/v1/customers`
Lista clientes con paginación.

**Query params:** `page`, `limit`, `search` (email, nombre o apellido).

#### `GET /api/v1/customers/:id`
Devuelve un cliente con su historial de pedidos.

---

## Códigos de error

| Código HTTP | Significado |
|---|---|
| `400` | Parámetros inválidos o cuerpo mal formado |
| `401` | API key ausente o inválida |
| `404` | Recurso no encontrado |
| `409` | Conflicto (SKU duplicado, `external_id` duplicado) |
| `429` | Rate limit superado |
| `500` | Error interno del servidor |

Todos los errores siguen el formato:
```json
{ "success": false, "error": "Descripción del error" }
```

---

## Ejemplos rápidos

```bash
# Listar productos
curl -H "X-NeonHub-Api-Key: sk_live_..." \
  https://api.neonhub.es/api/v1/products

# Crear pedido externo
curl -X POST \
  -H "X-NeonHub-Api-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"CAM-XL","quantity":1,"unit_price":19.99}],"customer_email":"test@test.com","external_id":"ext-123","source_platform":"shopify"}' \
  https://api.neonhub.es/api/v1/orders

# Actualizar estado
curl -X PATCH \
  -H "X-NeonHub-Api-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  https://api.neonhub.es/api/v1/orders/<id>/status
```
