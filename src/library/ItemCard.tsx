import { Link } from 'react-router'
import { FileText, FolderMinus, FolderPlus, MoreHorizontal, Newspaper, Trash2 } from 'lucide-react'
import { Menu, type MenuEntry } from '../components/Menu'
import { STATUSES, STATUS_LABEL, type Status } from '../proto/store'
import { setStatus } from '../proto/actions'
import { shortDate, sourceLabel, type Entry } from './useLibrary'

export interface CardActions {
  onAddToFolder: (entry: Entry) => void
  onRemove: (entry: Entry) => void
  /** Folder detail only. */
  onRemoveFromFolder?: (entry: Entry) => void
}

/**
 * Library card: title, source domain, type, date saved, progress % (In progress
 * only), optional status badge (folder detail). The whole card opens the reader;
 * the ⋯ menu changes status, files it in folders, or removes it.
 */
export function ItemCard({
  entry,
  actions,
  showStatus = false,
  entryPoint = 'library',
}: {
  entry: Entry
  actions: CardActions
  showStatus?: boolean
  entryPoint?: 'library' | 'folder'
}) {
  const { item, meta } = entry
  const TypeIcon = item.type === 'pdf' ? FileText : Newspaper
  const progress = Math.round(item.progress)

  const entries: MenuEntry[] = [
    { kind: 'heading', label: 'Change status' },
    ...STATUSES.map(
      (s): MenuEntry => ({ kind: 'radio', label: STATUS_LABEL[s], checked: meta.status === s, onSelect: () => setStatus(item.id, s, 'card_menu') }),
    ),
    { kind: 'separator' },
    { label: 'Add to folder…', icon: <FolderPlus size={15} />, onSelect: () => actions.onAddToFolder(entry) },
    ...(actions.onRemoveFromFolder
      ? [{ label: 'Remove from this folder', icon: <FolderMinus size={15} />, onSelect: () => actions.onRemoveFromFolder!(entry) }]
      : []),
    { kind: 'separator' },
    { label: 'Remove from library…', icon: <Trash2 size={15} />, danger: true, onSelect: () => actions.onRemove(entry) },
  ]

  return (
    <li className="group relative flex min-h-[8.5rem] flex-col rounded-xl border border-rule bg-card p-4 transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-ink-soft">
          <TypeIcon size={16} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1 pr-7">
          <Link
            to={`/read/${item.id}`}
            state={{ entry: entryPoint }}
            className="line-clamp-2 font-serif font-semibold text-xl leading-snug text-ink after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:text-accent-dark focus:outline-none"
          >
            {item.title}
          </Link>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-faint">
          <span className="truncate">{sourceLabel(item)}</span>
          <span aria-hidden="true">·</span>
          <span className="rounded bg-paper-deep px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            {item.type === 'pdf' ? 'PDF' : 'Article'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Saved {shortDate(meta.savedAt)}</span>
          {showStatus && <StatusBadge status={meta.status} />}
        </p>
        {meta.status === 'in_progress' && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-rule"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Reading progress for ${item.title}`}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-9 text-right text-xs tabular-nums text-ink-soft">{progress}%</span>
          </div>
        )}
      </div>

      {/* Above the card-wide link so it stays clickable. */}
      <div className="absolute right-2 top-2 z-10">
        <Menu label={`Actions for ${item.title}`} icon={<MoreHorizontal size={18} />} entries={entries} />
      </div>
    </li>
  )
}

const BADGE: Record<Status, string> = {
  in_progress: 'bg-accent-soft text-status-progress',
  read_later: 'bg-paper-deep text-status-later',
  finished: 'bg-ok-soft text-status-finished',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[status]}`}>{STATUS_LABEL[status]}</span>
  )
}
