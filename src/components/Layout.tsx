import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, LayoutGrid, ShoppingBasket, Shirt, PiggyBank, Repeat, Settings, Plus, Menu, X } from 'lucide-react'
import { Sheet } from './ui'
import { TransactionForm } from './TransactionForm'
import type { Transaction } from '../db/db'

type AddCtx = { openAdd: (opts?: { categoryId?: string }) => void; openEdit: (tx: Transaction) => void }
const Ctx = createContext<AddCtx>({ openAdd: () => {}, openEdit: () => {} })
export const useTxSheet = () => useContext(Ctx)

const NAV = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/espaces', label: 'Espaces', icon: LayoutGrid },
  { to: '/courses', label: 'Courses', icon: ShoppingBasket },
  { to: '/garde-robe', label: 'Garde-robe', icon: Shirt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/abonnements', label: 'Abonnements', icon: Repeat },
  { to: '/reglages', label: 'Réglages', icon: Settings },
]
const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[3]]

export function Layout() {
  const [state, setState] = useState<{ open: boolean; tx?: Transaction; categoryId?: string }>({ open: false })
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [loc.pathname])

  // iOS (app installée) : quand le clavier s'ouvre, le système fait glisser la fenêtre
  // pour montrer le champ actif, et ne la redescend pas toujours à la fermeture. On
  // remet la fenêtre à zéro dès qu'aucun champ n'a le focus.
  useEffect(() => {
    const isEditing = () => {
      const el = document.activeElement as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    }
    const reset = () => {
      if (isEditing()) return
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    const later = () => {
      requestAnimationFrame(reset)
      setTimeout(reset, 120)
      setTimeout(reset, 400)
    }
    document.addEventListener('focusout', later)
    window.visualViewport?.addEventListener('resize', later)
    window.visualViewport?.addEventListener('scroll', later)
    window.addEventListener('orientationchange', later)
    return () => {
      document.removeEventListener('focusout', later)
      window.visualViewport?.removeEventListener('resize', later)
      window.visualViewport?.removeEventListener('scroll', later)
      window.removeEventListener('orientationchange', later)
    }
  }, [])

  const openAdd = useCallback((opts?: { categoryId?: string }) => setState({ open: true, categoryId: opts?.categoryId }), [])
  const openEdit = useCallback((tx: Transaction) => setState({ open: true, tx }), [])
  const close = useCallback(() => setState({ open: false }), [])
  const ctx = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit])

  return (
    <Ctx.Provider value={ctx}>
      <div className="flex h-full flex-col overflow-hidden lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 h-full">
          <Brand />
          <nav className="mt-8 flex-1 space-y-1">
            {NAV.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </nav>
          <button className="btn btn-primary w-full" onClick={() => openAdd()}>
            <Plus size={18} /> Ajouter
          </button>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden shrink-0 z-30 safe-top bg-page/85 backdrop-blur border-b border-line">
          <div className="flex items-center justify-between px-4 h-14">
            <Brand compact />
            <button className="btn btn-ghost !p-2 rounded-full" onClick={() => setMenu(true)} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </header>

        <div ref={scroller} className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <main className="px-4 pt-4 pb-8 lg:px-10 lg:py-8 max-w-6xl w-full mx-auto">
            <div key={loc.pathname} className="rise">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden shrink-0 z-30 safe-bottom bg-surface/90 backdrop-blur border-t border-line relative after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-surface">
          <div className="relative grid grid-cols-5 h-16 items-center">
            {MOBILE.slice(0, 2).map((n) => (
              <TabItem key={n.to} {...n} />
            ))}
            <div className="flex justify-center">
              <button onClick={() => openAdd()} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-card active:scale-95 transition" aria-label="Ajouter une transaction">
                <Plus size={26} />
              </button>
            </div>
            {MOBILE.slice(2).map((n) => (
              <TabItem key={n.to} {...n} />
            ))}
          </div>
        </nav>

        {/* Mobile menu sheet */}
        {menu && (
          <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/40 fade-in" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-0 h-full w-72 bg-surface p-5 safe-top shadow-card fade-in">
              <div className="flex items-center justify-between">
                <Brand compact />
                <button className="btn btn-ghost !p-2 rounded-full" onClick={() => setMenu(false)} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
              <nav className="mt-6 space-y-1" onClick={() => setMenu(false)}>
                {NAV.map((n) => (
                  <NavItem key={n.to} {...n} />
                ))}
              </nav>
            </div>
          </div>
        )}

        <Sheet open={state.open} onClose={close} title={state.tx ? 'Modifier la transaction' : 'Nouvelle transaction'}>
          {state.open && <TransactionForm initial={state.tx} defaultCategoryId={state.categoryId} onDone={close} />}
        </Sheet>
      </div>
    </Ctx.Provider>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-8 w-8 rounded-xl" />
      <span className={`font-semibold tracking-tight ${compact ? 'text-base' : 'text-lg'}`}>Finances</span>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ComponentType<{ size?: number }>; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

function TabItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ComponentType<{ size?: number }>; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-ink-3'}`}>
      <Icon size={22} />
      {label}
    </NavLink>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return <>{children}</>
}
