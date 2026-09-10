using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;
using Vikreta.Api.Services;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Owner,Manager")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("sales")]
    public async Task<IActionResult> Sales(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? locationId,
        CancellationToken ct)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to.HasValue ? to.Value.Date.AddDays(1) : DateTime.UtcNow;

        var query = _db.Invoices
            .Include(i => i.Location)
            .Where(i => i.Status != InvoiceStatus.Void &&
                        i.IssuedAt >= fromDate && i.IssuedAt <= toDate);

        if (locationId.HasValue) query = query.Where(i => i.LocationId == locationId.Value);

        var invoices = await query
            .Select(i => new
            {
                Date = i.IssuedAt.Date,
                i.LocationId,
                LocationName = i.Location != null ? i.Location.Name : "Unknown",
                i.GrandTotal,
                i.TaxTotal
            })
            .ToListAsync(ct);

        var rows = invoices
            .GroupBy(i => new { i.Date, i.LocationId, i.LocationName })
            .Select(g => new SalesReportRow(
                g.Key.Date,
                g.Key.LocationId,
                g.Key.LocationName,
                g.Count(),
                g.Sum(i => i.GrandTotal),
                g.Sum(i => i.TaxTotal)))
            .OrderBy(r => r.Date)
            .ToList();

        return Ok(rows);
    }

    [HttpGet("stock-valuation")]
    public async Task<IActionResult> StockValuation([FromQuery] Guid? locationId, CancellationToken ct)
    {
        var query = _db.StockItems
            .Include(s => s.Product)
            .Include(s => s.Location)
            .Where(s => s.Product.IsActive && s.Product.TracksInventory);

        if (locationId.HasValue) query = query.Where(s => s.LocationId == locationId.Value);

        var rows = await query
            .OrderBy(s => s.Product.Name)
            .Select(s => new StockValuationRow(
                s.ProductId, s.Product.Name, s.Product.Sku,
                s.LocationId, s.Location.Name,
                s.QuantityOnHand, s.Product.DefaultCost,
                s.QuantityOnHand * s.Product.DefaultCost))
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("top-products")]
    public async Task<IActionResult> TopProducts(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? locationId,
        [FromQuery] int top = 20,
        CancellationToken ct = default)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to.HasValue ? to.Value.Date.AddDays(1) : DateTime.UtcNow;

        var query = _db.InvoiceLines
            .Include(l => l.Invoice)
            .Include(l => l.Product)
            .Where(l => l.Invoice.Status != InvoiceStatus.Void &&
                        l.Invoice.IssuedAt >= fromDate && l.Invoice.IssuedAt <= toDate);

        if (locationId.HasValue)
        {
            query = query.Where(l => l.Invoice.LocationId == locationId.Value);
        }

        var lines = await query
            .Select(l => new
            {
                l.ProductId,
                l.ProductNameSnapshot,
                l.Quantity,
                l.LineTotal
            })
            .ToListAsync(ct);

        var rows = lines
            .GroupBy(l => new { l.ProductId, l.ProductNameSnapshot })
            .Select(g => new
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductNameSnapshot,
                UnitsSold = g.Sum(l => l.Quantity),
                Revenue = g.Sum(l => l.LineTotal)
            })
            .OrderByDescending(r => r.Revenue)
            .Take(top)
            .ToList();

        // Get current SKUs
        var productIds = rows.Select(r => r.ProductId).ToList();
        var skus = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Sku, ct);

        var result = rows.Select((r, i) => new TopProductRow(
            r.ProductId, r.ProductName, skus.GetValueOrDefault(r.ProductId, ""),
            r.UnitsSold, r.Revenue, i + 1)).ToList();

        return Ok(result);
    }

    [HttpGet("tax-summary")]
    public async Task<IActionResult> TaxSummary(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? locationId,
        CancellationToken ct = default)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to.HasValue ? to.Value.Date.AddDays(1) : DateTime.UtcNow;

        var query = _db.InvoiceLines
            .Where(l => l.Invoice.Status != InvoiceStatus.Void &&
                        l.Invoice.IssuedAt >= fromDate && l.Invoice.IssuedAt <= toDate);

        if (locationId.HasValue)
        {
            query = query.Where(l => l.Invoice.LocationId == locationId.Value);
        }

        var lines = await query
            .Select(l => new
            {
                l.TaxRateSnapshot,
                l.LineTotal
            })
            .ToListAsync(ct);

        var rows = lines
            .GroupBy(l => l.TaxRateSnapshot)
            .Select(g => new TaxSummaryRow(
                g.Key,
                g.Sum(l => l.LineTotal),
                g.Sum(l => l.LineTotal * g.Key)
            ))
            .OrderBy(r => r.TaxRate)
            .ToList();

        return Ok(rows);
    }
}

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInventoryService _inventory;

    public DashboardController(AppDbContext db, IInventoryService inventory)
    {
        _db = db;
        _inventory = inventory;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] Guid? locationId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        var invoiceQuery = _db.Invoices.Include(i => i.Customer).Include(i => i.Location)
            .Where(i => i.Status != InvoiceStatus.Void);

        if (locationId.HasValue) invoiceQuery = invoiceQuery.Where(i => i.LocationId == locationId.Value);

        var todayInvoices = await invoiceQuery.Where(i => i.IssuedAt.Date == today).ToListAsync(ct);
        var yesterdayRevenue = await invoiceQuery
            .Where(i => i.IssuedAt.Date == yesterday)
            .SumAsync(i => i.GrandTotal, ct);

        var salesToday = todayInvoices.Sum(i => i.GrandTotal);
        var invoicesToday = todayInvoices.Count;
        var avgTicket = invoicesToday > 0 ? salesToday / invoicesToday : 0;
        var change = yesterdayRevenue > 0 ? (salesToday - yesterdayRevenue) / yesterdayRevenue : 0;

        // Recent invoices
        var recentInvoices = todayInvoices
            .OrderByDescending(i => i.IssuedAt)
            .Take(5)
            .Select(i => new InvoiceSummaryDto(i.Id, i.InvoiceNumber, i.CustomerId, i.Customer?.Name, i.IssuedAt, i.GrandTotal, i.Status.ToString()))
            .ToList();

        // Low stock
        List<StockItem> lowStockItems;
        if (locationId.HasValue)
        {
            lowStockItems = await _inventory.GetLowStockItemsAsync(locationId.Value, ct);
        }
        else
        {
            var locations = await _db.Locations.Where(l => l.IsActive).ToListAsync(ct);
            lowStockItems = new List<StockItem>();
            foreach (var loc in locations)
                lowStockItems.AddRange(await _inventory.GetLowStockItemsAsync(loc.Id, ct));
        }

        var lowStockDtos = lowStockItems.Take(5).Select(s => new StockItemDto(
            s.Id, s.LocationId, s.Location.Name,
            s.ProductId, s.Product.Name, s.Product.Sku,
            s.VariantId, s.Variant?.AttributeSummary,
            s.QuantityOnHand, s.ReorderPoint, s.ReorderQuantity,
            s.QuantityOnHand <= 0 ? "out" : "low")).ToList();

        return Ok(new DashboardSummaryDto(
            salesToday, change, invoicesToday, avgTicket,
            lowStockItems.Count, recentInvoices, lowStockDtos));
    }
}

