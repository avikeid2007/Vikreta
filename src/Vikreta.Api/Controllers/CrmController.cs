using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;
using Vikreta.Api.Services;
using System.Security.Claims;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public CustomersController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var query = _db.Customers.Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.Contains(search) || c.Phone.Contains(search) || c.Email.Contains(search) || c.Address.Contains(search));

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new PagedResult<CustomerDto>(items.Select(MapCustomer).ToList(), total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var c = await _db.Customers.FindAsync(new object[] { id }, ct);
        return c == null ? NotFound() : Ok(MapCustomer(c));
    }

    [HttpGet("{id:guid}/invoices")]
    public async Task<IActionResult> GetInvoices(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var query = _db.Invoices.Include(i => i.Location).Where(i => i.CustomerId == id);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(i => i.IssuedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new PagedResult<InvoiceSummaryDto>(
            items.Select(i => new InvoiceSummaryDto(i.Id, i.InvoiceNumber, i.CustomerId, null, i.IssuedAt, i.GrandTotal, i.Status.ToString())).ToList(),
            total, page, pageSize));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest request, CancellationToken ct)
    {
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Name = request.Name,
            Phone = request.Phone,
            Email = request.Email,
            Address = request.Address,
            StoreCreditBalance = 0,
            CreatedAt = DateTime.UtcNow
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = customer.Id }, MapCustomer(customer));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request, CancellationToken ct)
    {
        var c = await _db.Customers.FindAsync(new object[] { id }, ct);
        if (c == null) return NotFound();
        c.Name = request.Name; c.Phone = request.Phone; c.Email = request.Email; c.Address = request.Address; c.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(MapCustomer(c));
    }

    [HttpPatch("{id:guid}/credit")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> AdjustCredit(Guid id, [FromBody] AdjustCreditRequest request, CancellationToken ct)
    {
        var c = await _db.Customers.FindAsync(new object[] { id }, ct);
        if (c == null) return NotFound();
        c.StoreCreditBalance += request.Amount;
        if (c.StoreCreditBalance < 0) return BadRequest(new { error = "Insufficient store credit." });
        await _db.SaveChangesAsync(ct);
        return Ok(new { balance = c.StoreCreditBalance });
    }

    [HttpPatch("{id:guid}/loyalty")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> AdjustLoyalty(Guid id, [FromBody] AdjustLoyaltyRequest request, CancellationToken ct)
    {
        var c = await _db.Customers.FindAsync(new object[] { id }, ct);
        if (c == null) return NotFound();
        c.LoyaltyPoints += request.PointsChange;
        if (c.LoyaltyPoints < 0) c.LoyaltyPoints = 0;
        await _db.SaveChangesAsync(ct);
        return Ok(new { loyaltyPoints = c.LoyaltyPoints });
    }

    private static CustomerDto MapCustomer(Customer c) =>
        new(c.Id, c.Name, c.Phone, c.Email, c.Address, c.StoreCreditBalance, c.LoyaltyPoints, c.CreatedAt, c.IsActive);
}

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public SuppliersController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.Suppliers.Where(s => s.IsActive).OrderBy(s => s.Name).ToListAsync(ct);
        return Ok(items.Select(MapSupplier));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var s = await _db.Suppliers.FindAsync(new object[] { id }, ct);
        return s == null ? NotFound() : Ok(MapSupplier(s));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateSupplierRequest request, CancellationToken ct)
    {
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Name = request.Name, ContactName = request.ContactName,
            Phone = request.Phone, Email = request.Email,
            Address = request.Address, Notes = request.Notes
        };
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = supplier.Id }, MapSupplier(supplier));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierRequest request, CancellationToken ct)
    {
        var s = await _db.Suppliers.FindAsync(new object[] { id }, ct);
        if (s == null) return NotFound();
        s.Name = request.Name; s.ContactName = request.ContactName;
        s.Phone = request.Phone; s.Email = request.Email;
        s.Address = request.Address; s.Notes = request.Notes; s.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(MapSupplier(s));
    }

    private static SupplierDto MapSupplier(Supplier s) =>
        new(s.Id, s.Name, s.ContactName, s.Phone, s.Email, s.Address, s.Notes, s.IsActive);
}

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInventoryService _inventory;
    private readonly ITenantContext _tenant;

    public PurchaseOrdersController(AppDbContext db, IInventoryService inventory, ITenantContext tenant)
    {
        _db = db;
        _inventory = inventory;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PurchaseOrderStatus? status, CancellationToken ct)
    {
        var query = _db.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.Location)
            .Include(po => po.Lines)
            .AsQueryable();
        if (status.HasValue) query = query.Where(po => po.Status == status.Value);
        var items = await query.OrderByDescending(po => po.CreatedAt).ToListAsync(ct);
        return Ok(items.Select(po => new PurchaseOrderSummaryDto(
            po.Id, po.PoNumber, po.Supplier.Name, po.Location.Name, po.Status, po.CreatedAt, po.Lines.Count)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var po = await GetFullPO(id, ct);
        return po == null ? NotFound() : Ok(MapPO(po));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var count = await _db.PurchaseOrders.CountAsync(ct);
        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            LocationId = request.LocationId,
            SupplierId = request.SupplierId,
            PoNumber = $"PO-{(count + 1):D5}",
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId,
            Lines = request.Lines.Select(l => new PurchaseOrderLine
            {
                Id = Guid.NewGuid(),
                ProductId = l.ProductId,
                VariantId = l.VariantId,
                QuantityOrdered = l.QuantityOrdered,
                UnitCost = l.UnitCost
            }).ToList()
        };
        _db.PurchaseOrders.Add(po);
        await _db.SaveChangesAsync(ct);
        var created = await GetFullPO(po.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = po.Id }, MapPO(created!));
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct)
    {
        var po = await _db.PurchaseOrders.FindAsync(new object[] { id }, ct);
        if (po == null) return NotFound();
        if (po.Status != PurchaseOrderStatus.Draft) return BadRequest(new { error = "Only Draft POs can be submitted." });
        po.Status = PurchaseOrderStatus.Ordered;
        po.OrderedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "PO submitted." });
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Receive(Guid id, [FromBody] ReceivePurchaseOrderRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var po = await GetFullPO(id, ct);
        if (po == null) return NotFound();
        if (po.Status == PurchaseOrderStatus.Received) return BadRequest(new { error = "PO already fully received." });

        foreach (var lineReq in request.Lines)
        {
            var line = po.Lines.FirstOrDefault(l => l.Id == lineReq.LineId);
            if (line == null) continue;
            var remaining = line.QuantityOrdered - line.QuantityReceived;
            var qty = Math.Min(lineReq.QuantityReceived, remaining);
            if (qty <= 0) continue;

            line.QuantityReceived += qty;
            await _inventory.RecordTransactionAsync(
                _tenant.TenantId, po.LocationId, line.ProductId, line.VariantId,
                qty, InventoryTransactionType.Purchase, po.Id,
                $"PO Receive: {po.PoNumber}", userId, ct);
        }

        var allReceived = po.Lines.All(l => l.QuantityReceived >= l.QuantityOrdered);
        var anyReceived = po.Lines.Any(l => l.QuantityReceived > 0);
        po.Status = allReceived ? PurchaseOrderStatus.Received
            : anyReceived ? PurchaseOrderStatus.PartiallyReceived
            : po.Status;
        if (allReceived) po.ReceivedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(MapPO(po));
    }

    [HttpPost("auto-generate-low-stock")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> AutoGenerateFromLowStock([FromBody] AutoGeneratePoRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Find supplier
        Supplier? supplier = null;
        if (request.SupplierId.HasValue)
            supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == request.SupplierId.Value && s.IsActive, ct);

        if (supplier == null)
            supplier = await _db.Suppliers.Where(s => s.IsActive).OrderBy(s => s.Name).FirstOrDefaultAsync(ct);

        if (supplier == null)
            return BadRequest(new { error = "No active suppliers found. Please add a supplier first." });

        // Find all stock items at this location below reorder point
        var lowStockItems = await _db.StockItems
            .Include(s => s.Product)
            .Include(s => s.Variant)
            .Where(s => s.LocationId == request.LocationId && s.Product.IsActive && s.Product.TracksInventory && s.QuantityOnHand <= s.ReorderPoint)
            .ToListAsync(ct);

        if (lowStockItems.Count == 0)
            return BadRequest(new { error = "No items currently below reorder point for this location." });

        var count = await _db.PurchaseOrders.CountAsync(ct);
        var poNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{(count + 1):D4}";

        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            LocationId = request.LocationId,
            SupplierId = supplier.Id,
            PoNumber = poNumber,
            CreatedAt = DateTime.UtcNow,
            Status = PurchaseOrderStatus.Draft,
            Notes = $"Auto-generated from low stock alert ({lowStockItems.Count} items)",
            CreatedByUserId = userId,
            Lines = lowStockItems.Select(s => new PurchaseOrderLine
            {
                Id = Guid.NewGuid(),
                ProductId = s.ProductId,
                VariantId = s.VariantId,
                QuantityOrdered = Math.Max(s.ReorderQuantity > 0 ? s.ReorderQuantity : 10, (s.ReorderPoint * 2) - s.QuantityOnHand),
                QuantityReceived = 0,
                UnitCost = s.Product.DefaultCost
            }).ToList()
        };

        _db.PurchaseOrders.Add(po);
        await _db.SaveChangesAsync(ct);

        var created = await GetFullPO(po.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = po.Id }, MapPO(created!));
    }

    private async Task<PurchaseOrder?> GetFullPO(Guid id, CancellationToken ct) =>
        await _db.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.Location)
            .Include(po => po.Lines).ThenInclude(l => l.Product)
            .Include(po => po.Lines).ThenInclude(l => l.Variant)
            .FirstOrDefaultAsync(po => po.Id == id, ct);

    private static PurchaseOrderDto MapPO(PurchaseOrder po) => new(
        po.Id, po.PoNumber, po.LocationId, po.Location.Name,
        po.SupplierId, po.Supplier.Name,
        po.Status, po.CreatedAt, po.OrderedAt, po.ReceivedAt, po.Notes,
        po.Lines.Select(l => new PurchaseOrderLineDto(
            l.Id, l.ProductId, l.Product.Name, l.VariantId, l.Variant?.AttributeSummary,
            l.QuantityOrdered, l.QuantityReceived, l.UnitCost)).ToList());
}
