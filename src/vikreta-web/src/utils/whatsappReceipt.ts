/**
 * Formats a digital receipt text for sharing via WhatsApp
 */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

export interface WhatsAppReceiptParams {
  storeName: string;
  invoiceNumber: string;
  date: string;
  customerName?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal?: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod?: string;
  storeAddress?: string;
}

export function formatWhatsAppReceipt(p: WhatsAppReceiptParams): string {
  const lines: string[] = [
    `🧾 *${p.storeName.toUpperCase()}*`,
  ];

  if (p.storeAddress) {
    lines.push(`📍 ${p.storeAddress}`);
  }

  lines.push('────────────────────────');
  lines.push(`*Invoice #:* ${p.invoiceNumber}`);
  lines.push(`*Date:* ${p.date}`);
  if (p.customerName) {
    lines.push(`*Customer:* ${p.customerName}`);
  }
  lines.push('────────────────────────');
  lines.push('*ITEMS:*');

  p.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. *${item.name}*`);
    lines.push(`   ${item.quantity} × ${fmt(item.unitPrice)} = *${fmt(item.lineTotal)}*`);
  });

  lines.push('────────────────────────');
  lines.push(`Subtotal: ${fmt(p.subtotal)}`);

  if (p.discountTotal && p.discountTotal > 0) {
    lines.push(`Discount: -${fmt(p.discountTotal)}`);
  }

  lines.push(`Taxes (GST): ${fmt(p.taxTotal)}`);
  lines.push(`*TOTAL AMOUNT: ${fmt(p.grandTotal)}*`);

  if (p.paymentMethod) {
    lines.push(`*Paid via:* ${p.paymentMethod} ✅`);
  }

  lines.push('────────────────────────');
  lines.push('Thank you for shopping with us! 🙏');
  lines.push('Please visit again.');

  return lines.join('\n');
}

/**
 * Creates a clean wa.me link
 */
export function buildWhatsAppLink(phone: string | null | undefined, text: string): string {
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
