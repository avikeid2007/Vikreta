using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;
using Vikreta.Api.Services;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/stock")]
[Authorize]
public class StockController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInventoryService _inventory;
    private readonly ITenantContext _tenant;

    public StockController(AppDbContext db, IInventoryService inventory, ITenantContext tenant)
    {
        _db = db;
        _inventory = inventory;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? locationId, CancellationToken ct)
    {
        var query = _db.StockItems
            .Include(s => s.Product).ThenInclude(p => p.Category)
            .Include(s => s.Variant)
            .Include(s => s.Location)
            .Where(s => s.Product.IsActive);

        if (locationId.HasValue)
            query = query.Where(s => s.LocationId == locationId.Value);

        var items = await query.OrderBy(s => s.Product.Name).ToListAsync(ct);
        return Ok(items.Select(MapStockItem));
    }

    [HttpGet("{productId:guid}")]
    public async Task<IActionResult> GetByProduct(Guid productId, CancellationToken ct)
    {
        var items = await _db.StockItems
            .Include(s => s.Location)
            .Include(s => s.Product)
            .Include(s => s.Variant)
            .Where(s => s.ProductId == productId)
            .ToListAsync(ct);
        return Ok(items.Select(MapStockItem));
    }

    [HttpPost("adjust")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Adjust([FromBody] AdjustStockRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var type = request.QuantityChange >= 0
            ? InventoryTransactionType.AdjustmentIncrease
            : InventoryTransactionType.AdjustmentDecrease;

        if (request.QuantityChange != 0)
        {
            await _inventory.RecordTransactionAsync(
                _tenant.TenantId, request.LocationId, request.ProductId, request.VariantId,
                request.QuantityChange, type, null,
                $"[{request.Reason}] {request.Notes}", userId, ct);
        }

        if (request.ReorderPoint.HasValue || request.ReorderQuantity.HasValue)
        {
            var stockItem = await _db.StockItems
                .FirstOrDefaultAsync(s => s.ProductId == request.ProductId && s.LocationId == request.LocationId, ct);
            if (stockItem != null)
            {
                if (request.ReorderPoint.HasValue) stockItem.ReorderPoint = Math.Max(0, request.ReorderPoint.Value);
                if (request.ReorderQuantity.HasValue) stockItem.ReorderQuantity = Math.Max(0, request.ReorderQuantity.Value);
                await _db.SaveChangesAsync(ct);
            }
        }

        return Ok(new { message = "Stock and reorder thresholds adjusted." });
    }

    [HttpPut("{productId:guid}/reorder")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> UpdateReorder(Guid productId, [FromQuery] Guid locationId, [FromBody] UpdateReorderRequest request, CancellationToken ct)
    {
        var stockItem = await _db.StockItems
            .FirstOrDefaultAsync(s => s.ProductId == productId && s.LocationId == locationId, ct);

        if (stockItem == null) return NotFound();

        stockItem.ReorderPoint = request.ReorderPoint;
        stockItem.ReorderQuantity = request.ReorderQuantity;
        await _db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpGet("batches")]
    public async Task<IActionResult> ListBatches(
        [FromQuery] Guid? locationId,
        [FromQuery] Guid? productId,
        [FromQuery] bool? expiringSoon,
        [FromQuery] bool? expired,
        CancellationToken ct = default)
    {
        var query = _db.ProductBatches
            .Include(b => b.Product)
            .Include(b => b.Location)
            .Where(b => b.QuantityOnHand > 0);

        if (locationId.HasValue)
            query = query.Where(b => b.LocationId == locationId.Value);

        if (productId.HasValue)
            query = query.Where(b => b.ProductId == productId.Value);

        var now = DateTime.UtcNow;
        if (expired == true)
            query = query.Where(b => b.ExpiryDate < now);
        else if (expiringSoon == true)
            query = query.Where(b => b.ExpiryDate >= now && b.ExpiryDate <= now.AddDays(30));

        var batches = await query
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(ct);

        var dtos = batches.Select(b =>
        {
            var status = b.ExpiryDate < now ? "expired"
                : b.ExpiryDate <= now.AddDays(30) ? "expiring_soon"
                : "ok";
            return new ProductBatchDto(
                b.Id, b.LocationId, b.Location.Name,
                b.ProductId, b.Product.Name, b.Product.Sku,
                b.BatchNumber, b.ManufacturingDate, b.ExpiryDate,
                b.QuantityOnHand, b.UnitCost, status);
        });

        return Ok(dtos);
    }

    [HttpPost("batches")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> CreateBatch([FromBody] CreateBatchRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var product = await _db.Products.FindAsync(new object[] { request.ProductId }, ct);
        if (product == null) return BadRequest(new { error = "Product not found." });

        var location = await _db.Locations.FindAsync(new object[] { request.LocationId }, ct);
        if (location == null) return BadRequest(new { error = "Location not found." });

        var batch = new ProductBatch
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            LocationId = request.LocationId,
            ProductId = request.ProductId,
            BatchNumber = string.IsNullOrWhiteSpace(request.BatchNumber) ? $"B-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}" : request.BatchNumber,
            ManufacturingDate = request.ManufacturingDate,
            ExpiryDate = request.ExpiryDate,
            QuantityOnHand = request.Quantity,
            UnitCost = request.UnitCost > 0 ? request.UnitCost : product.DefaultCost,
            CreatedAt = DateTime.UtcNow
        };

        _db.ProductBatches.Add(batch);

        // Also increment stock item on hand
        await _inventory.RecordTransactionAsync(
            _tenant.TenantId, request.LocationId, request.ProductId, null,
            request.Quantity, InventoryTransactionType.AdjustmentIncrease, batch.Id,
            $"Batch received: {batch.BatchNumber} (Exp: {batch.ExpiryDate:yyyy-MM-dd})", userId, ct);

        await _db.SaveChangesAsync(ct);

        var now = DateTime.UtcNow;
        var status = batch.ExpiryDate < now ? "expired"
            : batch.ExpiryDate <= now.AddDays(30) ? "expiring_soon"
            : "ok";

        return Created("", new ProductBatchDto(
            batch.Id, batch.LocationId, location.Name,
            batch.ProductId, product.Name, product.Sku,
            batch.BatchNumber, batch.ManufacturingDate, batch.ExpiryDate,
            batch.QuantityOnHand, batch.UnitCost, status));
    }

    [HttpPost("batches/{id:guid}/write-off")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> WriteOffBatch(Guid id, [FromBody] WriteOffBatchRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var batch = await _db.ProductBatches.FindAsync(new object[] { id }, ct);
        if (batch == null) return NotFound();

        var qtyToWriteOff = Math.Min(request.Quantity > 0 ? request.Quantity : batch.QuantityOnHand, batch.QuantityOnHand);
        if (qtyToWriteOff <= 0) return BadRequest(new { error = "No quantity to write off." });

        batch.QuantityOnHand -= qtyToWriteOff;

        await _inventory.RecordTransactionAsync(
            _tenant.TenantId, batch.LocationId, batch.ProductId, null,
            -qtyToWriteOff, InventoryTransactionType.AdjustmentDecrease, batch.Id,
            $"Batch write-off [{request.Reason}]: {batch.BatchNumber} - {request.Notes}", userId, ct);

        await _db.SaveChangesAsync(ct);
        return Ok(new { message = $"Written off {qtyToWriteOff} units from batch {batch.BatchNumber}." });
    }

    private static StockItemDto MapStockItem(StockItem s)
    {
        var status = s.QuantityOnHand <= 0 ? "out"
            : s.QuantityOnHand <= s.ReorderPoint ? "low"
            : "ok";

        return new StockItemDto(
            s.Id, s.LocationId, s.Location.Name,
            s.ProductId, s.Product.Name, s.Product.Sku,
            s.VariantId, s.Variant?.AttributeSummary,
            s.QuantityOnHand, s.ReorderPoint, s.ReorderQuantity, status);
    }
}

[ApiController]
[Route("api/stock-transfers")]
[Authorize]
public class StockTransfersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInventoryService _inventory;
    private readonly ITenantContext _tenant;

    public StockTransfersController(AppDbContext db, IInventoryService inventory, ITenantContext tenant)
    {
        _db = db;
        _inventory = inventory;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] StockTransferStatus? status, CancellationToken ct)
    {
        var query = _db.StockTransfers
            .Include(t => t.FromLocation)
            .Include(t => t.ToLocation)
            .Include(t => t.Lines).ThenInclude(l => l.Product)
            .Include(t => t.Lines).ThenInclude(l => l.Variant)
            .AsQueryable();

        if (status.HasValue) query = query.Where(t => t.Status == status.Value);

        var items = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
        return Ok(items.Select(MapTransfer));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var transfer = await _db.StockTransfers
            .Include(t => t.FromLocation)
            .Include(t => t.ToLocation)
            .Include(t => t.Lines).ThenInclude(l => l.Product)
            .Include(t => t.Lines).ThenInclude(l => l.Variant)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        return transfer == null ? NotFound() : Ok(MapTransfer(transfer));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateTransferRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (request.FromLocationId == request.ToLocationId)
            return BadRequest(new { error = "Source and destination locations must differ." });

        var transfer = new StockTransfer
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            FromLocationId = request.FromLocationId,
            ToLocationId = request.ToLocationId,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            Status = StockTransferStatus.Pending,
            CreatedByUserId = userId,
            Lines = request.Lines.Select(l => new StockTransferLine
            {
                Id = Guid.NewGuid(),
                ProductId = l.ProductId,
                VariantId = l.VariantId,
                Quantity = l.Quantity
            }).ToList()
        };

        _db.StockTransfers.Add(transfer);
        await _db.SaveChangesAsync(ct);

        var created = await GetFullTransfer(transfer.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = transfer.Id }, MapTransfer(created!));
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Receive(Guid id, [FromBody] ReceiveTransferRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var transfer = await GetFullTransfer(id, ct);

        if (transfer == null) return NotFound();
        if (transfer.Status == StockTransferStatus.Received)
            return BadRequest(new { error = "Transfer already received." });

        foreach (var lineReq in request.Lines)
        {
            var line = transfer.Lines.FirstOrDefault(l => l.Id == lineReq.LineId);
            if (line == null) continue;
            var qty = Math.Min(lineReq.QuantityReceived, line.Quantity);

            // Deduct from source
            await _inventory.RecordTransactionAsync(
                _tenant.TenantId, transfer.FromLocationId, line.ProductId, line.VariantId,
                -qty, InventoryTransactionType.TransferOut, transfer.Id,
                $"Transfer to {transfer.ToLocation.Name}", userId, ct);

            // Add to destination
            await _inventory.RecordTransactionAsync(
                _tenant.TenantId, transfer.ToLocationId, line.ProductId, line.VariantId,
                qty, InventoryTransactionType.TransferIn, transfer.Id,
                $"Transfer from {transfer.FromLocation.Name}", userId, ct);
        }

        transfer.Status = StockTransferStatus.Received;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Transfer received." });
    }

    private async Task<StockTransfer?> GetFullTransfer(Guid id, CancellationToken ct) =>
        await _db.StockTransfers
            .Include(t => t.FromLocation)
            .Include(t => t.ToLocation)
            .Include(t => t.Lines).ThenInclude(l => l.Product)
            .Include(t => t.Lines).ThenInclude(l => l.Variant)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

    private static StockTransferDto MapTransfer(StockTransfer t) => new(
        t.Id, t.FromLocationId, t.FromLocation.Name,
        t.ToLocationId, t.ToLocation.Name,
        t.Status, t.CreatedAt, t.Notes,
        t.Lines.Select(l => new StockTransferLineDto(
            l.Id, l.ProductId, l.Product.Name,
            l.VariantId, l.Variant?.AttributeSummary, l.Quantity)).ToList());
}
