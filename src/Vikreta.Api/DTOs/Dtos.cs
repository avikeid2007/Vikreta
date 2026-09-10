using Vikreta.Api.Domain;

namespace Vikreta.Api.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record LoginRequest(string TenantSlug, string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, UserDto User);
public record RefreshRequest(string RefreshToken);
public record ForgotPasswordRequest(string TenantSlug, string Email);
public record ResetPasswordRequest(string Token, string NewPassword);

// ── Users ─────────────────────────────────────────────────────────────────────
public record UserDto(Guid Id, string Email, string FirstName, string LastName, string Role, Guid? LocationId);
public record CreateUserRequest(string Email, string Password, string FirstName, string LastName, UserRole Role, Guid? LocationId);
public record UpdateUserRequest(string FirstName, string LastName, UserRole Role, Guid? LocationId, bool IsActive);

// ── Locations ─────────────────────────────────────────────────────────────────
public record LocationDto(Guid Id, string Name, string Address, string TimeZone, bool IsActive);
public record CreateLocationRequest(string Name, string Address, string TimeZone);
public record UpdateLocationRequest(string Name, string Address, string TimeZone, bool IsActive);

// ── Categories ────────────────────────────────────────────────────────────────
public record CategoryDto(Guid Id, string Name, string ColorHex, Guid? ParentCategoryId, string? ParentCategoryName);
public record CreateCategoryRequest(string Name, string ColorHex, Guid? ParentCategoryId);
public record UpdateCategoryRequest(string Name, string ColorHex, Guid? ParentCategoryId);

// ── Products ──────────────────────────────────────────────────────────────────
public record ProductVariantDto(Guid Id, string VariantSku, string AttributeSummary, decimal? PriceOverride, bool IsActive);
public record ProductDto(
    Guid Id, string Sku, string Barcode, string Name, string Description,
    Guid? CategoryId, string? CategoryName, string? CategoryColorHex,
    string UnitOfMeasure, decimal DefaultPrice, decimal DefaultCost, decimal TaxRate,
    bool TracksInventory, bool IsActive, DateTime CreatedAt,
    List<ProductVariantDto> Variants);
public record CreateProductRequest(
    string Sku, string Barcode, string Name, string Description,
    Guid? CategoryId, string UnitOfMeasure, decimal DefaultPrice, decimal DefaultCost,
    decimal TaxRate, bool TracksInventory);
public record UpdateProductRequest(
    string Sku, string Barcode, string Name, string Description,
    Guid? CategoryId, string UnitOfMeasure, decimal DefaultPrice, decimal DefaultCost,
    decimal TaxRate, bool TracksInventory, bool IsActive);
public record CreateVariantRequest(string VariantSku, string AttributeSummary, decimal? PriceOverride);

// ── Stock ─────────────────────────────────────────────────────────────────────
public record StockItemDto(
    Guid Id, Guid LocationId, string LocationName,
    Guid ProductId, string ProductName, string ProductSku,
    Guid? VariantId, string? VariantAttribute,
    int QuantityOnHand, int ReorderPoint, int ReorderQuantity,
    string StockStatus); // "ok" | "low" | "out"
public record AdjustStockRequest(
    Guid ProductId, Guid? VariantId, Guid LocationId,
    int QuantityChange, AdjustmentReason Reason, string Notes);
public record UpdateReorderRequest(int ReorderPoint, int ReorderQuantity);

// ── Transfers ─────────────────────────────────────────────────────────────────
public record StockTransferLineDto(Guid Id, Guid ProductId, string ProductName, Guid? VariantId, string? VariantAttribute, int Quantity);
public record StockTransferDto(
    Guid Id, Guid FromLocationId, string FromLocationName,
    Guid ToLocationId, string ToLocationName,
    StockTransferStatus Status, DateTime CreatedAt, string Notes,
    List<StockTransferLineDto> Lines);
public record CreateTransferRequest(
    Guid FromLocationId, Guid ToLocationId, string Notes,
    List<CreateTransferLineRequest> Lines);
public record CreateTransferLineRequest(Guid ProductId, Guid? VariantId, int Quantity);
public record ReceiveTransferRequest(List<ReceiveTransferLineRequest> Lines);
public record ReceiveTransferLineRequest(Guid LineId, int QuantityReceived);

// ── Invoices ──────────────────────────────────────────────────────────────────
public record InvoiceLineDto(
    Guid Id, Guid ProductId, string ProductNameSnapshot, string VariantAttributeSnapshot,
    int Quantity, decimal UnitPriceSnapshot, decimal TaxRateSnapshot,
    decimal LineDiscount, decimal LineTotal);
public record PaymentDto(Guid Id, decimal Amount, string Method, DateTime PaidAt, string ReferenceNumber);
public record InvoiceDto(
    Guid Id, string InvoiceNumber, Guid LocationId, string LocationName,
    Guid? CustomerId, string? CustomerName,
    DateTime IssuedAt, decimal Subtotal, decimal TaxTotal, decimal DiscountTotal,
    decimal GrandTotal, string Status, string Notes,
    List<InvoiceLineDto> Lines, List<PaymentDto> Payments);
