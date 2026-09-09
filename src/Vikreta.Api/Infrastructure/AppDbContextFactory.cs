using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api;

/// <summary>
/// Used only by EF Core tooling (migrations). Sets TenantId to Guid.Empty so global
/// query filters don't break at design time.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=(localdb)\\mssqllocaldb;Database=VikretaDb;Trusted_Connection=True;MultipleActiveResultSets=true");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(Guid.Empty); // bypass filter for migrations

        return new AppDbContext(optionsBuilder.Options, tenantContext);
    }
}
