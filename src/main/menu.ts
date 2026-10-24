import { Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

export function setupApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const sendAction = (action: string): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.MENU.ACTION, action)
    }
  }

  const template: MenuItemConstructorOptions[] = [
    // macOS Application Menu
    ...(isMac
      ? [
          {
            label: 'Marg ERP',
            submenu: [
              {
                label: 'About Marg ERP 9+',
                click: (): void => sendAction('action:about')
              },
              { type: 'separator' as const },
              {
                label: 'Store Configuration & Drug Licences',
                accelerator: 'CmdOrCtrl+,',
                click: (): void => sendAction('nav:settings')
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // 1. Masters Menu (&Masters -> Alt+M on Windows)
    {
      label: '&Masters',
      submenu: [
        {
          label: 'Medicine & Item Stock Master',
          accelerator: 'F5',
          click: (): void => sendAction('nav:items')
        },
        {
          label: 'Add New Medicine SKU',
          accelerator: 'F4',
          click: (): void => sendAction('action:new-item')
        },
        { type: 'separator' as const },
        {
          label: 'Patient & Customer Accounts Ledger',
          accelerator: 'F7',
          click: (): void => sendAction('nav:customers')
        },
        { type: 'separator' as const },
        {
          label: 'Store Configuration & Form 20/21 Licences',
          accelerator: 'F8',
          click: (): void => sendAction('nav:settings')
        }
      ]
    },

    // 2. Transactions Menu (&Transactions -> Alt+T on Windows)
    {
      label: '&Transactions',
      submenu: [
        {
          label: 'New Cash Memo / Patient Sale Bill',
          accelerator: 'F3',
          click: (): void => sendAction('action:new-invoice')
        },
        {
          label: 'Cash Memo & Prescription Register',
          accelerator: 'F6',
          click: (): void => sendAction('nav:invoices')
        }
      ]
    },

    // 3. Inventory Menu (&Inventory -> Alt+I on Windows)
    {
      label: '&Inventory',
      submenu: [
        {
          label: 'Current Stock Master (Strips:Loose)',
          click: (): void => sendAction('nav:items')
        },
        {
          label: 'Near Expiry Attention Register',
          click: (): void => sendAction('nav:items:near-expiry')
        },
        {
          label: 'Low Stock Reorder Alert Register',
          click: (): void => sendAction('nav:items:low-stock')
        }
      ]
    },

    // 4. Accounts Menu (&Accounts -> Alt+A on Windows)
    {
      label: '&Accounts',
      submenu: [
        {
          label: 'Patient Outstanding Dues Ledger',
          click: (): void => sendAction('nav:customers')
        },
        {
          label: 'Daily Pharmacy Revenue & Collection',
          click: (): void => sendAction('nav:dashboard')
        }
      ]
    },

    // 5. Reports Menu (&Reports -> Alt+R on Windows)
    {
      label: '&Reports',
      submenu: [
        {
          label: 'Daily Pharmacy Operations Overview',
          accelerator: 'F2',
          click: (): void => sendAction('nav:dashboard')
        },
        {
          label: 'GST 5% & 12% Sales Breakdown',
          click: (): void => sendAction('nav:invoices')
        },
        {
          label: 'Batch-wise Expiry Summary',
          click: (): void => sendAction('nav:items')
        }
      ]
    },

    // 6. macOS Edit Menu (Required on macOS for native Cmd+C/Cmd+V/Cmd+Z text field shortcuts)
    ...(isMac
      ? [
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' as const },
              { role: 'redo' as const },
              { type: 'separator' as const },
              { role: 'cut' as const },
              { role: 'copy' as const },
              { role: 'paste' as const },
              { role: 'selectAll' as const }
            ]
          }
        ]
      : []),

    // 7. Client-Facing Help & Support Menu (No technical developer clutter)
    {
      label: '&Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts Cheatsheet',
          accelerator: 'F1',
          click: (): void => sendAction('action:help')
        },
        { type: 'separator' as const },
        {
          label: '1-Click Offline Data Backup',
          accelerator: 'F10',
          click: (): void => sendAction('action:backup')
        },
        { type: 'separator' as const },
        {
          label: 'Check for Updates...',
          click: (): void => sendAction('action:check-updates')
        },
        {
          label: 'About Marg ERP',
          click: (): void => sendAction('action:about')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
