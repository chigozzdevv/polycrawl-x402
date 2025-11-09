import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-white/20 bg-[#0a0a0a] shadow-2xl max-h-[calc(100vh-4rem)]">
        <div className="sticky top-0 z-10 bg-[#0a0a0a] rounded-t-2xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-parchment">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fog transition-colors hover:bg-white/10 hover:text-parchment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