[ApiController]
[Route("api/locations")]
[Authorize]
public class LocationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public LocationsController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.Locations.Where(l => l.IsActive).OrderBy(l => l.Name).ToListAsync(ct);
        return Ok(items.Select(l => new LocationDto(l.Id, l.Name, l.Address, l.TimeZone, l.IsActive)));
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Create([FromBody] CreateLocationRequest request, CancellationToken ct)
    {
        var location = new Location
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Name = request.Name,
            Address = request.Address,
            TimeZone = request.TimeZone
        };
        _db.Locations.Add(location);
        await _db.SaveChangesAsync(ct);
        return Created("", new LocationDto(location.Id, location.Name, location.Address, location.TimeZone, location.IsActive));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLocationRequest request, CancellationToken ct)
    {
        var loc = await _db.Locations.FindAsync(new object[] { id }, ct);
        if (loc == null) return NotFound();
        loc.Name = request.Name; loc.Address = request.Address; loc.TimeZone = request.TimeZone; loc.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new LocationDto(loc.Id, loc.Name, loc.Address, loc.TimeZone, loc.IsActive));
    }
}

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Owner")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public AdminController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await _db.Users.Where(u => u.IsActive).OrderBy(u => u.FirstName).ToListAsync(ct);
        return Ok(users.Select(u => new UserDto(u.Id, u.Email, u.FirstName, u.LastName, u.Role.ToString(), u.LocationId)));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant(), ct))
            return Conflict(new { error = "Email already exists." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            LocationId = request.LocationId,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return Created("", new UserDto(user.Id, user.Email, user.FirstName, user.LastName, user.Role.ToString(), user.LocationId));
    }

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var user = await _db.Users.FindAsync(new object[] { id }, ct);
        if (user == null) return NotFound();
        user.FirstName = request.FirstName; user.LastName = request.LastName;
        user.Role = request.Role; user.LocationId = request.LocationId; user.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new UserDto(user.Id, user.Email, user.FirstName, user.LastName, user.Role.ToString(), user.LocationId));
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var settings = await _db.TenantSettings.FirstOrDefaultAsync(ct);
        if (settings == null) return Ok(new TenantSettingsDto(0.08m, "USD", "", "Thank you!", ""));
        return Ok(new TenantSettingsDto(settings.DefaultTaxRate, settings.CurrencyCode, settings.ReceiptHeader, settings.ReceiptFooter, settings.LogoUrl));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateTenantSettingsRequest request, CancellationToken ct)
    {
        var settings = await _db.TenantSettings.FirstOrDefaultAsync(ct);
        if (settings == null)
        {
            settings = new TenantSettings { Id = Guid.NewGuid(), TenantId = _tenant.TenantId };
            _db.TenantSettings.Add(settings);
        }
        settings.DefaultTaxRate = request.DefaultTaxRate;
        settings.CurrencyCode = request.CurrencyCode;
        settings.ReceiptHeader = request.ReceiptHeader;
        settings.ReceiptFooter = request.ReceiptFooter;
        settings.LogoUrl = request.LogoUrl;
        await _db.SaveChangesAsync(ct);
        return Ok(new TenantSettingsDto(settings.DefaultTaxRate, settings.CurrencyCode, settings.ReceiptHeader, settings.ReceiptFooter, settings.LogoUrl));
    }
}
