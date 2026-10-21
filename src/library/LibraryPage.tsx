// Library v2: two Notion-style views on one page.
//
//   /library                     By Status (In progress · Read later · Finished)
//   /library?view=folders        By Folder (grid of steles) — only once ≥ 1 folder exists
//   /library/folders/:folderId   Folder detail
//
// No sort or filter controls (removed in v2). Query params for /screens:
//   ?upload=picker|uploading|success|wrong-type|too-large   open Upload in that state
//   ?new=<folderId>                                         highlight a just-created folder
//   ?create=1 · ?addto=<itemId> · ?remove=<itemId>           open Create folder / Add to folder / Remove confirm
//   (folder detail) ?rename=1 · ?add=1 · ?delete=1           open Rename / Add items / Delete confirm

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ChevronRight, FolderPlus, Pencil, Plus, Puzzle, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog } from '../components/Modal'
import { SteleIcon } from '../icons/SteleIcon'
import { Badge, DevNote } from '../dev/DevNote'
import { STATUSES, STATUS_LABEL, patchMeta, protoStore, useProto, type Folder, type Status } from '../proto/store'
import { deleteFolder, removeFromFolder, removeItem } from '../proto/actions'
import { track } from '../events/track'
import { ItemCard, type CardActions } from './ItemCard'
import { AddToFolderDialog, CreateFolderDialog, FolderItemsDialog, RenameFolderDialog } from './FolderDialogs'
import { DEMO_UPLOAD_STATES, UploadDialog, type UploadState } from './UploadDialog'
import { groupByStatus, useLibrary, type Entry } from './useLibrary'

