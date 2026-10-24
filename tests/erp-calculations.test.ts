import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'

describe('IPC Channels and Constants', () => {
  it('should define essential ERP IPC channels', () => {
    expect(IPC_CHANNELS.APP.GET_INFO).toBe('app:get-info')
    expect(IPC_CHANNELS.DB.GET_STATS).toBe('db:get-stats')
    expect(IPC_CHANNELS.ITEMS.LIST).toBe('items:list')
    expect(IPC_CHANNELS.INVOICES.CREATE).toBe('invoices:create')
    expect(IPC_CHANNELS.STORE.GET_SETTINGS).toBe('store:get-settings')
    expect(IPC_CHANNELS.DB.EXPORT_BACKUP).toBe('db:export-backup')
    expect(IPC_CHANNELS.MENU.ACTION).toBe('menu:action')
  })
})

describe('Marg ERP Pharmacy Cash Memo Arithmetic (Photo Verification)', () => {
  it('replicates the exact bill lines and total from Janata Medical Stores photo', () => {
    const lines = [
      { name: 'AVERT 16', packUnits: 10, qtyPack: 1, qtyLoose: 0, mrp: 142.45, disc: 10 },
      { name: 'R.B.TONE XT', packUnits: 10, qtyPack: 1, qtyLoose: 0, mrp: 223.0, disc: 10 },
      { name: 'ESOKEM-D', packUnits: 15, qtyPack: 0, qtyLoose: 10, mrp: 200.39, disc: 10 },
      { name: 'D-RISE 60K CAP', packUnits: 4, qtyPack: 0, qtyLoose: 1, mrp: 132.38, disc: 10 },
      { name: 'TRYPTOMER 10MG TAB', packUnits: 30, qtyPack: 0, qtyLoose: 10, mrp: 76.88, disc: 10 }
    ]

    let mrpTotal = 0
    lines.forEach((l) => {
      const totalPacks = l.qtyPack + l.qtyLoose / l.packUnits
      const lineMrp = Math.round(totalPacks * l.mrp * 100) / 100
      mrpTotal += lineMrp
    })

    // Sum of MRPs matches 557.77 from photo
    expect(Math.round(mrpTotal * 100) / 100).toBe(557.77)

    const discountTotal = Math.round(mrpTotal * 0.1 * 100) / 100
    expect(discountTotal).toBe(55.78)

    const netPayable = mrpTotal - discountTotal
    const grandTotal = Math.round(netPayable)
    expect(grandTotal).toBe(502.0)
  })

  it('verifies CGST and SGST equal split on taxable turnover', () => {
    const netAmount = 501.99
    const gstRate = 5.0
    // Taxable turnover = netAmount / (1 + gstRate / 100)
    const taxable = Math.round((netAmount / (1 + gstRate / 100)) * 100) / 100
    const totalGst = Math.round((netAmount - taxable) * 100) / 100
    const cgst = Math.round((totalGst / 2) * 100) / 100
    const sgst = Math.round((totalGst / 2) * 100) / 100

    expect(cgst + sgst).toBeCloseTo(totalGst, 2)
    expect(cgst).toBe(sgst)
  })

  it('properly converts loose medicine units to strips and remaining loose pills', () => {
    const unitsPerPack = 10
    const looseUnits = 47
    const strips = Math.floor(looseUnits / unitsPerPack)
    const loose = looseUnits % unitsPerPack

    expect(strips).toBe(4)
    expect(loose).toBe(7)
  })
})
