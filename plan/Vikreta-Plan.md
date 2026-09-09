# Billing & Inventory App — Technical Plan
# App name: Vikreta

Stack: React + Vite + TypeScript + Tailwind (frontend) · ASP.NET Core 8 Web  API + EF Core (backend) · Multi-tenant, multi-location retail

---

## 1. EF Core Entity Models

```csharp
// ---------- Tenancy ----------
public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Slug { get; set; }          // used for subdomain/tenant resolution
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }

    public ICollection<Location> Locations { get; set; }
    public ICollection<User> Users { get; set; }
}

public class Location
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; }
    public string Address { get; set; }
    public string TimeZone { get; set; }
    public bool IsActive { get; set; }

    public Tenant Tenant { get; set; }
    public ICollection<StockItem> StockItems { get; set; }
    public ICollection<Invoice> Invoices { get; set; }
}

public class User
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? LocationId { get; set; }      // null = access to all locations
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public string Role { get; set; }           // Owner, Manager, Cashier
}

// ---------- Catalog ----------
public class Product
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Sku { get; set; }
    public string Barcode { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public Guid? CategoryId { get; set; }
    public string UnitOfMeasure { get; set; }  // each, kg, box...
    public decimal DefaultPrice { get; set; }
    public decimal DefaultCost { get; set; }
    public decimal TaxRate { get; set; }
    public bool TracksInventory { get; set; }
    public bool IsActive { get; set; }

    public Category Category { get; set; }
    public ICollection<ProductVariant> Variants { get; set; }
}

public class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string VariantSku { get; set; }
    public string AttributeSummary { get; set; } // "Red / Large"
    public decimal? PriceOverride { get; set; }

    public Product Product { get; set; }
}

public class Category
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; }
    public Guid? ParentCategoryId { get; set; }
}

// ---------- Inventory ----------
public class StockItem
{
    public Guid Id { get; set; }
    public Guid LocationId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int QuantityOnHand { get; set; }
    public int ReorderPoint { get; set; }
    public int ReorderQuantity { get; set; }

    public Location Location { get; set; }
    public Product Product { get; set; }
}

// Append-only ledger — the single source of truth for stock movement.
// QuantityOnHand on StockItem is a cached projection, rebuildable from this table.
public class InventoryTransaction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int QuantityChange { get; set; }     // positive or negative
    public InventoryTransactionType Type { get; set; } // Sale, Purchase, Adjustment, TransferIn, TransferOut
    public Guid? ReferenceId { get; set; }      // InvoiceId, PurchaseOrderId, TransferId
    public string Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
}

public enum InventoryTransactionType
{
    Sale, Purchase, AdjustmentIncrease, AdjustmentDecrease, TransferIn, TransferOut
}

public class StockTransfer
{
    public Guid Id { get; set; }
    public Guid FromLocationId { get; set; }
    public Guid ToLocationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; }          // Pending, InTransit, Received
    public ICollection<StockTransferLine> Lines { get; set; }
}

public class StockTransferLine
{
    public Guid Id { get; set; }
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; }
}

// ---------- Billing ----------
public class Invoice
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid? CustomerId { get; set; }
    public string InvoiceNumber { get; set; }
    public DateTime IssuedAt { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public string Status { get; set; }          // Draft, Paid, PartiallyPaid, Void, Refunded

    public ICollection<InvoiceLine> Lines { get; set; }
    public ICollection<Payment> Payments { get; set; }
}

// Snapshots price/tax at time of sale — never re-reads live Product pricing
public class InvoiceLine
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal TaxRateSnapshot { get; set; }
    public decimal LineDiscount { get; set; }
    public decimal LineTotal { get; set; }
}

public class Payment
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; }          // Cash, Card, Other
    public DateTime PaidAt { get; set; }
    public string ReferenceNumber { get; set; }
}

// ---------- Customers & Suppliers ----------
public class Customer
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public decimal StoreCreditBalance { get; set; }
}

public class Supplier
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; }
    public string ContactInfo { get; set; }
}

public class PurchaseOrder
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid SupplierId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public string Status { get; set; }          // Draft, Ordered, PartiallyReceived, Received

    public ICollection<PurchaseOrderLine> Lines { get; set; }
}

public class PurchaseOrderLine
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int QuantityOrdered { get; set; }
    public int QuantityReceived { get; set; }
    public decimal UnitCost { get; set; }
}
```

