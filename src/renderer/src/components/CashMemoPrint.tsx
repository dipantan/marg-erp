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
            <span style={{ fontWeight: 700 }}>Marg ERP Invoice Preview</span>
            <span className="badge badge-success">A4 / A5 Print Ready</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={15} /> Print Memo
            </button>
            <button className="btn-icon" onClick={onClose} style={{ color: '#fff' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The Exact Marg Medical Store Cash Memo Print Template */}
        <div className="cash-memo-sheet" id="printable-memo">
          {/* Main Title */}
          <div className="memo-title-banner">CASH MEMO / PRESCRIPTION REGISTER</div>

          {/* Top Section */}
          <div className="memo-header-grid">
            {/* Store Information */}
            <div className="memo-store-box">
              <h2 className="memo-store-name">{store?.storeName || 'M/S BHOWMIK MEDICAL'}</h2>
              <div className="memo-tagline">{store?.tagline || '(Chemist & druggist)'}</div>
              <div className="memo-address">
                {store?.address || 'HOLDING NO-6785-N, WARD NO-2, GROUND FLOOR BARAIL ROAD'}
              </div>
              <div className="memo-address">
                TOWN- {store?.city || 'BUNIADPUR'}, DIST -{store?.district || 'DAKSHIN DINAJPUR'}
              </div>
              <div className="memo-contact">MOB-{store?.phone || '9434220466'}</div>
              <div className="memo-lic-line">GSTIN : {store?.gstin || '19ALGPS1320N1ZT'}</div>
              <div className="memo-lic-line">
                Drug Lic no - {store?.drugLicNo || 'WB/DDP/NBOR/R/791800, WB/DDP/BIO/R/791800'}
              </div>
              <div className="memo-lic-line">FSSAI-{store?.fssaiNo || '22817005000401'}</div>
            </div>

            {/* QR Code Scan & Pay */}
            <div className="memo-qr-box">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Scan & Pay" className="memo-qr-img" />
              ) : (
                <div style={{ width: 80, height: 80, background: '#f8fafc', border: '1px dashed #cbd5e1' }} />
              )}
              <div className="memo-qr-text">SCAN & PAY</div>
            </div>

            {/* Patient & Prescription Info */}
            <div className="memo-patient-box">
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
          <div className="memo-center-banner">GST INVOICE</div>

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
                    {item.qtyPack}:{item.qtyLoose}
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
                <ol>
                  <li>
                    Medicines are sold/exchanged by looking at the expiry date including the bill
                    within 15 days
                  </li>
                  <li>All disputes subject to BUNIADPUR jurisdiction only.</li>
                  <li>
                    Cold storage/Refrigerated/Surgical Rehabilitation product cannot be returned.
                  </li>
                  <li>PLEASE CONSULT DR. BEFORE USING THE MEDICINES</li>
                </ol>
                <div style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                  E. & O.E. (ERRORS AND OMMITIONS SHALL BE REEMBERSED)
                </div>
              </div>

              <div className="memo-savings-bar">YOU SAVE : ₹{invoice.discountTotal.toFixed(2)}</div>
              <div className="memo-words">{numberToWordsINR(invoice.grandTotal)}</div>

              <div className="memo-signature">
                For {store?.storeName || 'M/S BHOWMIK MEDICAL'}
                <div className="memo-sig-space" />
                <span>Authorised Signatory</span>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="memo-footer-right">
              <div className="memo-calc-row">
                <span>MRP TOTAL</span>
                <span className="memo-calc-val">{invoice.mrpTotal.toFixed(2)}</span>
              </div>
              <div className="memo-calc-row">
                <span>LESS</span>
                <span className="memo-calc-val">{invoice.discountTotal.toFixed(2)}</span>
              </div>
              <div className="memo-calc-row">
                <span>SGST</span>
                <span className="memo-calc-val">{invoice.sgst.toFixed(2)}</span>
              </div>
              <div className="memo-calc-row">
                <span>CGST</span>
                <span className="memo-calc-val">{invoice.cgst.toFixed(2)}</span>
              </div>
              <div className="memo-calc-row">
                <span>ROUND OFF</span>
                <span className="memo-calc-val">{invoice.roundOff.toFixed(2)}</span>
              </div>
              <div className="memo-grand-total-row">
                <span>GRAND TOTAL</span>
                <span className="memo-grand-total-val">₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
    </Modal>
  )
}
