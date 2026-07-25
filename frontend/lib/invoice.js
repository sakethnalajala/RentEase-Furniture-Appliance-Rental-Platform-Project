// Real, working invoice print/download — not a fake button. Renders a self-contained HTML
// invoice document; "print" opens it in a new tab and calls window.print(), "download" saves
// the same document as a standalone .html file via the Blob API.
function buildInvoiceHtml(payment) {
  const date = new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${payment.invoiceNumber}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 40px; max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 700; color: #4f46e5; }
  .muted { color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  th { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #1e293b; border-bottom: none; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #065f46; }
  .print-btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">RentEase</div>
    <div class="muted no-print"><button class="print-btn" onclick="window.print()">Print</button></div>
  </div>

  <h2 style="margin-bottom:4px;">Invoice ${payment.invoiceNumber}</h2>
  <p class="muted">Order ${payment.orderId} · ${date}</p>

  <table>
    <tr><th>Description</th><th>Amount</th></tr>
    <tr><td>${payment.rental.product.name} — ${payment.rental.durationMonths} month rental</td><td>₹${payment.rentalAmount.toLocaleString('en-IN')}</td></tr>
    <tr><td>Security deposit (refundable)</td><td>₹${payment.securityDeposit.toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Total</td><td>₹${payment.total.toLocaleString('en-IN')}</td></tr>
  </table>

  <p style="margin-top:24px;"><strong>Payment method:</strong> ${payment.paymentMethod}</p>
  <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
  <p><strong>Status:</strong> <span class="status">${payment.paymentStatus}</span></p>

  <p class="muted" style="margin-top:40px;">This is a demo invoice generated for RentEase portfolio purposes.</p>
</body>
</html>`;
}

export function viewInvoice(payment) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(buildInvoiceHtml(payment));
  win.document.close();
  win.focus();
}

export function printInvoice(payment) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(buildInvoiceHtml(payment));
  win.document.close();
  win.focus();
  win.print();
}

export function downloadInvoice(payment) {
  const blob = new Blob([buildInvoiceHtml(payment)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${payment.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
