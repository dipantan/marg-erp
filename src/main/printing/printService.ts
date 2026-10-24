import { BrowserWindow } from 'electron'
import QRCode from 'qrcode'
import { renderInvoiceHtml } from './renderInvoiceHtml'
import type { Invoice, StoreSettings } from '@shared/types'

export async function printInvoiceSilent(invoice: Invoice, store: StoreSettings): Promise<boolean> {
  // 1. Generate 100% offline dynamic UPI QR Code as Base64 Data URL
  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    store.upiId || '9434220466@upi'
  )}&pn=${encodeURIComponent(store.storeName)}&am=${invoice.grandTotal.toFixed(2)}&cu=INR`

  let qrCodeDataUrl = ''
  try {
    qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
      margin: 1,
      width: 120,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Failed generating offline QR code:', err)
  }

  // 2. Render HTML template
  const htmlContent = renderInvoiceHtml(invoice, store, qrCodeDataUrl)

  // 3. Create invisible background window for rendering and printing
  const printWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

  // 4. Trigger print (silent if configured, or system print dialog)
  return new Promise((resolve) => {
    printWindow.webContents.print(
      {
        silent: false, // Opens native print dialog so user can pick physical printer / save PDF
        printBackground: true,
        margins: { marginType: 'none' }
      },
      (success, failureReason) => {
        printWindow.close()
        if (!success && failureReason !== 'cancelled') {
          console.error('Print failed:', failureReason)
          resolve(false)
        } else {
          resolve(true)
        }
      }
    )
  })
}
