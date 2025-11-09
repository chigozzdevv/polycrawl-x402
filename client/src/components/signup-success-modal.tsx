import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { WalletIcon, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SignupSuccessModalProps = {
  open: boolean
  onClose: () => void
}

export function SignupSuccessModal({ open, onClose }: SignupSuccessModalProps) {
  const navigate = useNavigate()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111111] p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand/10">
                <WalletIcon className="h-8 w-8 text-sand" />
              </div>
              <h2 className="mb-2 text-2xl font-medium text-parchment">Welcome to Polycrawl!</h2>
              <p className="mb-6 text-sm text-fog">
                Congrats! You received <span className="font-semibold text-sand">1000 devnet USDC</span> to explore the platform.
              </p>
              <Button onClick={() => { onClose(); navigate('/app'); }} className="w-full bg-[#cfbea0] text-black hover:bg-[#cfbea0]">
                Thanks :) <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
