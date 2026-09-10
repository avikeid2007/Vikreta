using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/tenants")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TenantsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var tenants = await _db.Tenants.IgnoreQueryFilters()
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .Select(t => new TenantDto(
                t.Id,
                t.Name,
                t.Slug,
                t.CreatedAt,
                t.IsActive,
                t.Locations.Count,
                t.Users.Count))
            .ToListAsync(ct);

        return Ok(tenants);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var t = await _db.Tenants.IgnoreQueryFilters()
            .Include(x => x.Locations)
            .Include(x => x.Users)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (t == null) return NotFound();

        return Ok(new TenantDto(t.Id, t.Name, t.Slug, t.CreatedAt, t.IsActive, t.Locations.Count, t.Users.Count));
    }

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var t = await _db.Tenants.IgnoreQueryFilters()
            .Include(x => x.Locations)
            .Include(x => x.Users)
            .FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant() && x.IsActive, ct);

        if (t == null) return NotFound();

        return Ok(new TenantDto(t.Id, t.Name, t.Slug, t.CreatedAt, t.IsActive, t.Locations.Count, t.Users.Count));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request, CancellationToken ct)
    {
        var cleanSlug = request.Slug.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(cleanSlug) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name and slug are required." });

        if (await _db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Slug == cleanSlug, ct))
            return Conflict(new { error = $"Tenant with slug '{cleanSlug}' already exists." });

        var tenantId = Guid.NewGuid();
        var locationId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            Name = request.Name.Trim(),
            Slug = cleanSlug,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        var location = new Location
        {
            Id = locationId,
            TenantId = tenantId,
            Name = string.IsNullOrWhiteSpace(request.LocationName) ? "Main Store" : request.LocationName.Trim(),
            Address = "Storefront",
            TimeZone = "Asia/Kolkata",
            IsActive = true
        };

        var owner = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            LocationId = null, // Global owner
            Email = request.OwnerEmail.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.OwnerPassword),
            FirstName = string.IsNullOrWhiteSpace(request.OwnerFirstName) ? "Store" : request.OwnerFirstName.Trim(),
            LastName = string.IsNullOrWhiteSpace(request.OwnerLastName) ? "Owner" : request.OwnerLastName.Trim(),
            Role = UserRole.Owner,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var settings = new TenantSettings
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            DefaultTaxRate = 0.05m,
            CurrencyCode = "INR",
            ReceiptHeader = tenant.Name,
            ReceiptFooter = "Thank you for shopping with us!"
        };

        _db.Tenants.Add(tenant);
        _db.Locations.Add(location);
        _db.Users.Add(owner);
        _db.TenantSettings.Add(settings);

        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = tenant.Id },
            new TenantDto(tenant.Id, tenant.Name, tenant.Slug, tenant.CreatedAt, tenant.IsActive, 1, 1));
    }
}
