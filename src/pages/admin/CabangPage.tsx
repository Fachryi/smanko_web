import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { CabangOlahraga, ApiResponse } from '../../types'
import { Plus, Pencil, Trash2, Dumbbell, Users, ListChecks, CheckCircle } from 'lucide-react'

type FormData = { nama:string; kode:string; deskripsi:string }

export default function CabangPage() {
  const [data,    setData]    = useState<CabangOlahraga[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean;id:number}>({open:false,id:0})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<CabangOlahraga|null>(null)
  const [form,    setForm]    = useState<FormData>({nama:'',kode:'',deskripsi:''})
  const [successInfo, setSuccessInfo] = useState<{open:boolean;nama:string;action:'add'|'edit'}>({open:false,nama:'',action:'add'})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<CabangOlahraga[]>>('/master/cabang.php')
      setData(res.data ?? [])
    } catch { } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setSelected(null)
    setForm({nama:'',kode:'',deskripsi:''})
    setError(''); setModal('add')
  }
  const openEdit = (c: CabangOlahraga) => {
    setSelected(c)
    setForm({nama:c.nama,kode:c.kode,deskripsi:c.deskripsi||''})
    setError(''); setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nama||!form.kode) { setError('Nama dan kode wajib diisi.'); return }
    setSaving(true); setError('')
    const action = modal as 'add'|'edit'
    const namaDisimpan = form.nama
    try {
      if (modal==='add') await api.post('/master/cabang.php', form)
      else if (selected) await api.put(`/master/cabang.php?id=${selected.id}`, form)
      setModal(null)
      setSuccessInfo({open:true, nama:namaDisimpan, action})
      load()
    } catch (e:unknown) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/cabang.php?id=${confirm.id}`)
      setConfirm(c=>({...c,open:false})); load()
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Gagal menghapus.') }
    finally { setSaving(false) }
  }

  const COLORS = ['primary','success','warning','info','accent','danger']

  return (
    <Layout title="Cabang Olahraga">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Cabang Olahraga</h1>
          <p>Kelola daftar cabang olahraga yang tersedia di SMANKO.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Tambah Cabang</button>
      </div>

      {loading ? (
        <div className="flex-center" style={{padding:80}}><div className="spinner spinner-lg"/></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'var(--sp-5)'}}>
          {data.map((c,i) => (
            <div key={c.id} className="card" style={{display:'flex',flexDirection:'column',gap:'var(--sp-4)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--sp-3)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'var(--sp-3)'}}>
                  <div className={`stat-icon ${COLORS[i%COLORS.length]}`} style={{width:44,height:44}}>
                    <Dumbbell size={20}/>
                  </div>
                  <div>
                    <strong style={{display:'block'}}>{c.nama}</strong>
                    <code style={{fontSize:'0.72rem',color:'var(--clr-text-3)'}}>{c.kode}</code>
                  </div>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(c)}><Pencil size={14}/></button>
                  <button className="btn btn-danger btn-sm btn-icon"
                    onClick={()=>setConfirm({open:true,id:c.id})}><Trash2 size={14}/></button>
                </div>
              </div>

              {c.deskripsi && <p style={{fontSize:'0.82rem',margin:0}}>{c.deskripsi}</p>}

              <div style={{display:'flex',gap:'var(--sp-3)',paddingTop:'var(--sp-3)',
                borderTop:'1px solid var(--clr-border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.8rem',color:'var(--clr-text-3)'}}>
                  <Users size={14}/>{c.jumlah_siswa ?? 0} Siswa
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.8rem',color:'var(--clr-text-3)'}}>
                  <ListChecks size={14}/>{c.jumlah_kriteria ?? 0} Kriteria
                </div>
              </div>
            </div>
          ))}
          {data.length===0 && (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px',color:'var(--clr-text-3)'}}>
              Belum ada cabang olahraga. Klik "Tambah Cabang" untuk memulai.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)}
        title={modal==='add'?'Tambah Cabang Olahraga':'Edit Cabang Olahraga'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={()=>setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving?<span className="spinner"/>:'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nama Cabang <span className="required">*</span></label>
            <input className="form-control" placeholder="Contoh: Sepak Bola"
              value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Kode <span className="required">*</span></label>
            <input className="form-control" placeholder="Contoh: SEPAKBOLA" style={{textTransform:'uppercase'}}
              value={form.kode} onChange={e=>setForm(f=>({...f,kode:e.target.value.toUpperCase()}))}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <textarea className="form-control" rows={3} placeholder="Deskripsi singkat (opsional)"
            value={form.deskripsi} onChange={e=>setForm(f=>({...f,deskripsi:e.target.value}))}/>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open} onClose={()=>setConfirm(c=>({...c,open:false}))}
        onConfirm={handleDelete} loading={saving}
        message="Yakin ingin menghapus cabang olahraga ini? Tidak bisa dihapus jika masih ada siswa."
      />

      {/* Success Popup */}
      <Modal
        open={successInfo.open}
        onClose={() => setSuccessInfo(s=>({...s,open:false}))}
        title="Berhasil"
        footer={
          <button className="btn btn-primary" onClick={() => setSuccessInfo(s=>({...s,open:false}))}>
            OK
          </button>
        }
      >
        <div className="confirm-body">
          <div className="confirm-icon" style={{
            background: 'rgba(34,197,94,0.12)',
            color: 'var(--clr-success)'
          }}>
            <CheckCircle size={28} />
          </div>
          <h3 style={{marginBottom:'var(--sp-2)'}}>
            {successInfo.action === 'add' ? 'Cabang Olahraga Berhasil Ditambahkan' : 'Cabang Olahraga Berhasil Diperbarui'}
          </h3>
          <p>
            Cabang olahraga <strong>{successInfo.nama}</strong> berhasil{' '}
            {successInfo.action === 'add' ? 'ditambahkan ke sistem.' : 'diperbarui.'}
          </p>
        </div>
      </Modal>
    </Layout>
  )
}
