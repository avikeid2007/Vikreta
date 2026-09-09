namespace Vikreta.Api.Domain;

public enum UserRole
{
    Owner,
    Manager,
    Cashier
}

public enum InventoryTransactionType
{
    Sale,
    Purchase,
    AdjustmentIncrease,
    AdjustmentDecrease,
    TransferIn,
    TransferOut,
    OpeningStock
}

public enum StockTransferStatus
{
    Pending,
    InTransit,
    Received,
    Cancelled
}

public enum InvoiceStatus
{
    Draft,
    Paid,
    PartiallyPaid,
    Void,
    Refunded
}

public enum PurchaseOrderStatus
{
    Draft,
    Ordered,
    PartiallyReceived,
    Received,
    Cancelled
}

public enum PaymentMethod
{
    Cash,
    Card,
    StoreCredit,
    Other
}

public enum AdjustmentReason
{
    CountCorrection,
    DamageLoss,
    Donation,
    Found,
    OpeningStock,
    Other
}
