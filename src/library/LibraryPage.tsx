import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  BookOpen,
  Check,
  FileText,
  FolderPlus,
  MoreHorizontal,
  Newspaper,
  Pencil,
  PenLine,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  addItem,
  createFolder,
  deleteFolder,
  deleteItemUndoable,
  getHighlights,
  getNotesDoc,
  renameFolder,
  restoreItem,
  signOut,
  toggleItemFolder,
  updateItem,
  useFolders,
  useItems,
  type ItemSnapshot,
} from '../storage/db'
import { Logo } from '../components/Logo'
import { AssistantToggle } from '../ai/Assistant'
import type { Folder, Item, ItemStatus } from '../types'
import { ConfirmDialog, Modal } from '../components/Modal'
import { AddDialog } from './AddDialog'
import {
  applyView,
  filterChoices,
  hostOf,
  NO_FILTERS,
  SORTS,
  STATUSES,
  statusOf,
  validFilters,
  type Filters,
  type SortOrder,
} from './libraryView'

/** How long the "Undo" toast stays up after a delete. */
const UNDO_MS = 6000

interface PendingDelete {
  item: Item
  highlights: number
  notes: number
  hasNotesPage: boolean
}

type FolderDialog = { mode: 'create'; addItemId?: string } | { mode: 'rename'; folder: Folder }

