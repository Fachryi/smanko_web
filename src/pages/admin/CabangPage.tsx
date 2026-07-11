import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { CabangOlahraga, SettingNomorPertandingan, ApiResponse } from '../../types'
import { Plus, Pencil, Trash2, Dumbbell, Users, ListChecks, CheckCircle, ListOrdered } from 'lucide-react'

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

  // Nomor Pertandingan per Cabang
  const [nomorModal,   setNomorModal]   = useState<{open:boolean;cabang:CabangOlahraga|null}>({open:false,cabang:null})
  const [nomorData,    setNomorData]    = useState<SettingNomorPertandingan[]>([])
  const [nomorLoading, setNomorLoading] = useState(false)
  const [nomorForm,    setNomorForm]    = useState({nama:'',urutan:'1'})
  const [nomorSelected,setNomorSelected]= useState<SettingNomorPertandingan|null>(null)
  const [nomorSubModal,setNomorSubModal]= useState<'add'|'edit'|null>(null)
  const [nomorSaving,  setNomorSaving]  = useState(false)
  const [nomorError,   setNomorError]   = useState('')
  const [nomorConfirm, setNomorConfirm] = useState<{open:boolean;id:number}>({open:false,id:0})

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

  const loadNomor = useCallback(async (cabangId: number) => {
    setNomorLoading(true)
    try {
      const res = await api.get<ApiResponse<SettingNomorPertandingan[]>>(`/settings/nomor-pertandingan.php?cabang_olahraga_id=${cabangId}`)
      setNomorData(res.data ?? [])
    } catch {} finally { setNomorLoading(false) }
  }, [])

  const openNomor = (c: CabangOlahraga) => {
    setNomorModal({open:true,cabang:c})
    loadNomor(c.id)
  }

  const openNomorAdd = () => {
    setNomorSelected(null)
    setNomorForm({nama:'', urutan:String(nomorData.length+1)})
    setNomorError(''); setNomorSubModal('add')
  }

  const openNomorEdit = (p: SettingNomorPertandingan) => {
    setNomorSelected(p)
    setNomorForm({nama: p.nama, urutan: String(p.urutan)})
    setNomorError(''); setNomorSubModal('edit')
  }

  const handleNomorSave = async () => {
    if (!nomorForm.nama) { setNomorError('Nama nomor pertandingan wajib diisi.'); return }
    if (!nomorModal.cabang) return
    setNomorSaving(true); setNomorError('')
    try {
      const payload = {cabang_olahraga_id: nomorModal.cabang.id, nama: nomorForm.nama, urutan: parseInt(nomorForm.urutan)||1}
      if (nomorSubModal==='add') await api.post('/settings/nomor-pertandingan.php', payload)
      else if (nomorSelected) await api.put(`/settings/nomor-pertandingan.php?id=${nomorSelected.id}`, payload)
      setNomorSubModal(null); loadNomor(nomorModal.cabang.id)
    } catch (e:unknown) { setNomorError(e instanceof Error?e.message:'Terjadi kesalahan.') }
    finally { setNomorSaving(false) }
  }

  const handleNomorDelete = async () => {
    setNomorSaving(true)
    try {
      await api.delete(`/settings/nomor-pertandingan.php?id=${nomorConfirm.id}`)
      setNomorConfirm(c=>({...c,open:false}))
      if (nomorModal.cabang) loadNomor(nomorModal.cabang.id)
    } catch (e:unknown) { alert(e instanceof Error?e.message:'Gagal.') }
    finally { setNomorSaving(false) }
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
                borderTop:'1px solid var(--clr-border)',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.8rem',color:'var(--clr-text-3)'}}>
                  <Users size={14}/>{c.jumlah_siswa ?? 0} Siswa
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.8rem',color:'var(--clr-text-3)'}}>
                  <ListChecks size={14}/>{c.jumlah_kriteria ?? 0} Kriteria
                </div>
                <div style={{flex:1}}/>
                <button className="btn btn-ghost btn-sm" onClick={()=>openNomor(c)}
                  style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.78rem'}}>
                  <ListOrdered size={14}/> No. Pertandingan
                </button>
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

      {/* Nomor Pertandingan Modal */}
      <Modal open={nomorModal.open} onClose={()=>setNomorModal({open:false,cabang:null})}
        title={`Nomor Pertandingan – ${nomorModal.cabang?.nama ?? ''}`}
        size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setNomorModal({open:false,cabang:null})}>Tutup</button>
          <button className="btn btn-primary" onClick={openNomorAdd}><Plus size={14}/> Tambah</button>
        </>}>
        {nomorLoading ? <div className="flex-center" style={{padding:40}}><div className="spinner"/></div> : (
          <div className="table-wrapper" style={{maxHeight:320,overflowY:'auto'}}>
            <table>
              <thead><tr><th style={{width:60}}>#</th><th>Nama Nomor</th><th style={{width:80}}>Aksi</th></tr></thead>
              <tbody>
                {nomorData.map(p=>(
                  <tr key={p.id}>
                    <td style={{color:'var(--clr-text-3)'}}>{p.urutan}</td>
                    <td><strong>{p.nama}</strong></td>
                    <td><div className="td-actions" style={{justifyContent:'flex-start'}}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openNomorEdit(p)}><Pencil size={14}/></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setNomorConfirm({open:true,id:p.id})}><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                ))}
                {nomorData.length===0&&<tr><td colSpan={3} className="table-empty">
                  Belum ada nomor pertandingan. Klik "Tambah" untuk menambahkan.
                </td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <p style={{margin:'var(--sp-3) 0 0',fontSize:'0.75rem',color:'var(--clr-text-3)'}}>
          Jika tidak ada opsi, guru dapat memasukkan nomor pertandingan secara manual.
        </p>
      </Modal>

      {/* Nomor Pertandingan Sub-Modal (Add/Edit) */}
      <Modal open={!!nomorSubModal} onClose={()=>setNomorSubModal(null)}
        title={nomorSubModal==='add'?'Tambah Nomor Pertandingan':'Edit Nomor Pertandingan'}
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setNomorSubModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleNomorSave} disabled={nomorSaving}>
            {nomorSaving?<span className="spinner"/>:'Simpan'}
          </button>
        </>}>
        {nomorError&&<div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{nomorError}</div>}
        <div className="form-group">
          <label className="form-label">Nama Nomor / Spesialisasi <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: Keeper, Striker, Tunggal Putra"
            value={nomorForm.nama} onChange={e=>setNomorForm(f=>({...f,nama:e.target.value}))}/>
          <div className="form-help">Nama posisi/nomor/spesialisasi dalam cabang ini.</div>
        </div>
        <div className="form-group">
          <label className="form-label">Urutan</label>
          <input className="form-control" type="number" min="1" value={nomorForm.urutan}
            onChange={e=>setNomorForm(f=>({...f,urutan:e.target.value}))}/>
        </div>
      </Modal>

      <ConfirmDialog
        open={nomorConfirm.open}
        onClose={()=>setNomorConfirm(c=>({...c,open:false}))}
        onConfirm={handleNomorDelete}
        loading={nomorSaving}
        message="Yakin ingin menghapus nomor pertandingan ini?"
      />
    </Layout>
  )
}
