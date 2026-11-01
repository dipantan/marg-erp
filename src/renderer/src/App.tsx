import React, { useState, useEffect, useCallback } from 'react'
import { FunctionKeyToolbar } from './components/FunctionKeyToolbar'
import { DesktopKeyboardModal } from './components/DesktopKeyboardModal'
import { Sidebar, type NavTab } from './components/Sidebar'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { DashboardView } from './views/DashboardView'
import { ItemsView } from './views/ItemsView'
import { InvoicesView } from './views/InvoicesView'
import { CustomersView } from './views/CustomersView'
import { DatabaseView } from './views/DatabaseView'
import { StoreSettingsView } from './views/StoreSettingsView'
import { CashMemoPrint } from './components/CashMemoPrint'
import type {
  AppInfo,
  DatabaseStats,
  StoreSettings,
  ProductWithBatches,
  ProductBatch,
  Customer,
  Invoice,
  CreateProductInput,
  CreateBatchInput,
  CreateCustomerInput,
  CreateInvoiceInput
} from '@shared/types'

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)

  // Data states
  const [items, setItems] = useState<ProductWithBatches[]>([])
  const [expiringSoonItems, setExpiringSoonItems] = useState<ProductBatch[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Print memo modal from dashboard or anywhere
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null)

  // Search queries
  const [itemSearch, setItemSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // Loading states
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  // Modal triggers from Header & Menubar
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isItemModalTriggered, setIsItemModalTriggered] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)

  // Fetch App Info & Stats
  const loadStats = useCallback(async () => {
    if (!window.api?.db) return
    const res = await window.api.db.getStats()
    if (res.success && res.data) {
      setDbStats(res.data)
    }
  }, [])

  const loadAppInfo = useCallback(async () => {
    if (!window.api?.app) return
    const res = await window.api.app.getInfo()
    if (res.success && res.data) {
      setAppInfo(res.data)
    }
  }, [])

  const loadStoreSettings = useCallback(async () => {
    if (!window.api?.store) return
    const res = await window.api.store.getSettings()
    if (res.success && res.data) {
      setStoreSettings(res.data)
    }
  }, [])

  // Fetch items
  const loadItems = useCallback(async (query?: string) => {
    if (!window.api?.items) return
    setLoadingItems(true)
    const res = await window.api.items.list(query)
    if (res.success && res.data) {
      setItems(res.data)
    }
    setLoadingItems(false)
  }, [])

  const loadExpiringSoon = useCallback(async () => {
    if (!window.api?.items) return
    const res = await window.api.items.getExpiringSoon()
    if (res.success && res.data) {
      setExpiringSoonItems(res.data)
    }
  }, [])

  // Fetch customers
  const loadCustomers = useCallback(async (query?: string) => {
    if (!window.api?.customers) return
    setLoadingCustomers(true)
    const res = await window.api.customers.list(query)
    if (res.success && res.data) {
      setCustomers(res.data)
    }
    setLoadingCustomers(false)
  }, [])

  // Fetch invoices
  const loadInvoices = useCallback(async () => {
    if (!window.api?.invoices) return
    setLoadingInvoices(true)
    const res = await window.api.invoices.list()
    if (res.success && res.data) {
      setInvoices(res.data)
    }
    setLoadingInvoices(false)
  }, [])

  // Initial mount
  useEffect(() => {
    let isMounted = true
    const initData = async (): Promise<void> => {
      if (!isMounted) return
      await Promise.all([
        loadAppInfo(),
        loadStats(),
        loadStoreSettings(),
        loadItems(),
        loadExpiringSoon(),
        loadCustomers(),
        loadInvoices()
      ])
    }
    initData()
    return () => {
      isMounted = false
    }
  }, [
    loadAppInfo,
    loadStats,
    loadStoreSettings,
    loadItems,
    loadExpiringSoon,
    loadCustomers,
    loadInvoices
  ])

  // Search debounce for items
  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems(itemSearch)
    }, 200)
    return () => clearTimeout(timer)
  }, [itemSearch, loadItems])

  // Search debounce for customers
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(customerSearch)
    }, 200)
    return () => clearTimeout(timer)
  }, [customerSearch, loadCustomers])

  // Handlers for Add / Delete
  const handleAddItem = async (input: CreateProductInput): Promise<boolean> => {
    const res = await window.api.items.create(input)
    if (res.success) {
      await loadItems()
      await loadExpiringSoon()
      await loadStats()
      return true
    }
    return false
  }

  const handleDeleteItem = async (id: number): Promise<boolean> => {
    const res = await window.api.items.delete(id)
    if (res.success) {
      await loadItems(itemSearch)
      await loadExpiringSoon()
      await loadStats()
      return true
    }
    return false
  }

  const handleAddCustomer = async (input: CreateCustomerInput): Promise<boolean> => {
    const res = await window.api.customers.create(input)
    if (res.success) {
      await loadCustomers()
      await loadStats()
      return true
    }
    return false
  }

  const handleDeleteCustomer = async (id: number): Promise<boolean> => {
    const res = await window.api.customers.delete(id)
    if (res.success) {
      await loadCustomers(customerSearch)
      await loadStats()
      return true
    }
    return false
  }

  const handleAddBatch = async (input: CreateBatchInput): Promise<boolean> => {
    if (!window.api?.items) return false
    const res = await window.api.items.createBatch(input)
    if (res.success) {
      await loadItems(itemSearch)
      await loadExpiringSoon()
      await loadStats()
      return true
    }
    return false
  }

  const handleCreateInvoice = async (input: CreateInvoiceInput): Promise<boolean> => {
    const res = await window.api.invoices.create(input)
    if (res.success) {
      await loadInvoices()
      await loadItems()
      await loadStats()
      return true
    }
    return false
  }

  const handleUpdateStore = async (settings: Partial<StoreSettings>): Promise<boolean> => {
    const res = await window.api.store.updateSettings(settings)
    if (res.success && res.data) {
      setStoreSettings(res.data)
      return true
    }
    return false
  }

  // 1-Click Instant Desktop Backup
  const handleBackup = useCallback(async (): Promise<void> => {
    if (!window.api?.db?.exportBackup) return
    const res = await window.api.db.exportBackup()
    if (res.success && res.data) {
      alert(
        `[Marg ERP Offline SQLite]\nDatabase backup created successfully:\n${res.data.savedPath}`
      )
      await loadStats()
    } else {
      alert('Backup failed: ' + (res.error || 'Unknown error'))
    }
  }, [loadStats])

  // Native Electron System Menu Action Listener
  useEffect(() => {
    if (!window.api?.menu?.onAction) return
    const cleanup = window.api.menu.onAction((action: string) => {
      switch (action) {
        case 'nav:dashboard':
          setCurrentTab('dashboard')
          break
        case 'nav:items':
        case 'nav:items:near-expiry':
        case 'nav:items:low-stock':
          setCurrentTab('items')
          break
        case 'nav:invoices':
          setCurrentTab('invoices')
          break
        case 'nav:customers':
          setCurrentTab('customers')
          break
        case 'nav:settings':
          setCurrentTab('settings')
          break
        case 'nav:database':
          setCurrentTab('database')
          break
        case 'action:new-invoice':
          setCurrentTab('invoices')
          setIsInvoiceModalOpen(true)
          break
        case 'action:new-item':
          setCurrentTab('items')
          setIsItemModalTriggered(true)
          break
        case 'action:backup':
          handleBackup()
          break
        case 'action:help':
          setIsHelpModalOpen(true)
          break
        case 'action:about':
          alert(
            'Marg ERP Desktop v0.1.0\n100% Offline SQLite 3 WAL Engine\nBuilt for Indian Retail Pharmacy'
          )
          break
        case 'action:check-updates':
          if (window.api?.updater) {
            window.api.updater.checkForUpdates().then((res) => {
              if (res.data?.status === 'not-available') {
                alert(`Marg ERP is up to date!\nCurrent version: v${res.data.version || '0.1.0'}`)
              } else if (res.data?.status === 'available') {
                alert(
                  `Update Available!\nMarg ERP v${res.data.version} is available and downloading in background.`
                )
              } else if (res.error) {
                const is404 = res.error.includes('404') || res.error.includes('releases.atom')
                if (is404) {
                  alert(`Marg ERP is up to date!\nCurrent version: v0.1.0`)
                } else {
                  alert(`Marg ERP Update:\n${res.error}`)
                }
              }
            })
          }
          break
      }
    })
    return cleanup
  }, [handleBackup])

  // Global Alt+1..6 module switch listener (standard Windows desktop ERP shortcut)
  useEffect(() => {
    const handleAltNav = (e: KeyboardEvent): void => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault()
          setCurrentTab('dashboard')
        } else if (e.key === '2') {
          e.preventDefault()
          setCurrentTab('invoices')
        } else if (e.key === '3') {
          e.preventDefault()
          setCurrentTab('items')
        } else if (e.key === '4') {
          e.preventDefault()
          setCurrentTab('customers')
        } else if (e.key === '5') {
          e.preventDefault()
          setCurrentTab('settings')
        } else if (e.key === '6') {
          e.preventDefault()
          setCurrentTab('database')
        }
      }
    }
    window.addEventListener('keydown', handleAltNav)
    return () => window.removeEventListener('keydown', handleAltNav)
  }, [])

  const lowStockItems = items.filter((i) => i.totalStockStrips <= (i.reorderLevel || 10))

  return (
    <div className="windows-app-shell">
      {/* Function Key Action Ribbon */}
      <FunctionKeyToolbar
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        onNewInvoice={() => {
          setCurrentTab('invoices')
          setIsInvoiceModalOpen(true)
        }}
        onNewItem={() => {
          setCurrentTab('items')
          setIsItemModalTriggered(true)
        }}
        onBackup={handleBackup}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {/* 4. Desktop Workspace Container: Nav Panel + Main Workspace */}
      <div className="desktop-workspace-container">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          dbConnected={!!dbStats}
          storeName={storeSettings?.storeName}
        />

        <main className="desktop-main-workspace">
          <Header currentTab={currentTab} />

          <div className="desktop-content-area">
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={dbStats}
                recentInvoices={invoices}
                lowStockItems={lowStockItems}
                expiringSoonItems={expiringSoonItems}
                onNavigate={setCurrentTab}
                onNewInvoice={() => {
                  setCurrentTab('invoices')
                  setIsInvoiceModalOpen(true)
                }}
                onPrintInvoice={(inv) => setActivePrintInvoice(inv)}
              />
            )}

            {currentTab === 'items' && (
              <ItemsView
                items={items}
                isLoading={loadingItems}
                searchQuery={itemSearch}
                onSearchChange={setItemSearch}
                onAddItem={handleAddItem}
                onAddBatch={handleAddBatch}
                onDeleteItem={handleDeleteItem}
                isModalOpen={isItemModalTriggered}
                setIsModalOpen={setIsItemModalTriggered}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoicesView
                invoices={invoices}
                items={items}
                store={storeSettings}
                isLoading={loadingInvoices}
                isCreateModalOpen={isInvoiceModalOpen}
                setIsCreateModalOpen={setIsInvoiceModalOpen}
                onCreateInvoice={handleCreateInvoice}
              />
            )}

            {currentTab === 'customers' && (
              <CustomersView
                customers={customers}
                isLoading={loadingCustomers}
                searchQuery={customerSearch}
                onSearchChange={setCustomerSearch}
                onAddCustomer={handleAddCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}

            {currentTab === 'settings' && (
              <StoreSettingsView store={storeSettings} onUpdateStore={handleUpdateStore} />
            )}

            {currentTab === 'database' && (
              <DatabaseView
                stats={dbStats}
                appInfo={appInfo}
                onRefresh={async () => {
                  await loadStats()
                  await loadAppInfo()
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* 5. Full-width Windows Multi-pane Status Bar */}
      <StatusBar
        appInfo={appInfo}
        dbStats={dbStats}
        storeName={storeSettings?.storeName}
        storeCity={storeSettings?.city}
        onBackup={handleBackup}
      />

      {/* Global Modals */}
      <DesktopKeyboardModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

      {/* Global Print Modal if triggered from Dashboard */}
      {activePrintInvoice && (
        <CashMemoPrint
          invoice={activePrintInvoice}
          store={storeSettings}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}
    </div>
  )
}

export default App
