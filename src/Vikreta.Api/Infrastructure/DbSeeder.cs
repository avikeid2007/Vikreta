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
        var makeup = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Makeup & Cosmetics", ColorHex = "#C8443C" };
        var skincare = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Skincare & Serums", ColorHex = "#1D7874" };
        var haircare = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Haircare", ColorHex = "#6B4E71" };
        var bodyCare = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Body & Personal Care", ColorHex = "#E8A33D" };
        var ayurvedic = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Ayurvedic & Herbal Care", ColorHex = "#2D6A4F" };
        var fragrances = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Fragrances & Deodorants", ColorHex = "#D45D79" };
        var mensGrooming = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Men's Grooming & Shaving", ColorHex = "#3D5A80" };
        var lipNails = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Lip Care & Nail Polish", ColorHex = "#A267AC" };
        var babyCare = new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = "Baby & Mother Care", ColorHex = "#F4A261" };
        db.Categories.AddRange(makeup, skincare, haircare, bodyCare, ayurvedic, fragrances, mensGrooming, lipNails, babyCare);

        // ── Products ───────────────────────────────────────────────────────
        var products = new List<Product>
        {
            // Makeup & Cosmetics
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "LAK-CC-01", Barcode = "8901030730012", Name = "Lakme 9 to 5 Complexion Care CC Cream (Beige 30g)", CategoryId = makeup.Id, DefaultPrice = 349.00m, DefaultCost = 255.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MAY-KJ-01", Barcode = "8901526401019", Name = "Maybelline New York Colossal Kajal (Black 0.35g)", CategoryId = makeup.Id, DefaultPrice = 199.00m, DefaultCost = 135.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MAY-FM-128", Barcode = "8901526002100", Name = "Maybelline Fit Me Matte + Poreless Foundation (Warm Nude 128, 30ml)", CategoryId = makeup.Id, DefaultPrice = 599.00m, DefaultCost = 410.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "SUG-LIP-01", Barcode = "8904320701021", Name = "Sugar Cosmetics Matte As Hell Crayon Lipstick (01 Scarlett O'Hara)", CategoryId = makeup.Id, DefaultPrice = 799.00m, DefaultCost = 550.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "SWB-CON-02", Barcode = "8904382500013", Name = "Swiss Beauty Liquid Concealer (02 Sand Sable 6ml)", CategoryId = makeup.Id, DefaultPrice = 249.00m, DefaultCost = 160.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "LAK-EYE-01", Barcode = "8901030800029", Name = "Lakme Eyeconic Liquid Eyeliner (Deep Black 4.5ml)", CategoryId = makeup.Id, DefaultPrice = 260.00m, DefaultCost = 185.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "INS-PRM-01", Barcode = "8906080601054", Name = "Insight Cosmetics 3-in-1 Long Lasting Primer (30ml)", CategoryId = makeup.Id, DefaultPrice = 280.00m, DefaultCost = 190.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Skincare & Serums
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "HIM-FW-150", Barcode = "8901138820011", Name = "Himalaya Purifying Neem Face Wash (150ml)", CategoryId = skincare.Id, DefaultPrice = 195.00m, DefaultCost = 140.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "PND-GEL-100", Barcode = "8901030700039", Name = "Pond's Super Light Gel Oil-Free Moisturizer (100g)", CategoryId = skincare.Id, DefaultPrice = 280.00m, DefaultCost = 195.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "LAK-PM-150", Barcode = "8901030600049", Name = "Lakme Peach Milk Soft Creme Moisturizer (150g)", CategoryId = skincare.Id, DefaultPrice = 250.00m, DefaultCost = 175.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MIN-NIA-30", Barcode = "8906128100013", Name = "Minimalist 10% Niacinamide Face Serum (30ml)", CategoryId = skincare.Id, DefaultPrice = 599.00m, DefaultCost = 420.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "PLM-TON-200", Barcode = "8906118410014", Name = "Plum Green Tea Alcohol-Free Toner (200ml)", CategoryId = skincare.Id, DefaultPrice = 390.00m, DefaultCost = 275.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BIO-DAN-40", Barcode = "8906009450012", Name = "Biotique Bio Dandelion Visibly Ageless Serum (40ml)", CategoryId = skincare.Id, DefaultPrice = 230.00m, DefaultCost = 160.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DER-SUN-50", Barcode = "8906087771239", Name = "Derma Co 1% Hyaluronic Sunscreen Aqua Gel SPF 50 (50g)", CategoryId = skincare.Id, DefaultPrice = 499.00m, DefaultCost = 345.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Haircare
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "IND-OIL-100", Barcode = "8901030550016", Name = "Indulekha Bringha Ayurvedic Hair Oil (100ml)", CategoryId = haircare.Id, DefaultPrice = 432.00m, DefaultCost = 315.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "PAR-OIL-300", Barcode = "8901088012014", Name = "Parachute Advansed Deep Nourish Coconut Hair Oil (300ml)", CategoryId = haircare.Id, DefaultPrice = 185.00m, DefaultCost = 135.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "LOR-TR5-340", Barcode = "8901526100011", Name = "L'Oreal Paris Total Repair 5 Shampoo (340ml)", CategoryId = haircare.Id, DefaultPrice = 329.00m, DefaultCost = 230.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "TRS-CON-190", Barcode = "8901030612011", Name = "Tresemme Keratin Smooth Argan Oil Conditioner (190ml)", CategoryId = haircare.Id, DefaultPrice = 255.00m, DefaultCost = 180.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MAM-ONN-250", Barcode = "8906087770010", Name = "Mamaearth Onion Hair Fall Control Shampoo (250ml)", CategoryId = haircare.Id, DefaultPrice = 349.00m, DefaultCost = 245.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "LIV-SER-100", Barcode = "8901088001018", Name = "Livon Anti-Frizz Hair Serum with Vitamin E (100ml)", CategoryId = haircare.Id, DefaultPrice = 315.00m, DefaultCost = 220.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Body & Personal Care
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "NIV-SFT-100", Barcode = "8904256001012", Name = "Nivea Soft Light Moisturising Cream (100ml)", CategoryId = bodyCare.Id, DefaultPrice = 200.00m, DefaultCost = 140.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "VAS-LOT-400", Barcode = "8901030712018", Name = "Vaseline Intensive Care Deep Moisture Body Lotion (400ml)", CategoryId = bodyCare.Id, DefaultPrice = 385.00m, DefaultCost = 265.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BOR-CRM-40", Barcode = "8901243001014", Name = "Boroline Antiseptic Ayurvedic Cream (40g tube)", CategoryId = bodyCare.Id, DefaultPrice = 50.00m, DefaultCost = 35.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BOR-LGT-100", Barcode = "8901248101016", Name = "BoroPlus Antiseptic Light Cream (100ml)", CategoryId = bodyCare.Id, DefaultPrice = 110.00m, DefaultCost = 75.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Ayurvedic & Herbal Care
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "DAB-GLB-250", Barcode = "8901207010014", Name = "Dabur Gulabari Premium Rose Water (250ml)", CategoryId = ayurvedic.Id, DefaultPrice = 89.00m, DefaultCost = 62.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "PAT-ALV-150", Barcode = "8904109401017", Name = "Patanjali Saundarya Aloe Vera Gel (150ml)", CategoryId = ayurvedic.Id, DefaultPrice = 110.00m, DefaultCost = 75.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "VIC-TUR-50", Barcode = "8901288001018", Name = "Vicco Turmeric Ayurvedic Skin Cream with Sandalwood (50g)", CategoryId = ayurvedic.Id, DefaultPrice = 170.00m, DefaultCost = 120.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "KAM-RSW-50", Barcode = "8906014830014", Name = "Kama Ayurveda Pure Rose Water Face Mist (50ml)", CategoryId = ayurvedic.Id, DefaultPrice = 450.00m, DefaultCost = 320.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "FES-SND-30", Barcode = "8904153301011", Name = "Forest Essentials Soundarya Radiance Cream (30g)", CategoryId = ayurvedic.Id, DefaultPrice = 1495.00m, DefaultCost = 1100.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Fragrances & Deodorants
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "FOG-MST-150", Barcode = "8908001158012", Name = "Fogg 1000 Sprays Master Intense Body Spray (150ml)", CategoryId = fragrances.Id, DefaultPrice = 250.00m, DefaultCost = 175.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "WLS-EDG-50", Barcode = "8904006305012", Name = "Wild Stone Edge Perfume EDP for Men (50ml)", CategoryId = fragrances.Id, DefaultPrice = 399.00m, DefaultCost = 280.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BEL-DAT-100", Barcode = "8906154310019", Name = "Bella Vita Organic Luxury Date Woman Perfume EDP (100ml)", CategoryId = fragrances.Id, DefaultPrice = 599.00m, DefaultCost = 420.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "ENG-W2-120", Barcode = "8901030381016", Name = "Engage W2 Perfume Spray for Women (120ml)", CategoryId = fragrances.Id, DefaultPrice = 220.00m, DefaultCost = 150.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "YRD-LAV-150", Barcode = "8903105012019", Name = "Yardley London English Lavender Body Spray (150ml)", CategoryId = fragrances.Id, DefaultPrice = 260.00m, DefaultCost = 180.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Men's Grooming & Shaving
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "GIL-MC3-01", Barcode = "8901030580013", Name = "Gillette Mach 3 Manual Shaving Razor (with 1 Cartridge)", CategoryId = mensGrooming.Id, DefaultPrice = 375.00m, DefaultCost = 260.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "GIL-GEL-195", Barcode = "8901030590012", Name = "Gillette Series Sensitive Shave Gel (195g)", CategoryId = mensGrooming.Id, DefaultPrice = 299.00m, DefaultCost = 210.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BDO-GOD-30", Barcode = "8906087772014", Name = "Beardo Godfather Beard Growth Oil (30ml)", CategoryId = mensGrooming.Id, DefaultPrice = 375.00m, DefaultCost = 265.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "BSC-CH-100", Barcode = "8906107410018", Name = "Bombay Shaving Company Charcoal Deep Cleansing Face Wash (100g)", CategoryId = mensGrooming.Id, DefaultPrice = 245.00m, DefaultCost = 165.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "OLD-AFT-100", Barcode = "8901030420012", Name = "Old Spice Original After Shave Lotion (100ml)", CategoryId = mensGrooming.Id, DefaultPrice = 275.00m, DefaultCost = 195.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Lip Care & Nail Polish
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MAY-BLP-CHK", Barcode = "8901526201015", Name = "Maybelline Baby Lips Color Balm (Cherry Kiss 4g)", CategoryId = lipNails.Id, DefaultPrice = 180.00m, DefaultCost = 125.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "VAS-LIP-RSY", Barcode = "8901030721010", Name = "Vaseline Lip Therapy Rosy Lips Tin (17g)", CategoryId = lipNails.Id, DefaultPrice = 249.00m, DefaultCost = 180.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "COL-LUX-NL", Barcode = "8904052420011", Name = "Colorbar Luxe Matte Nail Lacquer (Scarlet Red 12ml)", CategoryId = lipNails.Id, DefaultPrice = 250.00m, DefaultCost = 180.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "NYK-NEL-RW", Barcode = "8904245701015", Name = "Nykaa Breathable Matte Nail Enamel (Ruby Wine 9ml)", CategoryId = lipNails.Id, DefaultPrice = 199.00m, DefaultCost = 140.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "FCS-GEL-9ML", Barcode = "8903380001011", Name = "Faces Canada Ultime Pro Gel Lustre Nail Polish (Roseate 9ml)", CategoryId = lipNails.Id, DefaultPrice = 275.00m, DefaultCost = 195.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },

            // Baby & Mother Care
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "JON-POW-200", Barcode = "8901012111013", Name = "Johnson's Baby Gentle Powder with Natural Starch (200g)", CategoryId = babyCare.Id, DefaultPrice = 230.00m, DefaultCost = 165.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "HIM-BL-200", Barcode = "8901138831017", Name = "Himalaya Baby Lotion with Almond & Olive Oil (200ml)", CategoryId = babyCare.Id, DefaultPrice = 210.00m, DefaultCost = 145.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "SEB-BAR-100", Barcode = "4103040114013", Name = "Sebamed Baby Cleansing Bar pH 5.5 (100g)", CategoryId = babyCare.Id, DefaultPrice = 299.00m, DefaultCost = 215.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), TenantId = tenant.Id, Sku = "MAM-BW-200", Barcode = "8906087773011", Name = "Mamaearth Deeply Nourishing Natural Baby Wash (200ml)", CategoryId = babyCare.Id, DefaultPrice = 259.00m, DefaultCost = 180.00m, TaxRate = 0.18m, UnitOfMeasure = "unit", CreatedAt = DateTime.UtcNow },
        };
        db.Products.AddRange(products);

        // ── Stock Items (seed starting quantities) ─────────────────────────
        var stockItems = new List<StockItem>();
        foreach (var product in products.Where(p => p.TracksInventory))
        {
            var isLow = product.Sku is "SWB-CON-02" or "MIN-NIA-30" or "KAM-RSW-50";
            stockItems.Add(new StockItem
            {
                Id = Guid.NewGuid(), LocationId = downtown.Id,
                ProductId = product.Id, QuantityOnHand = isLow ? 3 : 35, ReorderPoint = 10, ReorderQuantity = 25
            });
            stockItems.Add(new StockItem
            {
                Id = Guid.NewGuid(), LocationId = riverside.Id,
                ProductId = product.Id, QuantityOnHand = isLow ? 12 : 25, ReorderPoint = 10, ReorderQuantity = 20
            });
        }
        db.StockItems.AddRange(stockItems);

        // ── Tenant Settings ─────────────────────────────────────────────────
        db.TenantSettings.Add(new TenantSettings
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            DefaultTaxRate = 0.18m, CurrencyCode = "INR",
            ReceiptHeader = "Vikreta Beauty & Cosmetics", ReceiptFooter = "Thank you for shopping at Vikreta! Visit again.",
            LoyaltyEnabled = true, LoyaltyPointsPerAmount = 100m, LoyaltyRedemptionRate = 1.0m
        });

        await db.SaveChangesAsync();
    }
}