**Key design notes**
- `TenantMiddleware` (reuse the pattern from Chip and Chill) resolves `TenantId` per request and EF Core global query filters scope every entity automatically.
- `InventoryTransaction` is append-only and is the only thing allowed to change `StockItem.QuantityOnHand` — do it via a domain service, never directly from a controller.
- `InvoiceLine` snapshots price/tax/name so historical invoices stay accurate even if a product is later repriced or renamed.

---

## 2. Controller Structure

```
AuthController          POST /api/auth/login, /api/auth/refresh
TenantsController        GET/POST /api/tenants, GET /api/tenants/{id}
LocationsController       CRUD /api/locations

ProductsController        CRUD /api/products, GET /api/products/{id}/variants
CategoriesController      CRUD /api/categories

StockController            GET  /api/stock?locationId=
                            GET  /api/stock/{productId}
                            POST /api/stock/adjust        (manual adjustment)
StockTransfersController   POST /api/stock-transfers
                            POST /api/stock-transfers/{id}/receive

InvoicesController          POST /api/invoices               (create + auto stock deduction)
                            GET  /api/invoices/{id}
                            POST /api/invoices/{id}/payments
                            POST /api/invoices/{id}/void

CustomersController        CRUD /api/customers
SuppliersController        CRUD /api/suppliers
PurchaseOrdersController    POST /api/purchase-orders
                            POST /api/purchase-orders/{id}/receive   (auto stock increase)

ReportsController           GET /api/reports/sales
                            GET /api/reports/stock-valuation
                            GET /api/reports/top-products
                            GET /api/reports/tax-summary
```

Controllers stay thin — `InvoicesController.Create` and `PurchaseOrdersController.Receive` both delegate stock changes to a shared `IInventoryService.RecordTransactionAsync(...)`, so the ledger logic lives in one place.

---





## 3. Module & Page Breakdown

### Module 1 — Auth & Shell
| Page | Route | Key Components | Notes |
|---|---|---|---|
| Login | `/login` | LoginForm | Tenant resolved from subdomain or entered slug |
| Forgot Password | `/forgot-password` | ResetForm | Email-based reset flow |
| App Shell | (layout) | Sidebar, TopBar, LocationSwitcher, UserMenu | LocationSwitcher scopes all data views to selected location |

### Module 2 — Dashboard
| Page | Route | Key Components |
|---|---|---|
| Overview | `/` | SalesTodayCard, LowStockAlertList, RecentInvoicesTable, QuickActions |

### Module 3 — Catalog
| Page | Route | Key Components |
|---|---|---|
| Product List | `/products` | ProductTable, SearchBar, CategoryFilter, BarcodeQuickAdd |
| Product Detail/Edit | `/products/:id` | ProductForm, VariantEditor, PricingFields, TaxRateField |
| New Product | `/products/new` | ProductForm |
| Category Manager | `/categories` | CategoryTree, CategoryForm |

### Module 4 — Inventory
| Page | Route | Key Components |
|---|---|---|
| Stock Levels | `/inventory` | StockTable (per location), ReorderBadge, ExportButton |
| Stock Adjustment | `/inventory/adjust` | AdjustmentForm (reason codes: damage, count correction, etc.) |
| Transfer List | `/inventory/transfers` | TransferTable, StatusBadge |
| New Transfer | `/inventory/transfers/new` | TransferForm, ProductPicker |
| Receive Transfer | `/inventory/transfers/:id/receive` | ReceiveLineTable |

### Module 5 — Billing / POS
| Page | Route | Key Components |
|---|---|---|
| POS Screen | `/pos` | ProductGrid, Cart, CustomerLookup, PaymentPanel, ReceiptPreview |
| Invoice List | `/invoices` | InvoiceTable, StatusFilter, DateRangeFilter |
| Invoice Detail | `/invoices/:id` | InvoiceLinesTable, PaymentHistory, VoidRefundActions |

