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
[Route("api/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IInventoryService _inventory;
    private readonly ITenantContext _tenant;

    public InvoicesController(AppDbContext db, IInventoryService inventory, ITenantContext tenant)
    {
        _db = db;
        _inventory = inventory;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? locationId,
        [FromQuery] InvoiceStatus? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var query = _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Location)
            .AsQueryable();

        if (locationId.HasValue) query = query.Where(i => i.LocationId == locationId.Value);
        if (status.HasValue) query = query.Where(i => i.Status == status.Value);
        if (from.HasValue) query = query.Where(i => i.IssuedAt >= from.Value.Date);
        if (to.HasValue)
        {
            var endOfDay = to.Value.Date.AddDays(1);
            query = query.Where(i => i.IssuedAt < endOfDay);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(i => i.IssuedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new PagedResult<InvoiceSummaryDto>(
            items.Select(i => new InvoiceSummaryDto(
                i.Id, i.InvoiceNumber, i.CustomerId, i.Customer?.Name,
                i.IssuedAt, i.GrandTotal, i.Status.ToString())).ToList(),
            total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var invoice = await GetFullInvoice(id, ct);
        return invoice == null ? NotFound() : Ok(MapInvoice(invoice));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Build lines with price/tax snapshots
        var lines = new List<InvoiceLine>();
        foreach (var lineReq in request.Lines)
        {
            var product = await _db.Products
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == lineReq.ProductId, ct);

            if (product == null)
                return BadRequest(new { error = $"Product {lineReq.ProductId} not found." });

            var variant = lineReq.VariantId.HasValue
                ? product.Variants.FirstOrDefault(v => v.Id == lineReq.VariantId.Value)
                : null;

            var unitPrice = lineReq.UnitPriceOverride
                ?? variant?.PriceOverride
                ?? product.DefaultPrice;

            var lineTotal = (unitPrice * lineReq.Quantity) - lineReq.LineDiscount;

            lines.Add(new InvoiceLine
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                VariantId = lineReq.VariantId,
                ProductNameSnapshot = product.Name,
                VariantAttributeSnapshot = variant?.AttributeSummary ?? "",
                Quantity = lineReq.Quantity,
                UnitPriceSnapshot = unitPrice,
                TaxRateSnapshot = product.TaxRate,
                LineDiscount = lineReq.LineDiscount,
                LineTotal = lineTotal
            });
        }

        var subtotal = lines.Sum(l => l.LineTotal);
        var taxTotal = lines.Sum(l => l.LineTotal * l.TaxRateSnapshot);
        var grandTotal = subtotal + taxTotal;

        // Generate invoice number: LOC-YYYYMMDD-SEQ
        var location = await _db.Locations.FindAsync(new object[] { request.LocationId }, ct);
        var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
        var todayCount = await _db.Invoices
            .CountAsync(i => i.LocationId == request.LocationId &&
                             i.IssuedAt.Date == DateTime.UtcNow.Date, ct);
        var invoiceNumber = $"{location?.Name?[..3].ToUpper() ?? "INV"}-{todayStr}-{(todayCount + 1):D4}";

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            LocationId = request.LocationId,
            CustomerId = request.CustomerId,
            InvoiceNumber = invoiceNumber,
            IssuedAt = DateTime.UtcNow,
            Subtotal = subtotal,
            TaxTotal = taxTotal,
            DiscountTotal = lines.Sum(l => l.LineDiscount),
            GrandTotal = grandTotal,
            Status = InvoiceStatus.Draft,
            Notes = request.Notes,
            CreatedByUserId = userId,
            Lines = lines
        };

        _db.Invoices.Add(invoice);

        // Deduct redeemed loyalty points if any
        if (request.PointsRedeemed > 0 && request.CustomerId.HasValue)
        {
            var customer = await _db.Customers.FindAsync(new object[] { request.CustomerId.Value }, ct);
            if (customer != null)
            {
                customer.LoyaltyPoints = Math.Max(0, customer.LoyaltyPoints - request.PointsRedeemed);
            }
        }

        await _db.SaveChangesAsync(ct);

        // Deduct stock for all lines
        foreach (var line in lines)
        {
            var product = await _db.Products.FindAsync(new object[] { line.ProductId }, ct);
            if (product?.TracksInventory == true)
            {
                await _inventory.RecordTransactionAsync(
                    _tenant.TenantId, request.LocationId, line.ProductId, line.VariantId,
                    -line.Quantity, InventoryTransactionType.Sale, invoice.Id,
                    $"Sale: {invoice.InvoiceNumber}", userId, ct);
            }
        }

        // Mark as paid immediately if no payment needed (edge case)
        invoice.Status = InvoiceStatus.Draft; // caller adds payment separately
        await _db.SaveChangesAsync(ct);

        var created = await GetFullInvoice(invoice.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = invoice.Id }, MapInvoice(created!));
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> AddPayment(Guid id, [FromBody] AddPaymentRequest request, CancellationToken ct)
    {
        var invoice = await GetFullInvoice(id, ct);
        if (invoice == null) return NotFound();
        if (invoice.Status == InvoiceStatus.Void) return BadRequest(new { error = "Cannot pay a voided invoice." });

        var wasPaid = invoice.Status == InvoiceStatus.Paid;
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = id,
            Amount = request.Amount,
            Method = request.Method,
            PaidAt = DateTime.UtcNow,
            ReferenceNumber = request.ReferenceNumber
        };
        _db.Payments.Add(payment);

        var totalPaid = invoice.Payments.Sum(p => p.Amount) + request.Amount;
        invoice.Status = totalPaid >= invoice.GrandTotal
            ? InvoiceStatus.Paid
            : InvoiceStatus.PartiallyPaid;

        // Earn loyalty points upon full payment
        if (!wasPaid && invoice.Status == InvoiceStatus.Paid && invoice.CustomerId.HasValue)
        {
            var settings = await _db.TenantSettings.FirstOrDefaultAsync(ct);
            if (settings?.LoyaltyEnabled == true)
            {
                var customer = await _db.Customers.FindAsync(new object[] { invoice.CustomerId.Value }, ct);
                if (customer != null)
                {
                    var earnRate = settings.LoyaltyPointsPerAmount > 0 ? settings.LoyaltyPointsPerAmount : 100m;
                    var pointsEarned = (int)Math.Floor(invoice.GrandTotal / earnRate);
                    if (pointsEarned > 0)
                    {
                        customer.LoyaltyPoints += pointsEarned;
                    }
                }
            }
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new PaymentDto(payment.Id, payment.Amount, payment.Method.ToString(), payment.PaidAt, payment.ReferenceNumber));
    }

    [HttpPost("{id:guid}/void")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Void(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invoice = await GetFullInvoice(id, ct);
        if (invoice == null) return NotFound();
        if (invoice.Status == InvoiceStatus.Void) return BadRequest(new { error = "Already voided." });

        // Reverse stock
        foreach (var line in invoice.Lines)
        {
            var product = await _db.Products.FindAsync(new object[] { line.ProductId }, ct);
            if (product?.TracksInventory == true)
            {
                await _inventory.RecordTransactionAsync(
                    _tenant.TenantId, invoice.LocationId, line.ProductId, line.VariantId,
                    line.Quantity, InventoryTransactionType.AdjustmentIncrease, invoice.Id,
                    $"Void: {invoice.InvoiceNumber}", userId, ct);
            }
        }

        invoice.Status = InvoiceStatus.Void;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Invoice voided." });
    }

    private async Task<Invoice?> GetFullInvoice(Guid id, CancellationToken ct) =>
        await _db.Invoices
            .Include(i => i.Location)
            .Include(i => i.Customer)
            .Include(i => i.Lines)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    private static InvoiceDto MapInvoice(Invoice i) => new(
        i.Id, i.InvoiceNumber, i.LocationId, i.Location.Name,
        i.CustomerId, i.Customer?.Name,
        i.IssuedAt, i.Subtotal, i.TaxTotal, i.DiscountTotal, i.GrandTotal, i.Status.ToString(), i.Notes,
        i.Lines.Select(l => new InvoiceLineDto(
            l.Id, l.ProductId, l.ProductNameSnapshot, l.VariantAttributeSnapshot,
            l.Quantity, l.UnitPriceSnapshot, l.TaxRateSnapshot, l.LineDiscount, l.LineTotal)).ToList(),
        i.Payments.Select(p => new PaymentDto(p.Id, p.Amount, p.Method.ToString(), p.PaidAt, p.ReferenceNumber)).ToList());
}
