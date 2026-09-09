using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api.Services;

public interface IInventoryService
{
    /// <summary>
    /// The ONLY method that may modify StockItem.QuantityOnHand.
    /// 1. Appends an InventoryTransaction (ledger).
    /// 2. Upserts StockItem.QuantityOnHand += quantityChange.
    /// </summary>
    Task RecordTransactionAsync(
        Guid tenantId,
        Guid locationId,
        Guid productId,
        Guid? variantId,
        int quantityChange,
        InventoryTransactionType type,
        Guid? referenceId,
        string notes,
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns stock items that are at or below their reorder point for a given location.
    /// </summary>
    Task<List<StockItem>> GetLowStockItemsAsync(Guid locationId, CancellationToken cancellationToken = default);
}

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _db;

    public InventoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task RecordTransactionAsync(
        Guid tenantId,
        Guid locationId,
        Guid productId,
        Guid? variantId,
        int quantityChange,
        InventoryTransactionType type,
        Guid? referenceId,
        string notes,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        // 1. Append ledger entry
        var transaction = new InventoryTransaction
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            LocationId = locationId,
            ProductId = productId,
            VariantId = variantId,
            QuantityChange = quantityChange,
            Type = type,
            ReferenceId = referenceId,
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        };
        _db.InventoryTransactions.Add(transaction);

        // 2. Upsert StockItem (cached projection)
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s =>
                s.LocationId == locationId &&
                s.ProductId == productId &&
                s.VariantId == variantId,
            cancellationToken);

        if (stockItem == null)
        {
            stockItem = new StockItem
            {
                Id = Guid.NewGuid(),
                LocationId = locationId,
                ProductId = productId,
                VariantId = variantId,
                QuantityOnHand = quantityChange,
                ReorderPoint = 0,
                ReorderQuantity = 0
            };
            _db.StockItems.Add(stockItem);
        }
        else
        {
            stockItem.QuantityOnHand += quantityChange;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<StockItem>> GetLowStockItemsAsync(Guid locationId, CancellationToken cancellationToken = default)
    {
        return await _db.StockItems
            .Include(s => s.Product)
            .Include(s => s.Variant)
            .Include(s => s.Location)
            .Where(s => s.LocationId == locationId &&
                        s.Product.TracksInventory &&
                        s.Product.IsActive &&
                        s.QuantityOnHand <= s.ReorderPoint)
            .OrderBy(s => s.QuantityOnHand)
            .ToListAsync(cancellationToken);
    }
}
