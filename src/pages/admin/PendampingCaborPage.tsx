import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { CabangOlahraga, ApiResponse } from '../../types'
import { Search, Plus, Pencil, Trash2, Users2, Info } from 'lucide-react'

type PendampingCabor = {
  id: number
  cabang_olahraga_id: number
  nama: string
  nip: string
  kode_guru: string
  is_utama: number
  nama_cabang?: string
}

type FormData = {
  id?: number
  cabang_olahraga_id: string
  nama: string
  nip: string
  kode_guru: string
  is_utama: boolean
}

export default function PendampingCaborPage() {
  const [data,    setData]    = useState<PendampingCabor[]>([])
  const [cabor,   setCabor]   = useState<CabangOlahraga[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filterCabor, setFilterCabor] = useState('')

  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [confirm, setConfirm] = useState<{ open: boolean; id: number }>({ open: false, id: 0 })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState<FormData>({
    cabang_olahraga_id: '', nama: '', nip: '', kode_guru: '', is_utama: false
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [resPend, resCabor] = await Promise.all([
        api.get<ApiResponse<PendampingCabor[]>>('/master/pendamping_cabor.php'),
        api.get<ApiResponse<CabangOlahraga[]>>('/master/cabang.php'),
      ])
      setData(resPend.data ?? [])
      setCabor(resCabor.data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = data.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) || (p.nama_cabang ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCabor = filterCabor ? String(p.cabang_olahraga_id) === filterCabor : true
    return matchSearch && matchCabor
  })

  const openAdd = () => {
    const firstAvail = cabor[0]
    setForm({
      cabang_olahraga_id: firstAvail ? String(firstAvail.id) : '',
      nama: '', nip: '', kode_guru: '', is_utama: false
    })
    setError('')
    setModal('add')
  }

  const openEdit = (p: PendampingCabor) => {
    setForm({
      id: p.id,
      cabang_olahraga_id: String(p.cabang_olahraga_id),
      nama: p.nama, nip: p.nip, kode_guru: p.kode_guru,
      is_utama: Boolean(p.is_utama)
    })
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.cabang_olahraga_id) { setError('Cabang Olahraga wajib dipilih.'); return }
    if (!form.nama.trim())        { setError('Nama pendamping tidak boleh kosong.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/master/pendamping_cabor.php', {
        id:         form.id,
        cabang_olahraga_id: parseInt(form.cabang_olahraga_id),
        nama:       form.nama.trim(),
        nip:        form.nip.trim(),
        kode_guru:  form.kode_guru.trim(),
        is_utama:   form.is_utama ? 1 : 0
      })
      setModal(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/pendamping_cabor.php?id=${confirm.id}`)
      setConfirm({ open: false, id: 0 })
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gagal menghapus.')
    } finally { setSaving(false) }
  }

  // Cabor untuk dropdown
  const editCabor = cabor

  return (
    <Layout title="Pendamping Cabor">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pendamping Cabor</h1>
          <p>Kelola data pendamping per cabang olahraga – nama akan tampil di tanda tangan raport nilai siswa.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openAdd}
          disabled={cabor.length === 0}
          title={cabor.length === 0 ? 'Data cabor belum tersedia' : ''}
        >
          <Plus size={16}/> Tambah Pendamping
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'var(--clr-bg-3)', border: '1px solid var(--clr-border)',
        borderRadius: 'var(--r-md)', padding: 'var(--sp-4)',
        marginBottom: 'var(--sp-5)', fontSize: '0.82rem', color: 'var(--clr-text-2)', lineHeight: 1.7
      }}>
        <Info size={16} style={{ color: 'var(--clr-primary-2)', flexShrink: 0, marginTop: 2 }}/>
        <span>
          Setiap cabang olahraga dapat memiliki lebih dari satu pendamping cabor. Namun, hanya pendamping
          dengan status <strong>Utama</strong> yang nama dan NIP-nya akan muncul pada <strong>tanda tangan
          raport nilai siswa</strong>.
        </span>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: '1 1 200px' }}>
          <Search size={16}/>
          <input className="search-input" placeholder="Cari nama / cabor..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-control" style={{ width: 'auto', minWidth: '180px', flex: '0 0 auto' }}
          value={filterCabor} onChange={e => setFilterCabor(e.target.value)}>
          <option value="">Semua Cabor</option>
          {cabor.map(c => (
            <option key={c.id} value={c.id}>{c.nama}</option>
          ))}
        </select>
        <span className="badge badge-neutral">{filtered.length} Data</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 60 }}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cabang Olahraga</th>
                  <th>Kode Guru</th>
                  <th>Nama Pendamping</th>
                  <th>NIP</th>
                  <th style={{ width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="table-empty">
                    <Users2 size={32} style={{ margin: '0 auto 8px', color: 'var(--clr-text-4)' }}/>
                    Belum ada data pendamping cabor.
                  </td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-info">{p.nama_cabang}</span></td>
                    <td><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.kode_guru || '—'}</span></td>
                    <td>
                      <strong>{p.nama}</strong>
                      {p.is_utama === 1 && (
                        <span className="badge badge-success" style={{ marginLeft: 8, fontSize: '0.65rem' }}>★ Utama</span>
                      )}
                    </td>
                    <td><span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{p.nip || <span style={{ color: 'var(--clr-text-4)', fontStyle: 'italic' }}>—</span>}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit">
                          <Pencil size={14}/>
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setConfirm({ open: true, id: p.id })} title="Hapus">
                          <Trash2 size={14}/>
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


      {/* Modal Add / Edit */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Pendamping Cabor' : 'Edit Pendamping Cabor'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner"/> : 'Simpan'}
          </button>
        </>}
      >
        {error && (
          <div className="login-error" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>
        )}

        <div className="form-group">
          <label className="form-label">Cabang Olahraga <span className="required">*</span></label>
          <select className="form-control" value={form.cabang_olahraga_id}
            onChange={e => setForm(f => ({ ...f, cabang_olahraga_id: e.target.value }))}
            disabled={modal === 'edit'}
          >
            <option value="">-- Pilih Cabor --</option>
            {editCabor.map(c => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Nama Lengkap <span className="required">*</span></label>
          <input className="form-control"
            placeholder="Contoh: Drs. Ahmad Yani, M.Pd."
            value={form.nama}
            onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
          />
          <div className="form-help">Sertakan gelar akademik jika ada</div>
        </div>

        <div className="form-group">
          <label className="form-label">NIP</label>
          <input className="form-control"
            placeholder="Contoh: 197801012005011002"
            value={form.nip}
            onChange={e => setForm(f => ({ ...f, nip: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Kode Guru</label>
          <input className="form-control"
            placeholder="Contoh: A.12"
            value={form.kode_guru}
            onChange={e => setForm(f => ({ ...f, kode_guru: e.target.value }))}
          />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8 }}>
          <input type="checkbox" id="is_utama" style={{ width: 18, height: 18, cursor: 'pointer' }}
            checked={form.is_utama}
            onChange={e => setForm(f => ({ ...f, is_utama: e.target.checked }))}
          />
          <label htmlFor="is_utama" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-2)', cursor: 'pointer' }}>
            Jadikan sebagai Pendamping Utama
            <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--clr-text-3)', marginTop: 2 }}>
              Nama dan NIP pendamping utama akan muncul di raport siswa.
            </div>
          </label>
        </div>

        {/* Preview TTD */}
        <div style={{
          background: 'var(--clr-bg-3)', border: '1px solid var(--clr-border)',
          borderRadius: 'var(--r-md)', padding: 'var(--sp-4)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Preview Tanda Tangan
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text-2)', lineHeight: 1.6, marginBottom: 36 }}>
              Mengetahui,<br/>Pendamping Cabor
            </div>
            <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 6, display: 'inline-block', minWidth: 200 }}>
              <div style={{ fontWeight: 700, color: 'var(--clr-text)', fontSize: '0.88rem' }}>
                {form.nama || <span style={{ color: 'var(--clr-text-3)', fontStyle: 'italic' }}>Belum diisi</span>}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-2)', marginTop: 2 }}>
                NIP. {form.nip || '—'}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: 0 })}
        onConfirm={handleDelete}
        loading={saving}
        message="Yakin ingin menghapus data pendamping cabor ini? TTD raport untuk cabor tersebut akan kembali kosong."
      />
    </Layout>
  )
}
