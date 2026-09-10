namespace Vikreta.Api.Domain;

// ---------- Tenancy ----------
public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty; // subdomain/tenant resolution
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<User> Users { get; set; } = new List<User>();
}

public class Location
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TimeZone { get; set; } = "UTC";
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<StockItem> StockItems { get; set; } = new List<StockItem>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class User
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid? LocationId { get; set; } // null = access to all locations
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location? Location { get; set; }
}

// ---------- Catalog ----------
public class Category
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#1D7874"; // default teal
    public Guid? ParentCategoryId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string UnitOfMeasure { get; set; } = "each";
    public decimal DefaultPrice { get; set; }
    public decimal DefaultCost { get; set; }
    public decimal TaxRate { get; set; } // e.g. 0.08 = 8%
    public bool TracksInventory { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Category? Category { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<StockItem> StockItems { get; set; } = new List<StockItem>();
}

public class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string VariantSku { get; set; } = string.Empty;
    public string AttributeSummary { get; set; } = string.Empty; // "Red / Large"
    public decimal? PriceOverride { get; set; }
    public bool IsActive { get; set; } = true;

    public Product Product { get; set; } = null!;
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

    public Location Location { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}

// Append-only ledger — single source of truth for stock movement
public class InventoryTransaction
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int QuantityChange { get; set; } // positive or negative
    public InventoryTransactionType Type { get; set; }
    public Guid? ReferenceId { get; set; } // InvoiceId, PurchaseOrderId, TransferId
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location Location { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}

public class StockTransfer
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid FromLocationId { get; set; }
    public Guid ToLocationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public StockTransferStatus Status { get; set; } = StockTransferStatus.Pending;
    public string Notes { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location FromLocation { get; set; } = null!;
    public Location ToLocation { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<StockTransferLine> Lines { get; set; } = new List<StockTransferLine>();
}

public class StockTransferLine
{
    public Guid Id { get; set; }
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; }

    public StockTransfer StockTransfer { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}

// ---------- Billing ----------
public class Invoice
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid? CustomerId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string Notes { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location Location { get; set; } = null!;
    public Customer? Customer { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

// Snapshots price/tax at time of sale — never re-reads live Product pricing
public class InvoiceLine
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string VariantAttributeSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal TaxRateSnapshot { get; set; }
    public decimal LineDiscount { get; set; }
    public decimal LineTotal { get; set; }

    public Invoice Invoice { get; set; } = null!;
    public Product Product { get; set; } = null!;
}

public class Payment
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public DateTime PaidAt { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;

    public Invoice Invoice { get; set; } = null!;
}

// ---------- Customers & Suppliers ----------
public class Customer
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal StoreCreditBalance { get; set; }
    public int LoyaltyPoints { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

public class Supplier
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class PurchaseOrder
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid SupplierId { get; set; }
    public string PoNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? OrderedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public string Notes { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location Location { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
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

    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}

// ---------- Tenant Settings ----------
public class TenantSettings
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public decimal DefaultTaxRate { get; set; } = 0.08m;
    public string CurrencyCode { get; set; } = "USD";
    public string ReceiptHeader { get; set; } = string.Empty;
    public string ReceiptFooter { get; set; } = "Thank you!";
    public string LogoUrl { get; set; } = string.Empty;
    public bool LoyaltyEnabled { get; set; } = true;
    public decimal LoyaltyPointsPerAmount { get; set; } = 100m;
    public decimal LoyaltyRedemptionRate { get; set; } = 1.0m;

    public Tenant Tenant { get; set; } = null!;
}

// ---------- Batches & Expiry ----------
public class ProductBatch
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid LocationId { get; set; }
    public Guid ProductId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufacturingDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public int QuantityOnHand { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Location Location { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