export function LibraryPage() {
  const { folderId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const entries = useLibrary()
  const folders = useProto((s) => s.folders)
  const extensionConnected = useProto((s) => s.extensionConnected)

  const [creating, setCreating] = useState(() => params.get('create') === '1')
  const [uploading, setUploading] = useState<UploadState | null>(() => {
    const u = params.get('upload')
    return u ? (DEMO_UPLOAD_STATES[u] ?? { kind: 'picker' }) : null
  })
  const [addingToFolder, setAddingToFolder] = useState<Entry | null>(null)
  const [toRemove, setToRemove] = useState<Entry | null>(null)
  // Deep links from /screens open a card dialog once the library has loaded.
  const deepLinked = useRef(false)
  useEffect(() => {
    if (!entries || deepLinked.current) return
    deepLinked.current = true
    const find = (id: string | null) => entries.find((e) => e.item.id === id) ?? null
    if (params.get('addto')) setAddingToFolder(find(params.get('addto')))
    if (params.get('remove')) setToRemove(find(params.get('remove')))
  }, [entries, params])

  const folder = folderId ? folders.find((f) => f.id === folderId) : undefined
  const view: 'status' | 'folders' = folderId || (params.get('view') === 'folders' && folders.length > 0) ? 'folders' : 'status'

  // By Folder disappears with the last folder: fall back to By Status.
  useEffect(() => {
    if (params.get('view') === 'folders' && folders.length === 0) navigate('/library', { replace: true })
    if (folderId && !folder) navigate(folders.length ? '/library?view=folders' : '/library', { replace: true })
  }, [params, folders.length, folderId, folder, navigate])

  // item_fetched: the web app loads a save made in the extension for the first time.
  const meta = useProto((s) => s.meta)
  useEffect(() => {
    for (const [id, m] of Object.entries(meta)) {
      if (m.via === 'extension' && !m.fetched) {
        track('item_fetched', { item_id: id, ms_since_save_confirmed: Date.now() - (m.confirmedAt ?? Date.now()) })
        patchMeta(id, { fetched: true })
      }
    }
  }, [meta])

  const actions: CardActions = {
    onAddToFolder: setAddingToFolder,
    onRemove: setToRemove,
    onRemoveFromFolder: folder ? (e) => removeFromFolder(folder.id, e.item.id) : undefined,
  }

  function switchView(to: 'status' | 'folders') {
    track('library_view_switched', { to, folder_count: folders.length })
    navigate(to === 'folders' ? '/library?view=folders' : '/library')
  }

  return (
    <div className="mx-auto max-w-6xl px-8 pb-24 pt-10">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-rule">
        <h1 className="pb-3 font-serif text-3xl">Library</h1>
        <div role="tablist" aria-label="Library views" className="flex gap-1">
          <ViewTab active={view === 'status'} onClick={() => switchView('status')}>
            By Status
          </ViewTab>
          {folders.length > 0 && (
            <ViewTab active={view === 'folders'} onClick={() => switchView('folders')}>
              By Folder
            </ViewTab>
          )}
        </div>
        <div className="ml-auto flex gap-2 pb-3">
          <button className="btn-secondary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create new folder
          </button>
          <button className="btn-primary" onClick={() => setUploading({ kind: 'picker' })}>
            <Upload size={16} /> Upload
          </button>
        </div>
      </header>

      <DevNote className="mt-4">
        Two views, one page (Notion-style tabs). <b>By Folder</b> appears once ≥ 1 folder exists and disappears when the last
        folder is deleted. No sort or filter (removed in v2). Folders <Badge kind="P0 pending dev estimate" /> — the PRD has
        "custom shelves" as Phase 2. <Badge kind="proposed — not in PRD" />
      </DevNote>

      {entries === undefined ? (
        <p className="py-16 text-center text-sm text-ink-faint">Loading your library…</p>
      ) : entries.length === 0 && view === 'status' ? (
        <EmptyLibrary onUpload={() => setUploading({ kind: 'picker' })} />
      ) : (
        <>
          {!extensionConnected && <InstallBanner />}
          {view === 'status' && <StatusView entries={entries} actions={actions} />}
          {view === 'folders' && !folder && <FolderGrid folders={folders} highlightId={params.get('new')} onSeen={() => setParams({ view: 'folders' }, { replace: true })} />}
          {view === 'folders' && folder && <FolderDetail folder={folder} entries={entries} actions={actions} />}
        </>
      )}

      {creating && entries && (
        <CreateFolderDialog
          entries={entries}
          onClose={() => setCreating(false)}
          onCreated={(f) => {
            setCreating(false)
            navigate(`/library?view=folders&new=${f.id}`)
          }}
        />
      )}
      {uploading && (
        <UploadDialog
          initial={uploading}
          onClose={() => {
            setUploading(null)
            if (params.has('upload')) {
              params.delete('upload')
              setParams(params, { replace: true })
            }
          }}
        />
      )}
      {addingToFolder && <AddToFolderDialog entry={addingToFolder} onClose={() => setAddingToFolder(null)} />}
      {toRemove && (
        <ConfirmDialog
          title="Remove from library?"
          message={
            <>
              <span className="font-medium text-ink">{toRemove.item.title}</span> and all of its highlights and notes will be
              deleted, and it leaves every folder it's in. This can't be undone.
            </>
          }
          confirmLabel="Remove"
          onCancel={() => setToRemove(null)}
          onConfirm={() => {
            removeItem(toRemove.item.id)
            setToRemove(null)
          }}
        />
      )}
    </div>
  )
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors ${
        active ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// --- By Status ---------------------------------------------------------------------

const EMPTY_LINE: Record<Status, string> = {
  in_progress: 'Nothing in progress. Open something from Read later to start.',
  read_later: 'Nothing waiting. Save an article from Chrome or upload a PDF.',
  finished: 'Nothing finished yet. Mark a reading as finished from the reader or its ⋯ menu.',
}

function StatusView({ entries, actions }: { entries: Entry[]; actions: CardActions }) {
  const groups = useMemo(() => groupByStatus(entries), [entries])
  return (
    <div className="mt-8 space-y-10" role="tabpanel" aria-label="By Status">
      {STATUSES.map((status) => (
        <section key={status} aria-labelledby={`grp-${status}`}>
          <h2 id={`grp-${status}`} className="mb-3 flex items-baseline gap-2">
            <span className="font-serif text-xl">{STATUS_LABEL[status]}</span>
            <span className="rounded-full bg-paper-deep px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">{groups[status].length}</span>
          </h2>
          {groups[status].length === 0 ? (
            <p className="rounded-xl border border-dashed border-rule px-4 py-4 text-sm text-ink-faint">{EMPTY_LINE[status]}</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
              {groups[status].map((e) => (
                <ItemCard key={e.item.id} entry={e} actions={actions} />
              ))}
            </ul>
          )}
        </section>
      ))}
      <DevNote>
        DEFAULT order, no user-facing sort: In progress by last opened · Read later by last saved · Finished by last finished.
        DEFAULT status rules: new saves → Read later (In progress if saved with "Read now"); opening a Read later item →
        In progress; Finished is set by hand (reader button or ⋯ menu). Opening a Finished item keeps it Finished.
      </DevNote>
    </div>
  )
}

// --- By Folder ------------------------------------------------------------------------

function FolderGrid({ folders, highlightId, onSeen }: { folders: Folder[]; highlightId: string | null; onSeen: () => void }) {
  const fresh = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (!highlightId) return
    fresh.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    fresh.current?.focus({ preventScroll: true })
    const t = window.setTimeout(onSeen, 4000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId])

  return (
    <div className="mt-8" role="tabpanel" aria-label="By Folder">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-6">
        {folders.map((f) => {
          const isNew = f.id === highlightId
          return (
            <li key={f.id}>
              <Link
                ref={isNew ? fresh : undefined}
                to={`/library/folders/${f.id}`}
                onClick={() => track('folder_opened', { folder_id: f.id, item_count: f.itemIds.length })}
                className={`stele-host flex flex-col items-center rounded-2xl px-2 pb-3 pt-4 text-center transition-colors hover:bg-paper-deep focus-visible:bg-paper-deep ${
                  isNew ? 'just-created bg-accent-soft/60' : ''
                }`}
              >
                <SteleIcon size={96} state={isNew ? 'selected' : f.itemIds.length === 0 ? 'empty' : 'default'} />
                <span className="mt-2 line-clamp-2 font-medium leading-snug text-ink">{f.name}</span>
                <span className="mt-0.5 text-xs text-ink-faint">
                  {f.itemIds.length} {f.itemIds.length === 1 ? 'item' : 'items'}
                  {isNew && <span className="ml-1.5 font-semibold text-accent">· New</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <DevNote className="mt-6">
        Each folder is a stele (SteleIcon 96px). Empty folders show a blank slab; the just-created folder is "selected". An item
        can be in several folders or none; folders are independent of status; removing from a folder never deletes the item.
      </DevNote>
    </div>
  )
}

function FolderDetail({ folder, entries, actions }: { folder: Folder; entries: Entry[]; actions: CardActions }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [renaming, setRenaming] = useState(() => params.get('rename') === '1')
  const [picking, setPicking] = useState(() => params.get('add') === '1')
  const [deleting, setDeleting] = useState(() => params.get('delete') === '1')
  const inFolder = folder.itemIds.map((id) => entries.find((e) => e.item.id === id)).filter((e): e is Entry => !!e)

  return (
    <div className="mt-6" role="tabpanel" aria-label={`Folder ${folder.name}`}>
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link to="/library?view=folders" className="rounded hover:text-ink hover:underline">
          By Folder
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="flex items-center gap-1.5 font-medium text-ink" aria-current="page">
          <SteleIcon size={24} state={folder.itemIds.length ? 'default' : 'empty'} />
          {folder.name}
        </span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <SteleIcon size={96} state={inFolder.length ? 'default' : 'empty'} />
        <div className="mr-auto">
          <h2 className="font-serif text-2xl">{folder.name}</h2>
          <p className="text-sm text-ink-faint">
            {inFolder.length} {inFolder.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => setPicking(true)}>
          <FolderPlus size={16} /> Add items
        </button>
        <button className="btn-ghost" onClick={() => setRenaming(true)}>
          <Pencil size={15} /> Rename
        </button>
        <button className="btn-ghost text-danger hover:text-danger" onClick={() => setDeleting(true)}>
          <Trash2 size={15} /> Delete folder
        </button>
      </div>

      {inFolder.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rule px-6 py-10 text-center">
          <p className="font-serif text-lg">This folder is empty.</p>
          <p className="mt-1 text-sm text-ink-soft">Add items from your library. They stay in their status lists too.</p>
          <button className="btn-primary mt-4" onClick={() => setPicking(true)}>
            <FolderPlus size={16} /> Add items
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {inFolder.map((e) => (
            <ItemCard key={e.item.id} entry={e} actions={actions} showStatus entryPoint="folder" />
          ))}
        </ul>
      )}

      {renaming && <RenameFolderDialog folder={folder} onClose={() => setRenaming(false)} />}
      {picking && <FolderItemsDialog folder={folder} entries={entries} onClose={() => setPicking(false)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${folder.name}”?`}
          message="Items stay in your library."
          confirmLabel="Delete folder"
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            deleteFolder(folder.id)
            setDeleting(false)
            navigate(protoStore.get().folders.length ? '/library?view=folders' : '/library')
          }}
        />
      )}
    </div>
  )
}

// --- Empty library (new user) & install banner -------------------------------------------

function EmptyLibrary({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-2xl text-center">
      <SteleIcon size={96} state="empty" className="mx-auto" />
      <h2 className="mt-4 font-serif text-2xl">Your library is empty</h2>
      <p className="mt-2 text-ink-soft">Save your first reading. Everything you add lands here, in Read later.</p>
      <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-rule bg-card p-5">
          <Puzzle size={22} className="text-accent" />
          <h3 className="mt-3 font-medium">Save articles from Chrome</h3>
          <p className="mt-1 text-sm text-ink-soft">Add Quiescent to Chrome to save articles in one click, paywalled ones included.</p>
          <Link
            to="/demo-browser"
            className="btn-primary mt-4"
            onClick={() => track('extension_install_clicked', { from: 'empty_library' })}
          >
            Add to Chrome
          </Link>
        </div>
        <div className="rounded-xl border border-rule bg-card p-5">
          <Upload size={22} className="text-accent" />
          <h3 className="mt-3 font-medium">Upload a PDF</h3>
          <p className="mt-1 text-sm text-ink-soft">Course readers, papers, books. PDF only for now, up to 25 MB.</p>
          <button className="btn-secondary mt-4" onClick={onUpload}>
            Upload a PDF
          </button>
        </div>
      </div>
      <DevNote className="mt-6 text-left">
        PRD (Library edge cases): first sign-in, empty library → two actions: install the extension, or upload. In this prototype
        "Add to Chrome" opens the simulated extension at /demo-browser.
      </DevNote>
    </div>
  )
}

function InstallBanner() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-rule bg-card px-4 py-3">
      <Puzzle size={18} className="text-accent" />
      <p className="flex-1 text-sm">Add Quiescent to Chrome to save articles in one click.</p>
      <Link to="/demo-browser" className="btn-secondary" onClick={() => track('extension_install_clicked', { from: 'banner' })}>
        Add to Chrome
      </Link>
    </div>
  )
}