public record InvoiceSummaryDto(
    Guid Id, string InvoiceNumber, Guid? CustomerId, string? CustomerName,
    DateTime IssuedAt, decimal GrandTotal, string Status);
public record CreateInvoiceLineRequest(
    Guid ProductId, Guid? VariantId, int Quantity, decimal? UnitPriceOverride, decimal LineDiscount);
public record CreateInvoiceRequest(
    Guid LocationId, Guid? CustomerId, string Notes,
    List<CreateInvoiceLineRequest> Lines);
public record AddPaymentRequest(decimal Amount, PaymentMethod Method, string ReferenceNumber);

// ── Customers ─────────────────────────────────────────────────────────────────
public record CustomerDto(Guid Id, string Name, string Phone, string Email, string Address, decimal StoreCreditBalance, DateTime CreatedAt, bool IsActive);
public record CreateCustomerRequest(string Name, string Phone, string Email, string Address);
public record UpdateCustomerRequest(string Name, string Phone, string Email, string Address, bool IsActive);
public record AdjustCreditRequest(decimal Amount, string Reason);

// ── Suppliers ─────────────────────────────────────────────────────────────────
public record SupplierDto(Guid Id, string Name, string ContactName, string Phone, string Email, string Address, string Notes, bool IsActive);
public record CreateSupplierRequest(string Name, string ContactName, string Phone, string Email, string Address, string Notes);
public record UpdateSupplierRequest(string Name, string ContactName, string Phone, string Email, string Address, string Notes, bool IsActive);

// ── Purchase Orders ───────────────────────────────────────────────────────────
public record PurchaseOrderLineDto(Guid Id, Guid ProductId, string ProductName, Guid? VariantId, string? VariantAttribute, int QuantityOrdered, int QuantityReceived, decimal UnitCost);
public record PurchaseOrderDto(
    Guid Id, string PoNumber, Guid LocationId, string LocationName,
    Guid SupplierId, string SupplierName,
    PurchaseOrderStatus Status, DateTime CreatedAt, DateTime? OrderedAt, DateTime? ReceivedAt, string Notes,
    List<PurchaseOrderLineDto> Lines);
public record PurchaseOrderSummaryDto(
    Guid Id, string PoNumber, string SupplierName, string LocationName,
    PurchaseOrderStatus Status, DateTime CreatedAt, int TotalLines);
public record CreatePurchaseOrderRequest(Guid LocationId, Guid SupplierId, string Notes, List<CreatePurchaseOrderLineRequest> Lines);
public record CreatePurchaseOrderLineRequest(Guid ProductId, Guid? VariantId, int QuantityOrdered, decimal UnitCost);
public record ReceivePurchaseOrderRequest(List<ReceivePurchaseOrderLineRequest> Lines);
public record ReceivePurchaseOrderLineRequest(Guid LineId, int QuantityReceived);

// ── Reports ───────────────────────────────────────────────────────────────────
public record SalesReportRow(DateTime Date, Guid? LocationId, string LocationName, int InvoiceCount, decimal Revenue, decimal TaxCollected);
public record StockValuationRow(Guid ProductId, string ProductName, string Sku, Guid LocationId, string LocationName, int QuantityOnHand, decimal UnitCost, decimal TotalValue);
public record TopProductRow(Guid ProductId, string ProductName, string Sku, int UnitsSold, decimal Revenue, int Rank);
public record TaxSummaryRow(decimal TaxRate, decimal TaxableAmount, decimal TaxCollected);

// ── Dashboard ─────────────────────────────────────────────────────────────────
public record DashboardSummaryDto(
    decimal SalesToday, decimal SalesTodayChange,
    int InvoicesToday, decimal AvgTicket,
    int LowStockCount,
    List<InvoiceSummaryDto> RecentInvoices,
    List<StockItemDto> LowStockAlerts);

// ── Settings ──────────────────────────────────────────────────────────────────
public record TenantSettingsDto(decimal DefaultTaxRate, string CurrencyCode, string ReceiptHeader, string ReceiptFooter, string LogoUrl);
public record UpdateTenantSettingsRequest(decimal DefaultTaxRate, string CurrencyCode, string ReceiptHeader, string ReceiptFooter, string LogoUrl);

// ── Tenancy ───────────────────────────────────────────────────────────────────
public record TenantDto(Guid Id, string Name, string Slug, DateTime CreatedAt, bool IsActive, int LocationCount, int UserCount);
public record CreateTenantRequest(string Name, string Slug, string OwnerEmail, string OwnerPassword, string OwnerFirstName, string OwnerLastName, string LocationName);

// ── Pagination ────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNext => Page < TotalPages;
    public bool HasPrev => Page > 1;
}
