import type { Invoice, StoreSettings } from '@shared/types'

function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount)
  if (rounded === 0) return 'Zero Rupees only'

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen'
  ]
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety'
  ]

  function convertChunk(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + (ones[n % 10] ? ' ' : '')
    return ones[Math.floor(n / 100)] + ' Hundred ' + (n % 100 ? convertChunk(n % 100) : '')
  }

  let words = ''
  let num = rounded

  const crore = Math.floor(num / 10000000)
  num %= 10000000
  const lakh = Math.floor(num / 100000)
  num %= 100000
  const thousand = Math.floor(num / 1000)
  num %= 1000
  const remainder = num

  if (crore) words += convertChunk(crore) + 'Crore '
  if (lakh) words += convertChunk(lakh) + 'Lakh '
  if (thousand) words += convertChunk(thousand) + 'Thousand '
  if (remainder) words += convertChunk(remainder)

  return `Rs. ${words.trim()} only`
}

export function renderInvoiceHtml(
  invoice: Invoice,
  store: StoreSettings,
  qrCodeDataUrl: string
): string {
  const words = numberToWordsINR(invoice.grandTotal)

  const rowsHtml = invoice.items
    .map(
      (item, idx) => `
      <tr class="item-row">
        <td style="text-align: center;">${idx + 1}.</td>
        <td style="font-weight: 600;">${item.productName}</td>
        <td style="text-align: center;">${item.pack}</td>
        <td style="text-align: center;">${item.hsnCode}</td>
        <td style="text-align: center;">${item.expiryDate}</td>
        <td style="text-align: center; font-family: monospace;">${item.batchNo}</td>
        <td style="text-align: center; font-weight: bold;">${item.qtyPack}:${item.qtyLoose}</td>
        <td style="text-align: right;">${item.mrp.toFixed(2)}</td>
        <td style="text-align: right;">${item.discountPercent.toFixed(2)}</td>
        <td style="text-align: right;">${item.gstPercent.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">${item.amount.toFixed(2)}</td>
      </tr>
    `
    )
    .join('')

  // Calculate empty filler height to preserve fixed paper height
  const itemRowCount = invoice.items.length
  const fillerHeight = Math.max(20, 140 - itemRowCount * 22)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A5 landscape;
      margin: 4mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .invoice-box {
      width: 100%;
      border: 1.5px solid #000;
    }
    .header-title {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      padding: 2px;
      border-bottom: 1.5px solid #000;
      letter-spacing: 0.5px;
    }
    .top-table {
      width: 100%;
      border-collapse: collapse;
    }
    .top-table td {
      vertical-align: top;
      padding: 3px 5px;
      border-bottom: 1.5px solid #000;
    }
    .store-title {
      font-size: 13.5px;
      font-weight: bold;
    }
    .sub-bar {
      width: 100%;
      display: flex;
      border-bottom: 1.5px solid #000;
    }
    .sub-bar-title {
      flex: 1;
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      padding: 2px;
      border-right: 1.5px solid #000;
      background: #f1f5f9;
    }
    .sub-bar-meta {
      width: 320px;
      display: flex;
      align-items: center;
      padding: 2px 6px;
      font-size: 11px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .items-table th {
      border-bottom: 1px solid #000;
      border-right: 1px solid #000;
      padding: 2px 4px;
      font-weight: bold;
      text-align: center;
      background: #f5f5f5;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .items-table td {
      border-right: 1px solid #000;
      padding: 2px 4px;
      vertical-align: top;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .items-table tr.item-row td {
      height: 18px;
    }
    .delivery-strip {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      padding: 3px 6px;
      font-weight: bold;
      font-size: 11px;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
    }
    .footer-table td {
      vertical-align: top;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .totals-table td {
      padding: 2px 6px;
    }
    .grand-total-row {
      border-top: 1.5px solid #000;
      font-weight: bold;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header-title">CASH MEMO/PRESCRIPTION REGISTER</div>

    <table class="top-table">
      <tr>
        <td style="width: 42%;">
          <div class="store-title">${store.storeName}</div>
          <div>${store.tagline || '(Chemist & druggist)'}</div>
          <div>${store.address}</div>
          <div>TOWN- ${store.city}, DIST -${store.district}</div>
          <div>MOB-${store.phone}</div>
          <div style="margin-top: 3px;">GSTIN : ${store.gstin}</div>
          <div>Drug Lic no - ${store.drugLicNo}</div>
          <div>FSSAI-${store.fssaiNo}</div>
        </td>

        <td style="width: 18%; text-align: center; border-left: 1.5px solid #000; border-right: 1.5px solid #000;">
          <img src="${qrCodeDataUrl}" style="width: 80px; height: 80px;" alt="QR Code" />
          <div style="font-weight: bold; font-size: 10px; margin-top: 2px;">SCAN & PAY</div>
        </td>

        <td style="width: 40%;">
          <div><strong>Patient Name :</strong> ${invoice.patientName} ${invoice.patientAgeGender || ''}</div>
          <div><strong>Patient Address :</strong> ${invoice.patientAddress || '-'}</div>
          <div><strong>Phone no :</strong> ${invoice.patientPhone || '-'}</div>
          <div><strong>Dr Name :</strong> ${invoice.doctorName || '-'}</div>
          <div><strong>Dr Reg No. :</strong> ${invoice.doctorRegNo || '-'}</div>
        </td>
      </tr>
    </table>

    <div class="sub-bar">
      <div class="sub-bar-title">GST INVOICE</div>
      <div class="sub-bar-meta">
        <div style="flex: 1;"><strong>Invoice No. :</strong> &nbsp; ${invoice.invoiceNumber}</div>
        <div><strong>Date:</strong> ${invoice.invoiceDate}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;">SN.</th>
          <th style="width: 32%; text-align: left;">PRODUCT NAME</th>
          <th style="width: 8%;">PACK</th>
          <th style="width: 7%;">HSN</th>
          <th style="width: 6%;">EXP.</th>
          <th style="width: 10%;">BATCH</th>
          <th style="width: 6%;">QTY</th>
          <th style="width: 8%; text-align: right;">MRP</th>
          <th style="width: 6%; text-align: right;">DISC%</th>
          <th style="width: 6%; text-align: right;">GST%</th>
          <th style="width: 9%; text-align: right;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <!-- Empty filler rows for vertical height -->
        <tr style="height: ${fillerHeight}px;">
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      </tbody>
    </table>

    <div class="delivery-strip">
      FOR FREE HOME DELIVERY NUMBER CALL - ${store.alternatePhone || '9732101206'}
    </div>

    <table class="footer-table">
      <tr>
        <td style="width: 65%; padding: 5px; border-right: 1.5px solid #000;">
          <div style="font-weight: bold; text-decoration: underline;">Terms & Conditions</div>
          <div style="font-size: 9.5px; line-height: 1.35; margin-top: 2px;">
            (1) Medicines are sold exchanged by looking at the expiry date including the bill within 15 days<br>
            (2) All disputes subject to ${store.district || 'BUNIADPUR'} jurisdiction only.<br>
            (3) cold storage/Refrigerated/Surgical Rehabilitation product cannot be returned.<br>
            (4) PLEASE CONSULT DR. BEFORE USING THE MEDICINES<br>
            E. & O.E. (ERRORS AND OMMITIONS SHALL BE REEMBERSED)
          </div>

          <div style="margin-top: 6px; font-size: 11px;">
            <strong>YOU SAVE : &nbsp;&nbsp; ${invoice.discountTotal.toFixed(2)}</strong><br>
            <span>${words}</span>
          </div>

          <div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div></div>
            <div style="text-align: center; font-size: 10px;">
              <div>For ${store.storeName}</div>
              <div style="margin-top: 20px;">Authorised Signatory</div>
            </div>
          </div>
        </td>

        <td style="width: 35%;">
          <table class="totals-table">
            <tr>
              <td><strong>MRP TOTAL</strong></td>
              <td style="text-align: right; font-weight: bold;">${invoice.mrpTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>LESS</td>
              <td style="text-align: right;">${invoice.discountTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>SGST</td>
              <td style="text-align: right;">${invoice.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td>CGST</td>
              <td style="text-align: right;">${invoice.cgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td>ROUND OFF</td>
              <td style="text-align: right;">${invoice.roundOff.toFixed(2)}</td>
            </tr>
            <tr class="grand-total-row">
              <td style="padding-top: 6px; padding-bottom: 6px;">GRAND TOTAL</td>
              <td style="text-align: right; font-size: 14px; padding-top: 6px; padding-bottom: 6px;">
                ₹${invoice.grandTotal.toFixed(2)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}
