// The v2 app shell: a vertical sidebar (logo → Library → Most recent read …
// Account at the bottom) beside the page. It replaces every top-nav link.
//
// DEFAULT: inside the reader the sidebar starts collapsed to icons so reading
// stays focused. Elsewhere it remembers the viewer's choice. In browser full
// screen ("Focus") it hides completely.

import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, matchPath } from 'react-router'
import { Activity, BookOpenText, CircleUserRound, CloudOff, Check, LayoutGrid, Library, PanelLeftClose, PanelLeftOpen, Puzzle, Table2 } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { useItems } from '../storage/db'
import { devStore, metaOf, mostRecentId, useDev, useProto } from '../proto/store'
import { track } from '../events/track'
import { Tooltip } from './Tooltip'
import { DevNote } from '../dev/DevNote'

export function AppShell() {
  const location = useLocation()
  const inReader = !!matchPath('/read/:id', location.pathname)
  const savedCollapsed = useDev((s) => s.sidebarCollapsed)
  // Reader: collapsed each time a reading opens, until the reader expands it.
  const [readerExpanded, setReaderExpanded] = useState({ path: location.pathname, open: false })
  if (inReader && readerExpanded.path !== location.pathname) setReaderExpanded({ path: location.pathname, open: false })
  const collapsed = inReader ? !readerExpanded.open : savedCollapsed
  const fullscreen = useIsFullscreen()

  const toggle = () => {
    if (inReader) setReaderExpanded({ path: location.pathname, open: collapsed })
    else devStore.set({ sidebarCollapsed: !collapsed })
  }

  return (
    <div className="flex h-full">
      {!fullscreen && <Sidebar collapsed={collapsed} onToggle={toggle} />}
      <main id="main" className="relative min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const items = useItems()
  const meta = useProto((s) => s.meta)
  const offline = useDev((s) => s.offline)
  const lastSyncAt = useProto((s) => s.lastSyncAt)
  const location = useLocation()
  const navigate = useNavigate()

  const liveIds = useMemo(() => new Set((items ?? []).map((i) => i.id)), [items])
  const recentId = items ? mostRecentId(meta, liveIds) : null
  const recentActive = !!recentId && location.pathname === `/read/${recentId}`

  const itemClass = (active: boolean) =>
    `flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
      active ? 'bg-accent-soft text-accent-dark' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
    } ${collapsed ? 'justify-center px-0' : ''}`

  return (
    <nav
      aria-label="Main"
      className={`flex shrink-0 flex-col border-r border-rule bg-paper-deep/60 py-4 transition-[width] duration-200 ${
        collapsed ? 'w-sidebar-collapsed px-2' : 'w-sidebar px-3'
      }`}
    >
      <Link
        to="/library"
        className={`mb-6 flex items-center gap-2.5 rounded-lg ${collapsed ? 'justify-center' : 'px-2'}`}
        aria-label="Quiescent, go to Library"
      >
        <LogoMark size={collapsed ? 32 : 30} />
        {!collapsed && <span className="font-serif font-semibold text-xl tracking-tight">Quiescent</span>}
      </Link>

      <ul className="space-y-1">
        <li>
          <Tooltip label="Library" show={collapsed}>
            <NavLink
              to="/library"
              className={({ isActive }) => itemClass(isActive)}
              aria-label={collapsed ? 'Library' : undefined}
            >
              <Library size={19} strokeWidth={1.8} />
              {!collapsed && 'Library'}
            </NavLink>
          </Tooltip>
        </li>
        <li>
          {recentId ? (
            <Tooltip label="Most recent read" show={collapsed}>
              <button
                type="button"
                className={itemClass(recentActive)}
                aria-current={recentActive ? 'page' : undefined}
                aria-label={collapsed ? 'Most recent read' : undefined}
                onClick={() => {
                  track('most_recent_read_clicked', { item_id: recentId, status: metaOf(recentId).status })
                  navigate(`/read/${recentId}`, { state: { entry: 'most_recent' } })
                }}
              >
                <BookOpenText size={19} strokeWidth={1.8} />
                {!collapsed && 'Most recent read'}
              </button>
            </Tooltip>
          ) : (
            <Tooltip label="Open something from your Library first">
              <button
                type="button"
                aria-disabled="true"
                aria-label="Most recent read (disabled): Open something from your Library first"
                className={`${itemClass(false)} cursor-not-allowed opacity-45 hover:bg-transparent hover:text-ink-soft`}
                onClick={(e) => e.preventDefault()}
              >
                <BookOpenText size={19} strokeWidth={1.8} />
                {!collapsed && 'Most recent read'}
              </button>
            </Tooltip>
          )}
        </li>
      </ul>

      {!collapsed && (
        <DevNote className="mt-4">
          Most recent read = the item with the latest open time, any status. Disabled until something has been opened.
          Sidebar starts collapsed inside the reader (DEFAULT).
        </DevNote>
      )}

      <div className="flex-1" />

      {/* Prototype-only entry points: not part of the product's navigation. */}
      <div className={`mb-3 border-t border-dashed border-rule pt-3 ${collapsed ? '' : 'px-1'}`}>
        {!collapsed && <p className="eyebrow mb-1 px-2">Prototype tools</p>}
        <ul className="space-y-0.5">
          <ToolLink collapsed={collapsed} to="/demo-browser" icon={<Puzzle size={17} />} label="Chrome extension (demo)" itemClass={itemClass} />
          <li>
            <Tooltip label="Event log" show={collapsed}>
              <button
                type="button"
                className={`${itemClass(false)} h-9`}
                aria-label={collapsed ? 'Event log' : undefined}
                onClick={() => devStore.set({ panelOpen: true, panelTab: 'events' })}
              >
                <Activity size={17} />
                {!collapsed && 'Event log (live)'}
              </button>
            </Tooltip>
          </li>
          <ToolLink collapsed={collapsed} to="/events" icon={<Table2 size={17} />} label="Event dictionary" itemClass={itemClass} />
          <ToolLink collapsed={collapsed} to="/screens" icon={<LayoutGrid size={17} />} label="All screens & states" itemClass={itemClass} />
        </ul>
      </div>

      <div
        role="status"
        className={`mb-2 flex items-center gap-2 text-xs ${offline ? 'text-warn' : 'text-ink-faint'} ${collapsed ? 'justify-center' : 'px-3'}`}
        title={offline ? "Offline, changes won't save" : `Synced ${relTime(lastSyncAt)}`}
      >
        {offline ? <CloudOff size={14} /> : <Check size={14} />}
        {!collapsed && (offline ? "Offline, changes won't save" : `Synced ${relTime(lastSyncAt)}`)}
        {collapsed && <span className="sr-only">{offline ? "Offline, changes won't save" : 'Synced'}</span>}
      </div>

      <Tooltip label="Account" show={collapsed}>
        <NavLink to="/account" className={({ isActive }) => itemClass(isActive)} aria-label={collapsed ? 'Account' : undefined}>
          <CircleUserRound size={19} strokeWidth={1.8} />
          {!collapsed && 'Account'}
        </NavLink>
      </Tooltip>

      <button
        type="button"
        onClick={() => {
          onToggle()
        }}
        className={`mt-1 ${itemClass(false)} text-ink-faint`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </nav>
  )
}

function ToolLink(props: { collapsed: boolean; to: string; icon: React.ReactNode; label: string; itemClass: (active: boolean) => string }) {
  return (
    <li>
      <Tooltip label={props.label} show={props.collapsed}>
        <Link to={props.to} className={`${props.itemClass(false)} h-9`} aria-label={props.collapsed ? props.label : undefined}>
          {props.icon}
          {!props.collapsed && props.label}
        </Link>
      </Tooltip>
    </li>
  )
}

function useIsFullscreen() {
  const [on, setOn] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  return on
}

export function relTime(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}
