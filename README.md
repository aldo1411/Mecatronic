# Mecatronic — AutoGestión MX

Sistema de gestión para talleres mecánicos. Permite administrar órdenes de servicio, inventario de refacciones, clientes, vehículos y cobros desde una sola plataforma.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS |
| Base de datos | Supabase (PostgreSQL 17) |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage |
| Estado servidor | TanStack Query v5 |
| Estado cliente | Zustand |
| Iconos | Lucide React |
| Lenguaje | TypeScript |

---

## Módulos

### Órdenes de servicio
- Creación de órdenes con cliente, vehículo, mecánico y descripción
- Flujo de estados: `Recibido → En proceso → Esperando refacción → Listo → Entregado`
- Cancelación de órdenes
- Carga de fotos (hasta 5 por orden)
- Historial de notas del vehículo

### Cobros (Facturación)
- Generación de cobro (invoice) a partir de una orden de servicio
- Conceptos de tipo **servicio** (del catálogo) y **refacción** (del inventario o pedido especial)
- Registro de pagos parciales o totales (efectivo, SPEI, tarjeta)
- Generación de recibo PDF
- La entrega de la OS solo se permite cuando el cobro está liquidado

### Inventario
- Catálogo de refacciones con SKU, unidad y precio de venta
- Entradas de inventario con costo promedio
- Ajustes de inventario (merma, robo, conteo físico, etc.)
- Alertas de stock mínimo
- Valuación del inventario
- Gestión de proveedores

### Clientes
- Registro de clientes con RFC
- Historial de vehículos y órdenes de servicio por cliente

### Catálogo de servicios
- Servicios con precio default y tasa de IVA configurables por taller

### Caja diaria
- Resumen de cobros del día por método de pago

---

## Estructura del proyecto

```
mecatronic-app/
├── app/
│   ├── (auth)/          # Login, selección de taller
│   └── (dashboard)/     # Módulos principales
│       ├── billing/     # Cobros
│       ├── clients/     # Clientes
│       ├── inventory/   # Inventario
│       ├── service-orders/  # Órdenes de servicio
│       └── settings/    # Configuración
├── components/
│   ├── layout/          # Sidebar, Topbar
│   └── shared/          # Toast, Loader, Badges, Pagination
├── hooks/               # TanStack Query hooks
├── services/            # Llamadas a Supabase
├── stores/              # Estado global (Zustand)
├── types/               # Tipos TypeScript + tipos generados de Supabase
└── lib/
    └── supabase/        # Cliente y servidor de Supabase
```

---

## Base de datos

Las migraciones viven en Supabase. Las principales entidades son:

- `work_orders` — Órdenes de servicio
- `work_order_parts` — Refacciones/servicios asociados a una OS
- `invoices` — Cobros (1 activo por OS máximo)
- `invoice_items` — Conceptos del cobro
- `payments` — Pagos registrados contra un cobro
- `parts` — Catálogo de refacciones
- `inventory_stock` — Stock actual por taller
- `inventory_entries` — Entradas al inventario
- `inventory_adjustments` — Ajustes de inventario
- `service_catalog` — Catálogo de servicios del taller
- `profiles` — Usuarios / clientes
- `vehicles` — Vehículos
- `workshops` — Talleres

### RPCs principales

| Función | Descripción |
|---|---|
| `generate_folio` | Genera folio único por taller y tipo |
| `register_payment` | Registra pago y actualiza estado del cobro atómicamente |
| `add_invoice_item` | Agrega concepto al cobro y descuenta stock si aplica |
| `delete_invoice_item` | Elimina concepto y restaura stock si aplica |
| `get_work_order_balance` | Saldo pendiente de una OS |
| `decrement_stock` | Decrementa stock de una refacción |

---

## Configuración local

### Requisitos

- Node.js 18+
- Cuenta de Supabase

### Variables de entorno

Copia `.env.local.example` a `.env.local` y completa los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Instalación

```bash
npm install
npm run dev
```

La app corre en [http://localhost:3000](http://localhost:3000).

---

## Branches

| Branch | Uso |
|---|---|
| `main` | Producción |
| `dev` | Desarrollo activo |

El flujo de trabajo es: feature branch → PR a `dev` → PR a `main`.
