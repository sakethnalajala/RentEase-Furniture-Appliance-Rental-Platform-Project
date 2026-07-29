// Adapts a real Payment document (as returned by GET /orders/my/payments, order populated with
// its items/product/rentalPlan) into the flat shape the Payment History / Invoices pages and
// lib/invoice.js's printable invoice already render — so those UIs, built against the old mock
// data's shape, work unchanged against real data.
export function toPaymentViewModel(payment) {
  const order = payment.order || {};
  const items = order.items || [];
  const firstProduct = items[0]?.product;
  const productName = items.length > 1 ? `${firstProduct?.name || 'Product'} +${items.length - 1} more` : firstProduct?.name || 'Product';

  return {
    invoiceNumber: order.invoiceNumber || order.orderNumber || payment._id,
    orderId: order.orderNumber || '—',
    date: payment.createdAt,
    paymentStatus: payment.status,
    paymentMethod: payment.method,
    transactionId: payment.razorpayPaymentId || payment._id,
    rentalAmount: order.totalMonthlyRental ?? 0,
    securityDeposit: order.totalSecurityDeposit ?? 0,
    total: payment.amount,
    rental: {
      product: { name: productName },
      durationMonths: items[0]?.rentalPlan?.durationMonths,
    },
  };
}
