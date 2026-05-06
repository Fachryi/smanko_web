import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { CabangOlahraga, ApiResponse } from '../../types'
import { Search, Plus, Pencil, Trash2, Users, Image as ImageIcon } from 'lucide-react'

type ProfilPelatih = {
  id: number
  cabang_olahraga_id: number
  nama: string
  foto: string | null
  no_telepon: string
  keterangan: string
  nama_cabang?: string
}

type FormData = {
  id?: number
  cabang_olahraga_id: string
  nama: string
  no_telepon: string
  keterangan: string
}

export default function ProfilPelatihPage() {
  const [pelatih, setPelatih] = useState<ProfilPelatih[]>([])
  const [cabor, setCabor] = useState<CabangOlahraga[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [caborFilter, setCaborFilter] = useState('')
  
  const [modal, setModal] = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean; id:number}>({open:false, id:0})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState<FormData>({ cabang_olahraga_id: '', nama: '', no_telepon: '', keterangan: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resPelatih, resCabor] = await Promise.all([
        api.get<ApiResponse<ProfilPelatih[]>>('/master/profil_pelatih.php'),
        api.get<ApiResponse<CabangOlahraga[]>>('/master/cabang.php')
      ])
      setPelatih(resPelatih.data ?? [])
      setCabor(resCabor.data ?? [])
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredData = pelatih.filter(p => {
    const matchName = p.nama.toLowerCase().includes(search.toLowerCase())
    const matchCabor = caborFilter ? String(p.cabang_olahraga_id) === caborFilter : true
    return matchName && matchCabor
  })

  const openAdd = () => {
    setForm({ cabang_olahraga_id: cabor[0]?.id?.toString() || '', nama: '', no_telepon: '', keterangan: '' })
    setFile(null)
    setPreview(null)
    setError('')
    setModal('add')
  }

  const openEdit = (p: ProfilPelatih) => {
    setForm({ id: p.id, cabang_olahraga_id: String(p.cabang_olahraga_id), nama: p.nama, no_telepon: p.no_telepon, keterangan: p.keterangan })
    setFile(null)
    setPreview(p.foto ? p.foto : null)
    setError('')
    setModal('edit')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 2 * 1024 * 1024) {
        setError('Ukuran file maksimal 2MB')
        return
      }
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setError('')
    }
  }

  const handleSave = async () => {
    if (!form.nama || !form.cabang_olahraga_id) {
      setError('Nama dan Cabang Olahraga wajib diisi.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const fd = new FormData()
      if (form.id) fd.append('id', String(form.id))
      fd.append('nama', form.nama)
      fd.append('cabang_olahraga_id', form.cabang_olahraga_id)
      fd.append('no_telepon', form.no_telepon)
      fd.append('keterangan', form.keterangan)
      if (file) fd.append('foto', file)

      await api.postForm('/master/profil_pelatih.php', fd)
      
      setModal(null)
      loadData()
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/profil_pelatih.php?id=${confirm.id}`)
      setConfirm({open:false, id:0})
      loadData()
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Profil Pelatih">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Profil Pelatih </h1>
          <p>Kelola data dan foto pelatih yang akan ditampilkan di halaman depan (Landing Page).</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16}/> Tambah Pelatih
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16}/>
          <input className="search-input" placeholder="Cari nama pelatih..." 
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={caborFilter} onChange={e => setCaborFilter(e.target.value)}>
          <option value="">Semua Cabor</option>
          {cabor.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
        </select>
        <span className="badge badge-neutral">{filteredData.length} Pelatih</span>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="flex-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{width: 60}}>Foto</th>
                  <th>Nama Pelatih</th>
                  <th>Cabang Olahraga</th>
                  <th>No. HP</th>
                  <th>Keterangan</th>
                  <th style={{width: 100}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">
                    <Users size={32} style={{margin:'0 auto 8px', color:'var(--clr-text-4)'}}/>
                    Tidak ada data pelatih.
                  </td></tr>
                ) : filteredData.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.foto ? (
                        <img src={p.foto} alt={p.nama} style={{width:40, height:40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dce6f7'}} />
                      ) : (
                        <div style={{width:40, height:40, borderRadius: '50%', background: '#edf1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0b0cc'}}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td><strong>{p.nama}</strong></td>
                    <td><span className="badge badge-info">{p.nama_cabang}</span></td>
                    <td><span style={{fontSize: '0.82rem'}}>{p.no_telepon || '-'}</span></td>
                    <td><span style={{fontSize: '0.82rem'}}>{p.keterangan || '-'}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit"><Pencil size={15}/></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setConfirm({open:true, id:p.id})} title="Hapus"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'add' ? 'Tambah Profil Pelatih' : 'Edit Profil Pelatih'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner"/> : 'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="form-error" style={{marginBottom: 'var(--sp-4)', padding: '10px', background: 'var(--clr-danger-bg)', borderRadius: 6}}>{error}</div>}

        <div className="form-group" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: '50%', background: '#edf1fb', 
              border: '2px dashed #b8cef0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative', flexShrink: 0
            }}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{width:'100%', height:'100%', objectFit:'cover'}} />
            ) : (
              <div style={{textAlign: 'center', color: '#6b7faa', fontSize: '0.75rem'}}>
                <ImageIcon size={24} style={{margin:'0 auto 4px', color:'#a0b0cc'}}/>
                Upload
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Foto Profil Pelatih</label>
            <p style={{fontSize: '0.75rem', color: 'var(--clr-text-3)', marginBottom: 8}}>Format: JPG, PNG, WEBP (Maks 2MB).<br/>Disarankan menggunakan foto persegi.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>Pilih File...</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{display: 'none'}} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nama Lengkap & Gelar <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: Budi Santoso, S.Pd."
            value={form.nama} onChange={e => setForm(f=>({...f, nama: e.target.value}))} />
        </div>

        <div className="form-group">
          <label className="form-label">Cabang Olahraga <span className="required">*</span></label>
          <select className="form-control" value={form.cabang_olahraga_id}
            onChange={e => setForm(f=>({...f, cabang_olahraga_id: e.target.value}))}>
            {cabor.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">No. Telepon</label>
          <input className="form-control" placeholder="Contoh: 0812-3456-7890"
            value={form.no_telepon} onChange={e => setForm(f=>({...f, no_telepon: e.target.value}))} />
        </div>

        <div className="form-group">
          <label className="form-label">Keterangan</label>
          <input className="form-control" placeholder="Contoh: Pelatih Tinju berpengalaman 10 tahun"
            value={form.keterangan} onChange={e => setForm(f=>({...f, keterangan: e.target.value}))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open} onClose={() => setConfirm({open:false, id:0})}
        onConfirm={handleDelete} loading={saving}
        message="Yakin ingin menghapus profil pelatih ini? Data yang dihapus tidak bisa dikembalikan."
      />
    </Layout>
  )
}
