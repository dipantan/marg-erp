# Marg ERP - Enterprise Desktop Application

A modern, high-performance desktop ERP suite built with **Electron + React 19 + TypeScript + SQLite (better-sqlite3)**, powered by **electron-vite**.

---

## 🏛️ Architecture Overview

The application follows strict Electron security guidelines (Context Isolation, Disabled Node Integration in Renderer, Sandboxed Preload, and strongly typed IPC):

```
                  ┌──────────────────────────────────────────────┐
                  │                 Renderer                     │
                  │   React 19 + TypeScript + Vanilla CSS UI     │
                  └──────────────────────┬───────────────────────┘
                                         │ window.api (Typed)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │                 Preload                      │
                  │ contextBridge.exposeInMainWorld('api', ...)  │
                  └──────────────────────┬───────────────────────┘
                                         │ IPC Channels (@shared)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               Main Process                   │
                  │  Lifecycle, Windows, Security, IPC Handlers  │
                  └──────────────────────┬───────────────────────┘
                                         │ Direct Native Call
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           better-sqlite3 Database            │
                  │   WAL Mode, FK Enforced, Atomic Transactions │
                  └──────────────────────────────────────────────┘
```

---

## 📁 Standard Folder Structure

```
marg-erp/
├── build/                      # App packaging assets (icons, macOS entitlements)
├── out/                        # Production build artifacts (main, preload, renderer)
├── src/
│   ├── main/                   # Node.js Electron main process
│   │   ├── db/                 # Embedded SQLite engine
│   │   │   ├── schema.ts       # DDL definitions (products, customers, invoices)
│   │   │   ├── database.ts     # Connection manager & WAL initialization
│   │   │   └── repositories/   # Data access layer (items, customers, invoices)
│   │   ├── ipc/                # Secure IPC registration handlers
│   │   │   └── registerHandlers.ts
│   │   ├── window.ts           # Browser window manager & platform titlebars
│   │   └── index.ts            # Main application lifecycle entrypoint
│   ├── preload/                # Secure contextBridge API definition
│   │   ├── index.ts            # Typed window.api implementation
│   │   └── index.d.ts          # Window interface type extension
│   ├── shared/                 # Single source of truth contracts (shared across processes)
│   │   ├── types.ts            # Domain entity types (ProductItem, Customer, Invoice, etc.)
│   │   └── ipc-channels.ts     # Strongly typed IPC channel enums & IpcApi interface
│   └── renderer/               # Web client UI (React 19)
│       ├── index.html          # HTML shell with CSP and Google Fonts
│       └── src/
│           ├── components/     # Reusable layout UI (Sidebar, Header, StatusBar)
│           ├── views/          # Module pages (Dashboard, Items, Invoices, Customers, Database)
│           ├── styles/         # Modern Vanilla CSS design system & CSS variables
│           ├── App.tsx         # Root state & view orchestrator
│           └── main.tsx        # React DOM mount point
├── tests/                      # Automated Vitest unit test suite
├── electron.vite.config.ts     # Multi-target bundling (main, preload, renderer)
├── electron-builder.yml        # Cross-platform desktop packaging configuration
├── package.json                # Project dependencies, scripts & metadata
└── tsconfig.json               # TypeScript composite project configuration
```

---

## 🛠️ Tooling & Stack

| Technology            | Purpose                                                         |
| :-------------------- | :-------------------------------------------------------------- |
| **Electron**          | Cross-platform desktop runtime                                  |
| **React 19**          | Component-driven UI layer                                       |
| **TypeScript**        | End-to-end type safety across Main, Preload & Renderer          |
| **electron-vite**     | Fast Hot Module Replacement (HMR) and optimized Rollup builds   |
| **better-sqlite3**    | Ultra-fast local SQLite database with write-ahead logging (WAL) |
| **lucide-react**      | Lightweight, modern desktop iconography                         |
| **Vitest**            | Blazing-fast unit test runner                                   |
| **ESLint + Prettier** | Code quality, consistency, and automated formatting             |
| **pnpm**              | Fast, disk-efficient package management                         |

---

## 🚀 Available Scripts

### Development

```bash
# Start Electron dev mode with instant HMR
pnpm run dev
```

### Type Checking & Code Quality

```bash
# Typecheck all Node and Web targets
pnpm run typecheck

# Lint all files with ESLint
pnpm run lint

# Auto-format codebase with Prettier
pnpm run format

# Run automated tests
pnpm run test
```

### Production Build & Packaging

```bash
# Compile and build production bundles
pnpm run build

# Preview packaged distribution
pnpm run start

# Package unpackaged binary directory
pnpm run build:unpack

# Build macOS DMG installer
pnpm run build:mac

# Build Windows NSIS installer
pnpm run build:win

# Build Linux AppImage / DEB package
pnpm run build:linux
```

---

## 🔒 Security Best Practices Implemented

- **Context Isolation Enabled**: Renderer has no direct access to Node.js internals.
- **Node Integration Disabled**: Eliminates remote code execution vulnerabilities.
- **Strict Content Security Policy (CSP)**: Injected in `index.html`.
- **Restricted Window Open & Navigation**: External URLs are automatically intercepted and routed to the user's default OS browser via `shell.openExternal`.
- **Atomic Transactions**: Invoices and stock decrements are processed in single-step SQLite transactions to eliminate race conditions.
