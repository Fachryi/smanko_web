import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Konfirmasi', message,
  confirmLabel = 'Hapus', loading = false
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="default"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner" /> : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-body">
        <div className="confirm-icon danger">
          <AlertTriangle size={28} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </Modal>
  )
}
