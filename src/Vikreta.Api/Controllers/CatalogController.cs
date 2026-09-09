using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vikreta.Api.Domain;
using Vikreta.Api.DTOs;
using Vikreta.Api.Infrastructure;

namespace Vikreta.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public ProductsController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var query = _db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || p.Sku.Contains(search) || p.Barcode.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new PagedResult<ProductDto>(items.Select(MapProduct).ToList(), total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var product = await _db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return product == null ? NotFound() : Ok(MapProduct(product));
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode, CancellationToken ct)
    {
        var product = await _db.Products
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Barcode == barcode && p.IsActive, ct);

        return product == null ? NotFound() : Ok(MapProduct(product));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        if (await _db.Products.AnyAsync(p => p.Sku == request.Sku, ct))
            return Conflict(new { error = "SKU already exists." });

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Sku = request.Sku,
            Barcode = request.Barcode,
            Name = request.Name,
            Description = request.Description,
            CategoryId = request.CategoryId,
            UnitOfMeasure = request.UnitOfMeasure,
            DefaultPrice = request.DefaultPrice,
            DefaultCost = request.DefaultCost,
            TaxRate = request.TaxRate,
            TracksInventory = request.TracksInventory,
            CreatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = product.Id }, MapProduct(product));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        var product = await _db.Products.FindAsync(new object[] { id }, ct);
        if (product == null) return NotFound();

        product.Sku = request.Sku;
        product.Barcode = request.Barcode;
        product.Name = request.Name;
        product.Description = request.Description;
        product.CategoryId = request.CategoryId;
        product.UnitOfMeasure = request.UnitOfMeasure;
        product.DefaultPrice = request.DefaultPrice;
        product.DefaultCost = request.DefaultCost;
        product.TaxRate = request.TaxRate;
        product.TracksInventory = request.TracksInventory;
        product.IsActive = request.IsActive;

        await _db.SaveChangesAsync(ct);
        return Ok(MapProduct(product));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var product = await _db.Products.FindAsync(new object[] { id }, ct);
        if (product == null) return NotFound();
        product.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/variants")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> AddVariant(Guid id, [FromBody] CreateVariantRequest request, CancellationToken ct)
    {
        var product = await _db.Products.FindAsync(new object[] { id }, ct);
        if (product == null) return NotFound();

        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = id,
            VariantSku = request.VariantSku,
            AttributeSummary = request.AttributeSummary,
            PriceOverride = request.PriceOverride
        };
        _db.ProductVariants.Add(variant);
        await _db.SaveChangesAsync(ct);
        return Created("", new ProductVariantDto(variant.Id, variant.VariantSku, variant.AttributeSummary, variant.PriceOverride, variant.IsActive));
    }

    private static ProductDto MapProduct(Product p) => new(
        p.Id, p.Sku, p.Barcode, p.Name, p.Description,
        p.CategoryId, p.Category?.Name, p.Category?.ColorHex,
        p.UnitOfMeasure, p.DefaultPrice, p.DefaultCost, p.TaxRate,
        p.TracksInventory, p.IsActive, p.CreatedAt,
        p.Variants.Select(v => new ProductVariantDto(v.Id, v.VariantSku, v.AttributeSummary, v.PriceOverride, v.IsActive)).ToList());
}

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public CategoriesController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.Categories
            .Include(c => c.ParentCategory)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
        return Ok(items.Select(c => new CategoryDto(c.Id, c.Name, c.ColorHex, c.ParentCategoryId, c.ParentCategory?.Name)));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            TenantId = _tenant.TenantId,
            Name = request.Name,
            ColorHex = request.ColorHex,
            ParentCategoryId = request.ParentCategoryId
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync(ct);
        return Created("", new CategoryDto(category.Id, category.Name, category.ColorHex, category.ParentCategoryId, null));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken ct)
    {
        var cat = await _db.Categories.FindAsync(new object[] { id }, ct);
        if (cat == null) return NotFound();
        cat.Name = request.Name;
        cat.ColorHex = request.ColorHex;
        cat.ParentCategoryId = request.ParentCategoryId;
        await _db.SaveChangesAsync(ct);
        return Ok(new CategoryDto(cat.Id, cat.Name, cat.ColorHex, cat.ParentCategoryId, null));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var cat = await _db.Categories.FindAsync(new object[] { id }, ct);
        if (cat == null) return NotFound();
        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
