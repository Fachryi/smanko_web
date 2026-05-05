import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { TahunAjaran, ApiResponse } from '../../types'
import { CalendarDays, Plus, Pencil, Trash2, CheckCircle, Lock, PlayCircle } from 'lucide-react'

type FormData = { nama: string; semester: string }

export default function TahunAjaranPage() {
  const [data,    setData]    = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{ open:boolean; id:number; action:'delete'|'activate'|'close' }>({ open:false, id:0, action:'delete' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<TahunAjaran|null>(null)
  const [form,    setForm]    = useState<FormData>({ nama:'', semester:'1' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php')
      setData(res.data ?? [])
    } catch { setError('Gagal memuat data.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setSelected(null)
    setForm({ nama:'', semester:'1' })
    setError('')
    setModal('add')
  }
  const openEdit = (row: TahunAjaran) => {
    setSelected(row)
    setForm({ nama: row.nama, semester: String(row.semester) })
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nama.trim()) { setError('Nama tahun ajaran wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      const payload = { nama: form.nama.trim(), semester: Number(form.semester) }
      if (modal === 'add') {
        await api.post('/master/tahun_ajaran.php', payload)
      } else if (selected) {
        await api.put(`/master/tahun_ajaran.php?id=${selected.id}`, payload)
      }
      setModal(null); load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleActivate = async () => {
    setSaving(true)
    try {
      await api.put(`/master/tahun_ajaran.php?id=${confirm.id}`, { status: confirm.action === 'activate' ? 'aktif' : 'tutup' })
      setConfirm(c => ({...c, open:false})); load()
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/tahun_ajaran.php?id=${confirm.id}`)
      setConfirm(c => ({...c, open:false})); load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Gagal menghapus.') }
    finally { setSaving(false) }
  }

  const confirmAction = confirm.action === 'delete' ? handleDelete : handleActivate

  return (
    <Layout title="Tahun Ajaran">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tahun Ajaran & Semester</h1>
          <p>Kelola periode penilaian. Hanya 1 tahun ajaran yang boleh berstatus <strong>Aktif</strong>.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16}/> Tambah Tahun Ajaran
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex-center" style={{padding:'60px'}}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tahun Ajaran</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={5} className="table-empty">Belum ada tahun ajaran.</td></tr>
                ) : data.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{color:'var(--clr-text-3)',width:48}}>{i+1}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <CalendarDays size={16} style={{color:'var(--clr-primary-2)'}}/>
                        <strong>{row.nama}</strong>
                      </div>
                    </td>
                    <td>Semester {row.semester}</td>
                    <td>
                      {row.status === 'aktif'
                        ? <span className="badge badge-success"><CheckCircle size={12}/> Aktif</span>
                        : <span className="badge badge-neutral"><Lock size={12}/> Tutup</span>}
                    </td>
                    <td>
                      <div className="td-actions">
                        {row.status === 'tutup' && (
                          <button className="btn btn-sm btn-success" title="Aktifkan"
                            onClick={() => setConfirm({ open:true, id:row.id, action:'activate' })}>
                            <PlayCircle size={14}/> Aktifkan
                          </button>
                        )}
                        {row.status === 'aktif' && (
                          <button className="btn btn-sm btn-secondary" title="Tutup"
                            onClick={() => setConfirm({ open:true, id:row.id, action:'close' })}>
                            <Lock size={14}/> Tutup
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(row)}
                          title="Edit"><Pencil size={15}/></button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Hapus"
                          onClick={() => setConfirm({ open:true, id:row.id, action:'delete' })}>
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Tahun Ajaran' : 'Edit Tahun Ajaran'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner"/> : 'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Nama Tahun Ajaran <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: 2025/2026"
            value={form.nama} onChange={e => setForm(f => ({...f, nama: e.target.value}))}/>
          <div className="form-help">Format: YYYY/YYYY (misal: 2025/2026)</div>
        </div>
        <div className="form-group">
          <label className="form-label">Semester <span className="required">*</span></label>
          <select className="form-control" value={form.semester}
            onChange={e => setForm(f => ({...f, semester: e.target.value}))}>
            <option value="1">Semester 1 (Ganjil)</option>
            <option value="2">Semester 2 (Genap)</option>
          </select>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm(c => ({...c, open:false}))}
        onConfirm={confirmAction}
        loading={saving}
        title={confirm.action === 'delete' ? 'Hapus Tahun Ajaran' : confirm.action === 'activate' ? 'Aktifkan Tahun Ajaran' : 'Tutup Tahun Ajaran'}
        message={
          confirm.action === 'delete'
            ? 'Yakin ingin menghapus tahun ajaran ini? Tidak bisa dibatalkan.'
            : confirm.action === 'activate'
            ? 'Mengaktifkan ini akan menutup tahun ajaran yang sedang aktif. Lanjutkan?'
            : 'Tutup tahun ajaran ini? Guru tidak bisa input nilai sampai ada yang diaktifkan.'
        }
        confirmLabel={confirm.action === 'delete' ? 'Hapus' : confirm.action === 'activate' ? 'Aktifkan' : 'Tutup'}
      />
    </Layout>
  )
}