### Module 6 — Customers
| Page | Route | Key Components |
|---|---|---|
| Customer List | `/customers` | CustomerTable, SearchBar |
| Customer Detail | `/customers/:id` | ProfileCard, PurchaseHistoryTable, StoreCreditPanel |

### Module 7 — Suppliers & Purchasing
| Page | Route | Key Components |
|---|---|---|
| Supplier List | `/suppliers` | SupplierTable |
| Supplier Detail | `/suppliers/:id` | SupplierForm, POHistoryTable |
| Purchase Order List | `/purchase-orders` | POTable, StatusFilter |
| New Purchase Order | `/purchase-orders/new` | POForm, ProductPicker |
| Receive PO | `/purchase-orders/:id/receive` | ReceiveLineTable (partial receiving supported) |

### Module 8 — Reports
| Page | Route | Key Components |
|---|---|---|
| Sales Report | `/reports/sales` | DateRangePicker, SalesChart, LocationBreakdownTable |
| Stock Valuation | `/reports/stock-valuation` | ValuationTable, LocationFilter |
| Top Products | `/reports/top-products` | RankedTable, PeriodSelector |
| Tax Summary | `/reports/tax-summary` | TaxTable, DateRangePicker |

### Module 9 — Admin
| Page | Route | Key Components |
|---|---|---|
| Locations | `/admin/locations` | LocationTable, LocationForm |
| Users & Roles | `/admin/users` | UserTable, RoleAssignment |
| Tenant Settings | `/admin/settings` | TenantSettingsForm (tax defaults, receipt branding) |

**Total: 22 pages** across 9 modules.

---

## 4. Shared Component Library (build once, reuse everywhere)

- `DataTable` — sortable/filterable, used by every list page
- `ProductPicker` — searchable product+variant selector, used in POS, Transfers, PO
- `LocationSwitcher` — global location context
- `MoneyInput`, `QuantityStepper` — consistent numeric entry
- `StatusBadge` — invoice/PO/transfer status coloring
- `DateRangePicker` — reports + invoice filters
- `ConfirmDialog` — used for void/delete/adjust actions
- `Toast` — success/error feedback

Building these first avoids rebuilding the same table/picker logic 9 times.

---

## 5. Build Order & Phasing

**Phase 1 — Foundation**
1. App shell (routing, layout, auth guard, LocationSwitcher)
2. Shared component library
3. Login / Forgot Password

**Phase 2 — Catalog (no dependencies)**
4. Product List / Detail / New
5. Category Manager

**Phase 3 — Inventory (depends on Catalog)**
6. Stock Levels
7. Stock Adjustment
8. Transfers (List, New, Receive)

**Phase 4 — Billing (depends on Catalog + Inventory)**
9. POS Screen
10. Invoice List / Detail

**Phase 5 — Customers & Suppliers**
11. Customer List / Detail
12. Supplier List / Detail
13. Purchase Orders (List, New, Receive)

**Phase 6 — Reports & Admin (depends on real transactional data existing)**
14. Dashboard Overview
15. All 4 report pages
16. Admin (Locations, Users, Tenant Settings)

This mirrors the backend build order — each frontend phase lines up with the controllers that need to exist first.

---

## 5. Build Checklist

- [ ] App shell + routing + auth guard
- [ ] Shared component library (8 components above)
- [ ] Login / Forgot Password
- [ ] Product List
- [ ] Product Detail/Edit + New
- [ ] Category Manager
- [ ] Stock Levels
- [ ] Stock Adjustment
- [ ] Transfer List / New / Receive
- [ ] POS Screen
- [ ] Invoice List / Detail
- [ ] Customer List / Detail
- [ ] Supplier List / Detail
- [ ] Purchase Order List / New / Receive
- [ ] Dashboard Overview
- [ ] Sales Report
- [ ] Stock Valuation Report
- [ ] Top Products Report
- [ ] Tax Summary Report
- [ ] Admin: Locations
- [ ] Admin: Users & Roles
- [ ] Admin: Tenant Settings

## 6. Open Gaps / Decisions Needed Later

- Receipt printing target (thermal printer vs. browser print vs. PDF)
- Whether POS needs offline support
- Barcode scanner input method (USB HID vs. camera-based)
- Multi-currency support or single-currency only