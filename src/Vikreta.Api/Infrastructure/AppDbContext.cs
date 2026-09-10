using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;

namespace Vikreta.Api.Infrastructure;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    // Tenancy
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<User> Users => Set<User>();

    // Catalog
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    // Inventory
    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferLine> StockTransferLines => Set<StockTransferLine>();

    // Billing
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Payment> Payments => Set<Payment>();

    // CRM
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();

    // Batches
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();

    // Settings
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Global query filters (multi-tenant isolation) ──────────────────
        modelBuilder.Entity<Location>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<User>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Category>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Product>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<InventoryTransaction>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<StockTransfer>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Invoice>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Customer>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<ProductBatch>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<TenantSettings>().HasQueryFilter(e => _tenantContext.TenantId == Guid.Empty || e.TenantId == _tenantContext.TenantId);

        // ── Decimal precision ──────────────────────────────────────────────
        foreach (var property in modelBuilder.Model.GetEntityTypes()
            .SelectMany(t => t.GetProperties())
            .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetColumnType("decimal(18,4)");
        }

        // ── Indexes ────────────────────────────────────────────────────────
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.TenantId, i.LocationId, i.IssuedAt });
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.CustomerId)
            .HasFilter("CustomerId IS NOT NULL");
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.InvoiceNumber)
            .IsUnique();

        modelBuilder.Entity<StockItem>()
            .HasIndex(s => new { s.LocationId, s.ProductId, s.VariantId })
            .IsUnique();

        modelBuilder.Entity<InventoryTransaction>()
            .HasIndex(t => new { t.TenantId, t.LocationId, t.CreatedAt });

        modelBuilder.Entity<Product>()
            .HasIndex(p => new { p.TenantId, p.Sku })
            .IsUnique();
        modelBuilder.Entity<Product>()
            .HasIndex(p => new { p.TenantId, p.Barcode })
            .HasFilter("Barcode IS NOT NULL AND Barcode != ''");

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.TenantId, u.Email })
            .IsUnique();

        // ── Explicit foreign keys ──────────────────────────────────────────
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.CreatedBy)
            .WithMany()
            .HasForeignKey(i => i.CreatedByUserId);

        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId);

        modelBuilder.Entity<PurchaseOrder>()
            .HasOne(po => po.CreatedBy)
            .WithMany()
            .HasForeignKey(po => po.CreatedByUserId);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(st => st.CreatedBy)
            .WithMany()
            .HasForeignKey(st => st.CreatedByUserId);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.FromLocation)
            .WithMany()
            .HasForeignKey(t => t.FromLocationId);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.ToLocation)
            .WithMany()
            .HasForeignKey(t => t.ToLocationId);

        modelBuilder.Entity<Category>()
            .HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentCategoryId);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Location)
            .WithMany()
            .HasForeignKey(u => u.LocationId);

        // ── Default all foreign keys to Restrict to prevent SQL Server cascade path cycles ──
        foreach (var foreignKey in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // ── Direct aggregate child cascades ──────────────────────────────────
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(l => l.Invoice)
            .WithMany(i => i.Lines)
            .HasForeignKey(l => l.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Invoice)
            .WithMany(i => i.Payments)
            .HasForeignKey(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PurchaseOrderLine>()
            .HasOne(l => l.PurchaseOrder)
            .WithMany(po => po.Lines)
            .HasForeignKey(l => l.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockTransferLine>()
            .HasOne(l => l.StockTransfer)
            .WithMany(st => st.Lines)
            .HasForeignKey(l => l.StockTransferId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductVariant>()
            .HasOne(v => v.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
