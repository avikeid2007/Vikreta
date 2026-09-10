using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api.Middleware;

/// <summary>
/// Resolves the current tenant from:
///   1. X-Tenant-Slug header (slug lookup)
///   2. X-Tenant-Id header (direct Guid — useful for dev/testing)
///   3. Subdomain (e.g. acme.vikreta.app → slug "acme")
///
/// Skips resolution for /api/auth/* endpoints so login can work without a prior tenant.
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db, ITenantContext tenantContext)
    {
        // Skip auth and tenant resolution endpoints
        if (context.Request.Path.StartsWithSegments("/api/auth") ||
            context.Request.Path.StartsWithSegments("/api/tenants"))
        {
            await _next(context);
            return;
        }

        Guid? tenantId = null;

        // 1. Direct Guid header (dev / Postman)
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdHeader)
            && Guid.TryParse(tenantIdHeader, out var parsedId))
        {
            tenantId = parsedId;
        }

        // 2. Slug header
        if (tenantId == null && context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader))
        {
            var slug = slugHeader.ToString().ToLowerInvariant().Trim();
            var tenant = await db.Tenants.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive);
            tenantId = tenant?.Id;
        }

        // 3. Subdomain resolution
        if (tenantId == null)
        {
            var host = context.Request.Host.Host; // e.g. "acme.vikreta.app"
            var parts = host.Split('.');
            if (parts.Length >= 3) // subdomain present
            {
                var slug = parts[0].ToLowerInvariant();
                var tenant = await db.Tenants.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive);
                tenantId = tenant?.Id;
            }
        }

        if (tenantId == null)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant could not be resolved. Provide X-Tenant-Slug or X-Tenant-Id header." });
            return;
        }

        tenantContext.SetTenant(tenantId.Value);
        await _next(context);
    }
}
