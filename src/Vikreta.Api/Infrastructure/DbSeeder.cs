using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (db.Database.IsSqlite())
        {
            await db.Database.EnsureCreatedAsync();
        }
        else
        {
            await db.Database.MigrateAsync();
        }

        if (await db.Tenants.AnyAsync()) return; // already seeded

        // ── Tenant ─────────────────────────────────────────────────────────
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "Demo Coffee",
            Slug = "demo",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        db.Tenants.Add(tenant);

        // ── Locations ──────────────────────────────────────────────────────
        var downtown = new Location
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            Name = "Downtown Store", Address = "123 Main St", TimeZone = "Asia/Kolkata"
        };
        var riverside = new Location
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            Name = "Riverside Store", Address = "456 River Rd", TimeZone = "Asia/Kolkata"
        };
        db.Locations.AddRange(downtown, riverside);

        // ── Users ──────────────────────────────────────────────────────────
        var owner = new User
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            Email = "owner@demo.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Alex", LastName = "Owner",
            Role = UserRole.Owner, CreatedAt = DateTime.UtcNow
        };
        var manager = new User
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            Email = "manager@demo.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Sam", LastName = "Manager",
            Role = UserRole.Manager, LocationId = downtown.Id, CreatedAt = DateTime.UtcNow
        };
        var cashier = new User
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            Email = "cashier@demo.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Jamie", LastName = "Cashier",
            Role = UserRole.Cashier, LocationId = downtown.Id, CreatedAt = DateTime.UtcNow
        };
        db.Users.AddRange(owner, manager, cashier);

        // ── Categories ─────────────────────────────────────────────────────
        var drinks = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Drinks", ColorHex = "#1D7874" };
        var bakery = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Bakery", ColorHex = "#E8A33D" };
        var retail = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Retail", ColorHex = "#6B4E71" };
        var merch = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Merch", ColorHex = "#C8443C" };
        db.Categories.AddRange(drinks, bakery, retail, merch);

        // ── Products ───────────────────────────────────────────────────────
        var products = new List<Product>
        {
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DRK-001", Barcode = "001", Name = "Latte, 12oz", CategoryId = drinks.Id, DefaultPrice = 4.50m, DefaultCost = 1.20m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DRK-002", Barcode = "002", Name = "Cold Brew, 16oz", CategoryId = drinks.Id, DefaultPrice = 4.75m, DefaultCost = 1.00m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DRK-003", Barcode = "003", Name = "Drip Coffee", CategoryId = drinks.Id, DefaultPrice = 3.00m, DefaultCost = 0.50m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DRK-004", Barcode = "004", Name = "Matcha Latte", CategoryId = drinks.Id, DefaultPrice = 5.25m, DefaultCost = 1.50m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BAK-001", Barcode = "005", Name = "Bagel, Plain", CategoryId = bakery.Id, DefaultPrice = 3.25m, DefaultCost = 0.80m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BAK-002", Barcode = "006", Name = "Cinnamon Roll", CategoryId = bakery.Id, DefaultPrice = 4.00m, DefaultCost = 1.00m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BAK-003", Barcode = "007", Name = "Croissant", CategoryId = bakery.Id, DefaultPrice = 3.75m, DefaultCost = 0.90m, TaxRate = 0.05m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "RET-001", Barcode = "008", Name = "Espresso Beans 1kg", CategoryId = retail.Id, DefaultPrice = 18.00m, DefaultCost = 9.00m, TaxRate = 0.08m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "RET-002", Barcode = "009", Name = "Oat Milk, Qt", CategoryId = retail.Id, DefaultPrice = 5.50m, DefaultCost = 2.50m, TaxRate = 0.08m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MER-001", Barcode = "010", Name = "Ceramic Mug", CategoryId = merch.Id, DefaultPrice = 14.00m, DefaultCost = 5.00m, TaxRate = 0.08m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MER-002", Barcode = "011", Name = "Tote Bag", CategoryId = merch.Id, DefaultPrice = 12.00m, DefaultCost = 4.00m, TaxRate = 0.08m, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MER-003", Barcode = "012", Name = "Gift Card $25", CategoryId = merch.Id, DefaultPrice = 25.00m, DefaultCost = 25.00m, TaxRate = 0.00m, TracksInventory = false, CreatedAt = DateTime.UtcNow },
        };
        db.Products.AddRange(products);

        // ── Stock Items (seed starting quantities) ─────────────────────────
        var stockItems = new List<StockItem>();
        foreach (var product in products.Where(p => p.TracksInventory))
        {
            stockItems.Add(new StockItem
            {
                Id = Guid.NewGuid(), LocationId = downtown.Id,
                ProductId = product.Id, QuantityOnHand = 20, ReorderPoint = 5, ReorderQuantity = 25
            });
            stockItems.Add(new StockItem
            {
                Id = Guid.NewGuid(), LocationId = riverside.Id,
                ProductId = product.Id, QuantityOnHand = 15, ReorderPoint = 5, ReorderQuantity = 20
            });
        }
        db.StockItems.AddRange(stockItems);

        // ── Tenant Settings ─────────────────────────────────────────────────
        db.TenantSettings.Add(new TenantSettings
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            DefaultTaxRate = 0.05m, CurrencyCode = "USD",
            ReceiptHeader = "Demo Coffee", ReceiptFooter = "Thank you for visiting!"
        });

        await db.SaveChangesAsync();
    }
}