export function LibraryPage() {
  const items = useItems()
  const folders = useFolders() ?? []
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<ItemStatus>('in-progress')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [rawFilters, setFilters] = useState<Filters>(NO_FILTERS)
  const [toDelete, setToDelete] = useState<PendingDelete | null>(null)
  const [undo, setUndo] = useState<ItemSnapshot | null>(null)
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)

  const filters = validFilters(rawFilters, folders)
  const filtering = filters.platform !== null || filters.author !== null || filters.folderId !== null
  const all = items ?? []
  const choices = filterChoices(all)
  const shown = applyView(all, tab, filters, sort)
  const inTab = all.filter((i) => statusOf(i) === tab).length

  async function askDelete(item: Item) {
    const [highlights, notesDoc] = await Promise.all([getHighlights(item.id), getNotesDoc(item.id)])
    setToDelete({
      item,
      highlights: highlights.length,
      notes: highlights.filter((h) => h.note.trim()).length,
      hasNotesPage: notesDoc !== undefined,
    })
  }

  return (
    <div className="library-theme min-h-full bg-paper">
      <div className="mx-auto max-w-3xl px-8 py-14">
        <header className="flex items-end justify-between border-b border-rule pb-6">
          <div>
            <h1>
              <Logo mark="turtle" />
            </h1>
            <p className="mt-2 text-sm text-ink-soft">Your reading notebook</p>
          </div>
          <div className="flex items-center gap-2">
            <AssistantToggle />
            <button className="btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add to library
            </button>
          </div>
        </header>

        {items === undefined ? (
          <p className="py-16 text-center text-sm text-ink-faint">Loading your library…</p>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl font-semibold">Your library is empty.</p>
            <p className="mt-2 text-sm text-ink-soft">Add a PDF or an article link to start reading.</p>
          </div>
        ) : (
          <>
            <StatusTabs items={items} active={tab} onChange={setTab} />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Select label="Sort" value={sort} onChange={(v) => setSort(v as SortOrder)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Platform"
                value={filters.platform ?? ''}
                onChange={(v) => setFilters({ ...filters, platform: v || null })}
              >
                <option value="">All platforms</option>
                {choices.platforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value} ({p.count})
                  </option>
                ))}
              </Select>
              <Select
                label="Author"
                value={filters.author ?? ''}
                onChange={(v) => setFilters({ ...filters, author: v || null })}
                disabled={choices.authors.length === 0}
              >
                <option value="">{choices.authors.length ? 'All authors' : 'No authors found'}</option>
                {choices.authors.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.value} ({a.count})
                  </option>
                ))}
              </Select>
              <Select
                label="Folder"
                value={filters.folderId ?? ''}
                onChange={(v) => setFilters({ ...filters, folderId: v || null })}
                disabled={folders.length === 0}
              >
                <option value="">{folders.length ? 'All folders' : 'No folders yet'}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {filtering && (
                <button
                  onClick={() => setFilters(NO_FILTERS)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                >
                  <X size={14} /> Reset filters
                </button>
              )}
            </div>

            <FolderBar
              folders={folders}
              items={items}
              activeId={filters.folderId}
              onSelect={(id) => setFilters({ ...filters, folderId: filters.folderId === id ? null : id })}
              onCreate={() => setFolderDialog({ mode: 'create' })}
              onRename={(folder) => setFolderDialog({ mode: 'rename', folder })}
              onDelete={setFolderToDelete}
            />

            {filtering && inTab > 0 && (
              <p className="mt-5 text-xs text-ink-faint">
                Showing {shown.length} of {inTab} in {STATUSES.find((s) => s.id === tab)?.label}
              </p>
            )}

            {shown.length === 0 ? (
              <div className="py-16 text-center">
                {inTab === 0 ? (
                  <p className="text-sm text-ink-soft">
                    Nothing in {STATUSES.find((s) => s.id === tab)?.label} yet. Use an item's{' '}
                    <MoreHorizontal size={14} className="inline align-[-2px]" aria-label="menu" /> menu to move it here.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">No items match these filters.</p>
                    <button onClick={() => setFilters(NO_FILTERS)} className="btn-ghost mt-3">
                      Reset filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-rule">
                {shown.map((item) => (
                  <LibraryRow
                    key={item.id}
                    item={item}
                    folders={folders}
                    onMove={(status) => updateItem(item.id, { status })}
                    onToggleFolder={(folderId) => toggleItemFolder(item.id, folderId)}
                    onNewFolder={() => setFolderDialog({ mode: 'create', addItemId: item.id })}
                    onDelete={() => askDelete(item)}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {adding && (
          <AddDialog
            onClose={() => setAdding(false)}
            onReady={async (item, file) => {
              // New items start in the tab the library opens on, so they're easy to find.
              await addItem({ ...item, status: 'in-progress' }, file)
              setTab('in-progress')
              setAdding(false)
            }}
          />
        )}

        {toDelete && (
          <ConfirmDialog
            title="Delete from library?"
            message={<DeleteMessage pending={toDelete} />}
            confirmLabel="Delete"
            onCancel={() => setToDelete(null)}
            onConfirm={async () => {
              const id = toDelete.item.id
              setToDelete(null)
              const snapshot = await deleteItemUndoable(id)
              if (snapshot) setUndo(snapshot)
            }}
          />
        )}

        {folderDialog && (
          <FolderNameDialog
            title={folderDialog.mode === 'create' ? 'New folder' : 'Rename folder'}
            initial={folderDialog.mode === 'rename' ? folderDialog.folder.name : ''}
            confirmLabel={folderDialog.mode === 'create' ? 'Create folder' : 'Rename'}
            taken={folders
              .filter((f) => folderDialog.mode === 'create' || f.id !== folderDialog.folder.id)
              .map((f) => f.name)}
            onCancel={() => setFolderDialog(null)}
            onSave={async (name) => {
              setFolderDialog(null)
              if (folderDialog.mode === 'rename') return renameFolder(folderDialog.folder.id, name)
              const folder = await createFolder(name)
              if (folderDialog.addItemId) await toggleItemFolder(folderDialog.addItemId, folder.id)
            }}
          />
        )}

        {folderToDelete && (
          <ConfirmDialog
            title="Delete folder?"
            message={
              <>
                The folder <span className="font-medium text-ink">{folderToDelete.name}</span> will be deleted. The items
                in it stay in your library.
              </>
            }
            confirmLabel="Delete folder"
            onCancel={() => setFolderToDelete(null)}
            onConfirm={() => {
              deleteFolder(folderToDelete.id)
              setFolderToDelete(null)
            }}
          />
        )}

        {undo && (
          <UndoToast
            key={undo.item.id}
            message={
              <>
                Deleted <span className="font-medium">{undo.item.title}</span>
              </>
            }
            onUndo={() => {
              restoreItem(undo)
              setUndo(null)
            }}
            onDone={() => setUndo(null)}
          />
        )}
      </div>
    </div>
  )
}

function DeleteMessage({ pending }: { pending: PendingDelete }) {
  const { item, highlights, notes, hasNotesPage } = pending
  const parts = [
    highlights > 0 && `${highlights} ${highlights === 1 ? 'highlight' : 'highlights'}`,
    notes > 0 && `${notes} ${notes === 1 ? 'note' : 'notes'}`,
    hasNotesPage && 'its Notes page',
  ].filter(Boolean) as string[]
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return (
    <>
      <p>
        <span className="font-medium text-ink">{item.title}</span> will be removed from your library.
      </p>
      {list && (
        <p className="mt-3 rounded-lg bg-notice px-3 py-2 text-sm text-ink">
          This item has {list}. They'll be deleted too.
        </p>
      )}
      <p className="mt-3 text-sm">You can undo for a few seconds afterwards.</p>
    </>
  )
}

// --- status tabs -------------------------------------------------------------

function StatusTabs({
  items,
  active,
  onChange,
}: {
  items: Item[]
  active: ItemStatus
  onChange: (s: ItemStatus) => void
}) {
  return (
    <div role="tablist" aria-label="Reading status" className="mt-6 flex gap-6 border-b border-rule">
      {STATUSES.map((s) => {
        const count = items.filter((i) => statusOf(i) === s.id).length
        const selected = s.id === active
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(s.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors ${
              selected ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {s.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                selected ? 'bg-sage text-ink' : 'bg-paper-deep text-ink-soft'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  const active = label !== 'Sort' && value !== ''
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${
        active ? 'border-ink bg-paper-deep' : 'border-rule bg-surface'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="text-ink-soft">{label}:</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${label === 'Sort' ? '' : 'max-w-44'} cursor-pointer truncate bg-transparent font-medium text-ink outline-none disabled:cursor-not-allowed`}
      >
        {children}
      </select>
    </label>
  )
}

// --- folders -----------------------------------------------------------------

function FolderBar({
  folders,
  items,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  folders: Folder[]
  items: Item[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (f: Folder) => void
  onDelete: (f: Folder) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Folders</span>
      {folders.map((f) => {
        const count = items.filter((i) => i.folderIds?.includes(f.id)).length
        const active = f.id === activeId
        return (
          <span
            key={f.id}
            className={`group/folder inline-flex items-center rounded-full border text-sm ${
              active ? 'border-ink bg-ink text-white' : 'border-rule bg-surface text-ink'
            }`}
          >
            <button
              onClick={() => onSelect(f.id)}
              aria-pressed={active}
              title={active ? 'Show all folders' : `Show only ${f.name}`}
              className="py-1 pl-3 pr-1.5"
            >
              {f.name} <span className={`tabular-nums ${active ? 'text-white/75' : 'text-ink-faint'}`}>{count}</span>
            </button>
            <button
              onClick={() => onRename(f)}
              className="rounded-full p-1 opacity-60 hover:opacity-100 focus:opacity-100"
              title="Rename folder"
              aria-label={`Rename folder ${f.name}`}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(f)}
              className="mr-1 rounded-full p-1 opacity-60 hover:opacity-100 focus:opacity-100"
              title="Delete folder"
              aria-label={`Delete folder ${f.name}`}
            >
              <Trash2 size={12} />
            </button>
          </span>
        )
      })}
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-faint px-3 py-1 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        <FolderPlus size={14} /> New folder
      </button>
    </div>
  )
}

function FolderNameDialog({
  title,
  initial,
  confirmLabel,
  taken,
  onSave,
  onCancel,
}: {
  title: string
  initial: string
  confirmLabel: string
  taken: string[]
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial)
  const trimmed = name.trim()
  const duplicate = taken.some((t) => t.toLowerCase() === trimmed.toLowerCase())
  return (
    <Modal title={title} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed && !duplicate) onSave(trimmed)
        }}
      >
        <input
          autoFocus
          className="field"
          placeholder="e.g. Economics, Paul Graham, Substack…"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          aria-label="Folder name"
        />
        {duplicate && <p className="mt-2 text-sm text-ink-soft">You already have a folder with that name.</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button className="btn-primary" disabled={!trimmed || duplicate}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// --- rows --------------------------------------------------------------------

function LibraryRow({
  item,
  folders,
  onMove,
  onToggleFolder,
  onNewFolder,
  onDelete,
}: {
  item: Item
  folders: Folder[]
  onMove: (s: ItemStatus) => void
  onToggleFolder: (folderId: string) => void
  onNewFolder: () => void
  onDelete: () => void
}) {
  const TypeIcon = item.type === 'pdf' ? FileText : Newspaper
  const source =
    item.type === 'pdf' ? `PDF · ${item.pageCount} pages` : `Article · ${hostOf(item.sourceUrl) ?? 'pasted text'}`
  const progress = Math.round(item.progress)
  const sections = item.chapters.filter((c) => c.title).length
  const itemFolders = folders.filter((f) => item.folderIds?.includes(f.id))

  return (
    <li className="group flex items-center gap-5 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-ink-soft">
        <TypeIcon size={20} strokeWidth={1.6} />
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={`/read/${item.id}`}
          className="block truncate font-serif text-xl font-semibold leading-snug hover:text-accent-dark hover:underline"
        >
          {item.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-faint">
          {item.author && `${item.author} · `}
          {source}
          {sections > 0 && ` · ${sections} ${sections === 1 ? 'section' : 'sections'}`} · added{' '}
          {new Date(item.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
        {itemFolders.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {itemFolders.map((f) => (
              <span key={f.id} className="rounded bg-paper-deep px-1.5 py-0.5 text-[11px] text-ink-soft">
                {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-3">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-rule"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reading progress"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-ink-faint">{progress}%</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link to={`/read/${item.id}`} className="icon-btn" title="Read" aria-label={`Read ${item.title}`}>
          <BookOpen size={19} strokeWidth={1.7} />
        </Link>
        <Link to={`/notes/${item.id}`} className="icon-btn" title="Notes" aria-label={`Notes for ${item.title}`}>
          <PenLine size={19} strokeWidth={1.7} />
        </Link>
        <ItemMenu
          item={item}
          folders={folders}
          onMove={onMove}
          onToggleFolder={onToggleFolder}
          onNewFolder={onNewFolder}
          onDelete={onDelete}
        />
      </div>
    </li>
  )
}

function ItemMenu({
  item,
  folders,
  onMove,
  onToggleFolder,
  onNewFolder,
  onDelete,
}: {
  item: Item
  folders: Folder[]
  onMove: (s: ItemStatus) => void
  onToggleFolder: (folderId: string) => void
  onNewFolder: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  const current = statusOf(item)

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
        title="More actions"
        aria-label={`More actions for ${item.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={19} strokeWidth={1.7} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-60 rounded-xl border border-rule bg-surface py-1.5 text-sm shadow-lg shadow-ink/10"
        >
          <MenuLabel>Move to</MenuLabel>
          {STATUSES.filter((s) => s.id !== current).map((s) => (
            <MenuItem key={s.id} onClick={close(() => onMove(s.id))}>
              Move to {s.label}
            </MenuItem>
          ))}

          <div className="my-1.5 border-t border-rule" />
          <MenuLabel>Add to folder</MenuLabel>
          {folders.map((f) => {
            const inFolder = item.folderIds?.includes(f.id) ?? false
            return (
              <MenuItem
                key={f.id}
                role="menuitemcheckbox"
                checked={inFolder}
                onClick={() => onToggleFolder(f.id)}
                icon={<Check size={15} className={inFolder ? '' : 'invisible'} />}
              >
                <span className="truncate">{f.name}</span>
              </MenuItem>
            )
          })}
          <MenuItem onClick={close(onNewFolder)} icon={<FolderPlus size={15} />}>
            New folder…
          </MenuItem>

          <div className="my-1.5 border-t border-rule" />
          <MenuItem onClick={close(onDelete)} icon={<Trash2 size={15} />}>
            Delete…
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{children}</p>
}

function MenuItem({
  children,
  onClick,
  icon,
  role = 'menuitem',
  checked,
}: {
  children: ReactNode
  onClick: () => void
  icon?: ReactNode
  role?: 'menuitem' | 'menuitemcheckbox'
  checked?: boolean
}) {
  return (
    <button
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-ink hover:bg-paper-deep"
    >
      {icon}
      {children}
    </button>
  )
}

// --- undo toast --------------------------------------------------------------

function UndoToast({ message, onUndo, onDone }: { message: ReactNode; onUndo: () => void; onDone: () => void }) {
  // Kept in a ref so the timer isn't restarted whenever the page re-renders.
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const t = setTimeout(() => done.current(), UNDO_MS)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-4 rounded-xl bg-ink py-3 pl-5 pr-3 text-sm text-white shadow-xl"
    >
      <span className="truncate">{message}</span>
      <button onClick={onUndo} className="shrink-0 rounded-lg px-3 py-1 font-semibold text-sage hover:bg-white/10">
        Undo
      </button>
    </div>
  )
}
