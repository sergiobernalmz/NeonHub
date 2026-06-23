# 🔌 NeonHub Integration API Documentation

Welcome to the NeonHub API. This documentation is intended for developers who want to integrate external e-commerce platforms (Shopify, WooCommerce, Custom) with the NeonHub Dashboard.

## Authentication

All requests to the Ingest API must be authenticated using your store's **API Key**. 
You can find your API Keys in the Dashboard under *Settings > Integrations*.

**Header:**
`X-NeonHub-Api-Key: sk_live_51Mz...`

---

## 📦 Products API

### Ingest/Sync a Product
Creates or updates a product in NeonHub based on text SKU match.

**Endpoint:**
`POST /api/ingest/products`

**Payload:**
```json
{
  "sku": "TSHIRT-BLK-L",
  "name": "Neon T-Shirt (Black/L)",
  "price": 29.99,
  "cost_price": 10.00,
  "stock_quantity": 100,
  "description": "Premium cotton t-shirt",
  "is_active": true
}
```

**Response (200 OK / 201 Created):**
```json
{
  "status": "success",
  "action": "created",
  "id": "uuid-of-product",
  "sku": "TSHIRT-BLK-L"
}
```

---

## 🛒 Orders API

### Ingest an Order
Push a new order from your system to NeonHub.

**Endpoint:**
`POST /api/ingest/orders`

**Payload:**
```json
{
  "order_number": "#1001",
  "status": "paid",
  "total_amount": 59.98,
  "customer": {
    "email": "juan@example.com",
    "first_name": "Juan",
    "last_name": "Perez"
  },
  "items": [
    {
      "sku": "TSHIRT-BLK-L",
      "quantity": 2,
      "price": 29.99,
      "name": "Neon T-Shirt"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "id": "uuid-of-order",
  "order_number": "#1001"
}
```

---

## 🐛 Error Handling

| Code | Meaning |
| :--- | :--- |
| 400 | Bad Request (Missing fields, invalid JSON) |
| 401 | Unauthorized (Invalid API Key) |
| 500 | Internal Server Error |
