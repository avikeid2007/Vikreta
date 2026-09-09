namespace Vikreta.Api.Infrastructure;

/// <summary>
/// Scoped service that carries the resolved TenantId for the current request.
/// Populated by TenantMiddleware before the request reaches any controller.
/// </summary>
public interface ITenantContext
{
    Guid TenantId { get; }
    bool IsResolved { get; }
    void SetTenant(Guid tenantId);
}

public class TenantContext : ITenantContext
{
    private Guid _tenantId;

    public Guid TenantId => _tenantId;
    public bool IsResolved { get; private set; }

    public void SetTenant(Guid tenantId)
    {
        _tenantId = tenantId;
        IsResolved = true;
    }
}
