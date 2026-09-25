import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Upload } from 'lucide-react'
import { Logo } from '../components/Logo'
import { AddDialog } from '../library/AddDialog'
import { setPending } from '../storage/db'

export function LandingPage() {
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16 text-center">
      <Logo size="lg" />
      <p className="mt-5 max-w-md font-serif text-xl leading-relaxed text-ink-soft">
        Save what you read, highlight what matters, and keep your notes in one place.
      </p>

      <button
        onClick={() => setChoosing(true)}
        className="mt-14 inline-flex items-center gap-3 rounded-2xl bg-accent px-12 py-6 text-xl font-medium text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/25"
      >
        <Upload size={24} strokeWidth={2} />
        Upload your reading
      </button>
      <p className="mt-4 text-sm text-ink-faint">A PDF, or a link to an article</p>

      {choosing && (
        <AddDialog
          title="Upload your reading"
          onClose={() => setChoosing(false)}
          onReady={async (item, file) => {
            await setPending(item, file)
            navigate('/login')
          }}
        />
      )}
    </div>
  )
}
