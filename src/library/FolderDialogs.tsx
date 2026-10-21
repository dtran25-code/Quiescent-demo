import { useId, useMemo, useState } from 'react'
import { FileText, Newspaper, Plus, Search } from 'lucide-react'
import { Modal } from '../components/Modal'
import { SteleIcon } from '../icons/SteleIcon'
import { Badge, DevNote } from '../dev/DevNote'
import { FOLDER_NAME_MAX, createFolder, folderNameError, renameFolder, setFolderItems, setItemFolders } from '../proto/actions'
import { protoStore, useProto, type Folder } from '../proto/store'
import { sourceLabel, type Entry } from './useLibrary'

// --- folder name field -------------------------------------------------------------

function NameField({ value, onChange, error, showError }: { value: string; onChange: (v: string) => void; error: string | null; showError: boolean }) {
  const id = useId()
  const over = value.trim().length > FOLDER_NAME_MAX
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          Folder name <span className="text-ink-faint">(required)</span>
        </label>
        <span className={`text-xs tabular-nums ${over ? 'text-danger' : 'text-ink-faint'}`} aria-live="polite">
          {value.trim().length}/{FOLDER_NAME_MAX}
        </span>
      </div>
      <input
        id={id}
        data-autofocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1.5"
        placeholder="e.g. Interview prep"
        aria-invalid={showError && !!error}
        aria-describedby={showError && error ? `${id}-err` : undefined}
        autoComplete="off"
      />
      {showError && error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

// --- searchable checklist of library items ---------------------------------------------

export function ItemChecklist({ entries, checked, onToggle }: { entries: Entry[]; checked: Set<string>; onToggle: (id: string) => void }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? entries.filter((e) => e.item.title.toLowerCase().includes(needle) || sourceLabel(e.item).includes(needle)) : entries
  }, [entries, q])
  return (
    <div className="rounded-lg border border-rule">
      <div className="flex items-center gap-2 border-b border-rule px-3">
        <Search size={15} className="text-ink-faint" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library"
          aria-label="Search your library"
          className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
        <span className="text-xs text-ink-faint">{checked.size} selected</span>
      </div>
      <ul className="max-h-60 overflow-y-auto py-1" aria-label="Library items">
        {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-faint">{entries.length ? 'No matches.' : 'Your library is empty.'}</li>}
        {shown.map(({ item }) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-paper-deep">
              <input type="checkbox" checked={checked.has(item.id)} onChange={() => onToggle(item.id)} className="h-4 w-4 accent-accent" />
              {item.type === 'pdf' ? <FileText size={14} className="shrink-0 text-ink-faint" /> : <Newspaper size={14} className="shrink-0 text-ink-faint" />}
              <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

function useToggleSet(initial: Iterable<string> = []) {
  const [set, setSet] = useState(() => new Set(initial))
  const toggle = (id: string) =>
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return [set, toggle] as const
}

// --- Create new folder ---------------------------------------------------------------

export function CreateFolderDialog({ entries, onClose, onCreated }: { entries: Entry[]; onClose: () => void; onCreated: (folder: Folder) => void }) {
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const [checked, toggle] = useToggleSet()
  const error = folderNameError(name)

  return (
    <Modal title="Create new folder" onClose={onClose} width="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (error) return
          onCreated(createFolder(name, [...checked], 'header'))
        }}
        className="space-y-5"
        noValidate
      >
        <NameField value={name} onChange={setName} error={error} showError={touched || name.length > 0} />
        <div>
          <p className="mb-1.5 text-sm font-medium">
            Add items now <span className="text-ink-faint">(optional)</span>
          </p>
          <ItemChecklist entries={entries} checked={checked} onToggle={toggle} />
        </div>
        <DevNote>
          Name: required, ≤ 40 characters, unique (case-insensitive). On create → switch to By Folder and highlight the new
          folder. Items can be in several folders. <Badge kind="P0 pending dev estimate" />
        </DevNote>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button className="btn-primary" aria-disabled={!!error}>
            Create folder
          </button>
        </div>
      </form>
    </Modal>
  )
}

// --- Rename -----------------------------------------------------------------------------

export function RenameFolderDialog({ folder, onClose }: { folder: Folder; onClose: () => void }) {
  const [name, setName] = useState(folder.name)
  const error = folderNameError(name, folder.id)
  return (
    <Modal title="Rename folder" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (error) return
          if (name.trim() !== folder.name) renameFolder(folder.id, name)
          onClose()
        }}
        className="space-y-5"
        noValidate
      >
        <NameField value={name} onChange={setName} error={error} showError />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button className="btn-primary" aria-disabled={!!error}>
            Save name
          </button>
        </div>
      </form>
    </Modal>
  )
}

// --- Folder detail → Add items -------------------------------------------------------------

export function FolderItemsDialog({ folder, entries, onClose }: { folder: Folder; entries: Entry[]; onClose: () => void }) {
  const [checked, toggle] = useToggleSet(folder.itemIds)
  return (
    <Modal title={`Items in “${folder.name}”`} onClose={onClose} width="max-w-lg">
      <p className="mb-3 text-sm text-ink-soft">Tick the items this folder should hold. Unticking only takes an item out of the folder; it stays in your library.</p>
      <ItemChecklist entries={entries} checked={checked} onToggle={toggle} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            // Keep library order for newly added items.
            setFolderItems(folder.id, entries.map((e) => e.item.id).filter((id) => checked.has(id)), 'folder_detail')
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

// --- Card menu → Add to folder (multi-select + New folder…) ----------------------------------

export function AddToFolderDialog({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const folders = useProto((s) => s.folders)
  const [checked, toggle] = useToggleSet(folders.filter((f) => f.itemIds.includes(entry.item.id)).map((f) => f.id))
  const [creating, setCreating] = useState(folders.length === 0)
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const error = folderNameError(name)

  function addNew() {
    setTouched(true)
    if (error) return
    // Created empty; this item joins it when the dialog is saved (it's ticked now).
    const folder = createFolder(name, [], 'card_menu')
    toggle(folder.id)
    setName('')
    setTouched(false)
    setCreating(false)
  }

  return (
    <Modal title="Add to folder" onClose={onClose}>
      <p className="mb-3 line-clamp-2 font-serif font-semibold text-ink">{entry.item.title}</p>
      {folders.length > 0 && (
        <ul className="mb-3 max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-rule py-1" aria-label="Folders">
          {folders.map((f) => (
            <li key={f.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-paper-deep">
                <input type="checkbox" checked={checked.has(f.id)} onChange={() => toggle(f.id)} className="h-4 w-4 accent-accent" />
                <SteleIcon size={24} state={f.itemIds.length ? 'default' : 'empty'} />
                <span className="flex-1 truncate text-sm">{f.name}</span>
                <span className="text-xs text-ink-faint">{f.itemIds.length}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {creating ? (
        <div className="rounded-lg border border-rule p-3">
          <NameField value={name} onChange={setName} error={error} showError={touched || name.length > 0} />
          <div className="mt-3 flex justify-end gap-2">
            {folders.length > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={addNew}>
              Create folder
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-link" onClick={() => setCreating(true)}>
          <Plus size={15} /> New folder…
        </button>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            const live = new Set(protoStore.get().folders.map((f) => f.id))
            setItemFolders(entry.item.id, [...checked].filter((id) => live.has(id)))
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
