import React, { useState, useEffect } from 'react'
import { Printer, X } from 'lucide-react'
import QRCode from 'qrcode'
import type { Invoice, StoreSettings } from '@shared/types'
import { Modal } from './Modal'

interface CashMemoPrintProps {
  invoice: Invoice
  store: StoreSettings | null
  onClose: () => void
}

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

export const CashMemoPrint: React.FC<CashMemoPrintProps> = ({ invoice, store, onClose }) => {
  const isWholesale = invoice.invoiceType === 'WHOLESALE'

  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    store?.upiId || '9434220466@upi'
  )}&pn=${encodeURIComponent(store?.storeName || 'Bhowmik Medical')}&am=${invoice.grandTotal.toFixed(
    2
  )}&cu=INR`

  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(upiUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate offline UPI QR code', err))
  }, [upiUrl])

  const handlePrint = (): void => {
    window.print()
  }

  const activeDrugLic = isWholesale
    ? store?.wholesaleDrugLicNo || 'WD-6172-W/WD-6173-WB / WB/DDP/NBOR/W/892100'
    : store?.drugLicNo || 'WD-6172-S/WD-6173-SB / WB/DDP/NBOR/R/791800'

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="print-modal-dialog"
      maxWidth="850px"
      dialogStyle={{ background: '#fff', color: '#000', padding: 0 }}
    >
      {/* Screen Controls */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: '#0f172a',
          color: '#fff',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700 }}>
            {isWholesale ? 'Wholesale Tax Invoice Preview' : 'Retail Cash Memo Preview'}
          </span>
          <span
            className={`badge ${isWholesale ? 'badge-primary' : 'badge-success'}`}
            style={{ fontWeight: 700 }}
          >
            {isWholesale ? 'WHOLESALE (FORM 20B/21B)' : 'RETAIL (FORM 20/21)'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={15} /> Print Invoice
          </button>
          <button className="btn-icon" onClick={onClose} style={{ color: '#fff' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Marg Medical Store Cash Memo Print Template */}
      <div className="cash-memo-sheet" id="printable-memo">
        {/* Main Title */}
        <div className="memo-title-banner">
          {isWholesale ? 'WHOLESALE TAX INVOICE (FORM 20B & 21B)' : 'CASH MEMO / PRESCRIPTION REGISTER'}
        </div>

        {/* Top Section */}
        <div className="memo-header-grid">
          {/* Store Information */}
          <div className="memo-store-box">
            <h2 className="memo-store-name">{store?.storeName || 'M/S JANATA MEDICAL STORES'}</h2>
            <div className="memo-tagline">{store?.tagline || '(Chemist & druggist)'}</div>
            <div className="memo-address">
              {store?.address || 'TOWN- BUNIADPUR, P.O-BUNIADPUR, DIST -DAKSHIN DINAJPUR'}
            </div>
            <div className="memo-address">
              TOWN- {store?.city || 'BUNIADPUR'}, DIST -{store?.district || 'DAKSHIN DINAJPUR'}
            </div>
            <div className="memo-contact">MOB-{store?.phone || '9434220466'}</div>
            <div className="memo-lic-line">GSTIN : {store?.gstin || '19ALGPS1320N1ZT'}</div>
            <div className="memo-lic-line">
              {isWholesale ? 'Wholesale Drug Lic' : 'Retail Drug Lic'} - {activeDrugLic}
            </div>
            <div className="memo-lic-line">FSSAI-{store?.fssaiNo || '22817005000401'}</div>
          </div>

          {/* QR Code Scan & Pay */}
          <div className="memo-qr-box">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan & Pay" className="memo-qr-img" />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1'
                }}
              />
            )}
            <div className="memo-qr-text">SCAN & PAY</div>
          </div>

          {/* Patient / Buyer Info */}
          <div className="memo-patient-box">
            {isWholesale ? (
              <>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Buyer Shop / Party:</span>
                  <span className="memo-meta-val" style={{ fontWeight: 700 }}>
                    {invoice.patientName}
                  </span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Buyer Drug Lic:</span>
                  <span className="memo-meta-val">{invoice.customerDlNo || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Buyer GSTIN:</span>
                  <span className="memo-meta-val">{invoice.customerGstin || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Address:</span>
                  <span className="memo-meta-val">{invoice.patientAddress || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Phone:</span>
                  <span className="memo-meta-val">{invoice.patientPhone || '-'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Patient Name :</span>
                  <span className="memo-meta-val">
                    {invoice.patientName} {invoice.patientAgeGender}
                  </span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Patient Address :</span>
                  <span className="memo-meta-val">{invoice.patientAddress || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Phone no :</span>
                  <span className="memo-meta-val">{invoice.patientPhone || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Dr Name :</span>
                  <span className="memo-meta-val">{invoice.doctorName || '-'}</span>
                </div>
                <div className="memo-meta-row">
                  <span className="memo-meta-label">Dr Reg No. :</span>
                  <span className="memo-meta-val">{invoice.doctorRegNo || '-'}</span>
                </div>
              </>
            )}

            <div className="memo-inv-meta">
              <span>
                Invoice No. : <strong>{invoice.invoiceNumber}</strong>
              </span>
              <span>
                Date: <strong>{invoice.invoiceDate}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="memo-center-banner">{isWholesale ? 'TAX INVOICE' : 'GST INVOICE'}</div>

        {/* Table Items */}
        <table className="memo-items-table">
          <thead>
            <tr>
              <th style={{ width: '32px' }}>SN.</th>
              <th>PRODUCT NAME</th>
              <th style={{ width: '50px' }}>PACK</th>
              <th style={{ width: '45px' }}>HSN</th>
              <th style={{ width: '45px' }}>EXP.</th>
              <th style={{ width: '65px' }}>BATCH</th>
              <th style={{ width: '45px' }}>QTY</th>
              <th style={{ width: '60px', textAlign: 'right' }}>MRP</th>
              <th style={{ width: '50px', textAlign: 'right' }}>DISC%</th>
              <th style={{ width: '50px', textAlign: 'right' }}>GST%</th>
              <th style={{ width: '65px', textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}.</td>
                <td style={{ fontWeight: 600 }}>{item.productName}</td>
                <td>{item.pack}</td>
                <td>{item.hsnCode}</td>
                <td>{item.expiryDate}</td>
                <td style={{ fontFamily: 'monospace' }}>{item.batchNo}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>
                  {isWholesale ? item.qtyPack : `${item.qtyPack}:${item.qtyLoose}`}
                </td>
                <td style={{ textAlign: 'right' }}>{item.mrp.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{item.discountPercent.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{item.gstPercent.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Delivery Phone & Summary Grid */}
        <div className="memo-footer-grid">
          {/* Terms and Savings */}
          <div className="memo-footer-left">
            <div className="memo-delivery-call">
              FOR FREE HOME DELIVERY NUMBER CALL - {store?.alternatePhone || '9732101206'}
            </div>

            <div className="memo-terms">
              <strong>Terms & Conditions</strong>
              <div style={{ whiteSpace: 'pre-line', fontSize: '9px', marginTop: '2px' }}>
                {store?.termsAndConditions ||
                  '(1) Medicines are sold exchanged by looking at expiry date\n(2) All disputes subject to jurisdiction only'}
              </div>
            </div>

            <div className="memo-saving-box">
              <span>YOU HAVE SAVED Rs. {invoice.discountTotal.toFixed(2)} IN THIS BILL</span>
            </div>
            <div style={{ fontSize: '9.5px', marginTop: '4px', fontWeight: 'bold' }}>
              Amount in words: {numberToWordsINR(invoice.grandTotal)}
            </div>
          </div>

          {/* Arithmetic Totals Table */}
          <div className="memo-footer-right">
            <table className="memo-totals-table">
              <tbody>
                <tr>
                  <td>TOTAL MRP</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.mrpTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>DISCOUNT TOTAL</td>
                  <td style={{ textAlign: 'right' }}>-₹{invoice.discountTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>TAXABLE AMOUNT</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.taxableAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>CGST (2.5%)</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SGST (2.5%)</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.sgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>ROUND OFF</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.roundOff.toFixed(2)}</td>
                </tr>
                <tr className="grand-total-row">
                  <td>GRAND TOTAL ({invoice.paymentMode})</td>
                  <td style={{ textAlign: 'right' }}>₹{invoice.grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pharmacist Signature & Disclaimer */}
        <div className="memo-sign-strip">
          <div>
            Registered Pharmacist: <strong>{store?.registeredPharmacist || 'SUJIT BHOWMIK'}</strong>{' '}
            (Reg No: {store?.pharmacistRegNo || 'A-29233'})
          </div>
          <div style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
            For {store?.storeName || 'M/S JANATA MEDICAL STORES'}
          </div>
        </div>
      </div>
    </Modal>
  )
}
