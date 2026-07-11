import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { Siswa, CabangOlahraga, ApiResponse } from '../../types'
import { Search, Plus, Pencil, Trash2, GraduationCap, TrendingUp, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { toTitleCase } from '../../utils/format'

type FormData = {
  nisn:string; nis:string; nama:string; kelas:string; jenis_kelamin:string; cabang_olahraga_id:string; pelatih_id:string
}

export default function SiswaPage() {
  const navigate = useNavigate()
  const [siswa,   setSiswa]   = useState<Siswa[]>([])
  const [cabang,  setCabang]  = useState<CabangOlahraga[]>([])
  const [pelatihList, setPelatihList] = useState<{id:number, nama:string, cabang_olahraga_id:number}[]>([])
  const [kelasList, setKelasList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [kelasFilter, setKelasFilter] = useState('')
  const [caborFilter, setCaborFilter] = useState('')
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean;id:number}>({open:false,id:0})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<Siswa|null>(null)
  const [form,    setForm]    = useState<FormData>({nisn:'',nis:'',nama:'',kelas:'',jenis_kelamin:'L',cabang_olahraga_id:'', pelatih_id:''})
  const [successInfo, setSuccessInfo] = useState<{open:boolean;nama:string;action:'add'|'edit'}>({open:false,nama:'',action:'add'})
  const [classFullModal, setClassFullModal] = useState<{open:boolean;kelas:string}>({open:false,kelas:''})

  // Load cabang & pelatih once
  useEffect(() => {
    api.get<ApiResponse<CabangOlahraga[]>>('/master/cabang.php')
      .then(r => setCabang(r.data ?? []))
      .catch(() => {})
    
    api.get<ApiResponse<{id:number, nama:string, cabang_olahraga_id:number}[]>>('/master/profil_pelatih.php')
      .then(r => setPelatihList(r.data ?? []))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)      params.set('search', search)
      if (kelasFilter) params.set('kelas',  kelasFilter)
      if (caborFilter) params.set('cabang_olahraga_id', caborFilter)
      const res = await api.get<ApiResponse<{siswa:Siswa[];kelas_list:string[]}>>(`/master/siswa.php?${params}`)
      setSiswa(res.data?.siswa ?? [])
      setKelasList(res.data?.kelas_list ?? [])
    } catch { } finally { setLoading(false) }
  }, [search, kelasFilter, caborFilter])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const openAdd = () => {
    setSelected(null)
    setForm({nisn:'',nis:'',nama:'',kelas:'',jenis_kelamin:'L',cabang_olahraga_id: cabang[0]?.id?.toString()||'', pelatih_id:''})
    setError(''); setModal('add')
  }
  const openEdit = (s: Siswa) => {
    setSelected(s)
    setForm({nisn:s.nisn,nis:s.nis,nama:s.nama,kelas:s.kelas,jenis_kelamin:s.jenis_kelamin,cabang_olahraga_id:String(s.cabang_olahraga_id), pelatih_id: s.pelatih_id ? String(s.pelatih_id) : ''})
    setError(''); setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nisn||!form.nama||!form.kelas||!form.cabang_olahraga_id)
      { setError('NISN, Nama, Kelas, dan Cabang Olahraga wajib diisi.'); return }
    setSaving(true); setError('')
    const action = modal as 'add'|'edit'
    const namaDisimpan = form.nama
    try {
      const payload = {...form, cabang_olahraga_id: Number(form.cabang_olahraga_id), pelatih_id: form.pelatih_id ? Number(form.pelatih_id) : null}
      if (modal==='add') await api.post('/master/siswa.php', payload)
      else if (selected)  await api.put(`/master/siswa.php?id=${selected.id}`, payload)
      setModal(null)
      setSuccessInfo({open:true, nama:namaDisimpan, action})
      load()
    } catch (e:unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.'
      // Deteksi error kapasitas kelas penuh
      if (msg.includes('batas maksimal 40 siswa')) {
        const kelasMatch = msg.match(/Kelas ([\w-]+)/)
        const kelasName = kelasMatch ? kelasMatch[1] : form.kelas
        setModal(null)
        setClassFullModal({open: true, kelas: kelasName})
      } else {
        setError(msg)
      }
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/siswa.php?id=${confirm.id}`)
      setConfirm(c=>({...c,open:false})); load()
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Gagal menghapus.') }
    finally { setSaving(false) }
  }

  // Predefined kelas options
  const kelasOptions = ['X-1','X-2','X-3','X-4','X-5','XI-1','XI-2','XI-3','XI-4','XI-5','XII-1','XII-2','XII-3','XII-4','XII-5']

  return (
    <Layout title="Data Siswa">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Manajemen Data Siswa</h1>
          <p>Setiap siswa hanya boleh mengikuti <strong>1 (satu)</strong> Cabang Olahraga.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/kenaikan-kelas')}>
            <TrendingUp size={18} /> Proses Kenaikan Kelas
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16}/>
          <input className="search-input" placeholder="Cari nama atau NIS..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" value={kelasFilter} onChange={e => setKelasFilter(e.target.value)}>
          <option value="">Semua Kelas</option>
          {[...new Set([...kelasOptions,...kelasList])].map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="filter-select" value={caborFilter} onChange={e => setCaborFilter(e.target.value)}>
          <option value="">Semua Cabor</option>
          {cabang.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
        </select>
        <span className="badge badge-neutral">{siswa.length} siswa</span>
      </div>

      {/* Info banner kapasitas */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(90deg, rgba(17,85,168,0.06), rgba(17,85,168,0.02))',
        border: '1px solid rgba(17,85,168,0.15)',
        borderLeft: '4px solid #1155a8',
        borderRadius: 10, padding: '10px 16px',
        marginBottom: 'var(--sp-4)',
        fontSize: '0.83rem', color: '#1a3a6b',
      }}>
        <Users size={16} style={{color:'#1155a8', flexShrink:0}} />
        <span>
          <strong>Kapasitas Kelas:</strong> Setiap kelas dibatasi maksimal{' '}
          <strong style={{color:'#c1272d'}}>40 siswa</strong> aktif.
          Sistem akan menolak penambahan siswa jika kelas sudah penuh.
        </span>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="flex-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>No</th><th>NISN</th><th>NIS</th><th>Nama Siswa</th><th>Kelas</th>
                  <th>JK</th><th>Cabang Olahraga</th><th>Pelatih</th><th style={{ minWidth: 100, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {siswa.length===0 ? (
                  <tr><td colSpan={9} className="table-empty">
                    <GraduationCap size={32} style={{margin:'0 auto 8px',color:'var(--clr-text-4)'}}/>
                    Tidak ada siswa ditemukan.
                  </td></tr>
                ) : siswa.map((s,i) => (
                  <tr key={s.id}>
                    <td style={{color:'var(--clr-text-3)',width:48}}>{i+1}</td>
                    <td><code style={{fontSize:'0.82rem'}}>{s.nisn}</code></td>
                    <td><code style={{fontSize:'0.82rem'}}>{s.nis || <span style={{color:'var(--clr-text-4)',fontStyle:'italic'}}>-</span>}</code></td>
                    <td><strong>{s.nama}</strong></td>
                    <td><span className="badge badge-info">{s.kelas}</span></td>
                    <td><span className={`badge ${s.jenis_kelamin==='L'?'badge-primary':'badge-accent'}`}>
                      {s.jenis_kelamin==='L'?'Laki-laki':'Perempuan'}
                    </span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span className="badge badge-neutral" style={{fontSize:'0.7rem'}}>{s.kode_cabang}</span>
                        {s.nama_cabang}
                      </div>
                    </td>
                    <td>
                      {s.nama_pelatih ? (
                        <span style={{fontSize:'0.85rem'}}>{toTitleCase(s.nama_pelatih)}</span>
                      ) : (
                        <span style={{fontSize:'0.85rem',color:'var(--clr-text-4)',fontStyle:'italic'}}>Belum dipilih</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div className="td-actions" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(s)} title="Edit">
                          <Pencil size={15}/>
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Hapus"
                          onClick={()=>setConfirm({open:true,id:s.id})}>
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

      {/* Modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)}
        title={modal==='add'?'Tambah Siswa':'Edit Data Siswa'}
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

        {/* 1 Siswa = 1 Cabor notice */}
        <div style={{background:'var(--clr-primary-bg)',border:'1px solid rgba(232,93,47,0.3)',
          borderRadius:'var(--r-md)',padding:'var(--sp-3) var(--sp-4)',marginBottom:'var(--sp-5)',
          fontSize:'0.82rem',color:'var(--clr-primary-2)'}}>
          ⚠️ <strong>Aturan:</strong> Satu siswa hanya boleh mengikuti satu cabang olahraga.
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">NISN <span className="required">*</span></label>
            <input className="form-control" placeholder="(10 digit)"
              value={form.nisn} onChange={e=>setForm(f=>({...f,nisn:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">NIS <span style={{fontSize:'0.75rem',fontWeight:400,color:'var(--clr-text-3)'}}></span></label>
            <input className="form-control" placeholder="Kosongkan jika tidak ada"
              value={form.nis} onChange={e=>setForm(f=>({...f,nis:e.target.value}))}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
            <select className="form-control" value={form.jenis_kelamin}
              onChange={e=>setForm(f=>({...f,jenis_kelamin:e.target.value}))}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Pelatih <span style={{fontSize:'0.75rem',fontWeight:400,color:'var(--clr-text-3)'}}></span></label>
            <select className="form-control" value={form.pelatih_id}
              onChange={e=>setForm(f=>({...f,pelatih_id:e.target.value}))}
              disabled={!form.cabang_olahraga_id}>
              <option value="">-- Pilih Pelatih --</option>
              {pelatihList.filter(p => String(p.cabang_olahraga_id) === form.cabang_olahraga_id).map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
            {form.cabang_olahraga_id && pelatihList.filter(p => String(p.cabang_olahraga_id) === form.cabang_olahraga_id).length === 0 && (
              <div style={{fontSize:'0.75rem', color:'var(--clr-error)', marginTop:4}}>Belum ada pelatih untuk cabor ini.</div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Lengkap <span className="required">*</span></label>
          <input className="form-control" placeholder="Nama siswa"
            value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Kelas <span className="required">*</span></label>
            <select className="form-control" value={form.kelas}
              onChange={e=>setForm(f=>({...f,kelas:e.target.value}))}>
              <option value="">-- Pilih Kelas --</option>
              {kelasOptions.map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cabang Olahraga <span className="required">*</span></label>
            <select className="form-control" value={form.cabang_olahraga_id}
              onChange={e=>setForm(f=>({...f,cabang_olahraga_id:e.target.value, pelatih_id:''}))}>
              <option value="">-- Pilih Cabor --</option>
              {cabang.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open} onClose={()=>setConfirm(c=>({...c,open:false}))}
        onConfirm={handleDelete} loading={saving}
        message="Yakin ingin menghapus data siswa ini? Jika sudah memiliki penilaian, siswa akan dinonaktifkan."
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
            {successInfo.action === 'add' ? 'Siswa Berhasil Ditambahkan' : 'Data Siswa Diperbarui'}
          </h3>
          <p>
            Data siswa <strong>{successInfo.nama}</strong> berhasil{' '}
            {successInfo.action === 'add' ? 'ditambahkan ke sistem.' : 'diperbarui.'}
          </p>
        </div>
      </Modal>

      {/* Class Full Popup */}
      <Modal
        open={classFullModal.open}
        onClose={() => setClassFullModal(s=>({...s,open:false}))}
        title="Kelas Sudah Penuh"
        footer={
          <button className="btn btn-primary" onClick={() => setClassFullModal(s=>({...s,open:false}))}>
            Mengerti
          </button>
        }
      >
        <div className="confirm-body">
          <div className="confirm-icon" style={{
            background: 'rgba(234,179,8,0.12)',
            color: '#ca8a04',
          }}>
            <AlertTriangle size={28} />
          </div>
          <h3 style={{marginBottom:'var(--sp-2)'}}>
            Kapasitas Kelas Penuh
          </h3>
          <p style={{marginBottom: 'var(--sp-3)'}}>
            Kelas <strong>{classFullModal.kelas}</strong> sudah mencapai batas maksimal{' '}
            <strong style={{color:'#c1272d'}}>40 siswa</strong> aktif.
          </p>
          <div style={{
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: 8, padding: '10px 14px',
            fontSize: '0.82rem', color: '#92400e',
          }}>
            💡 Gunakan <strong>Proses Kenaikan Kelas</strong> untuk memindahkan siswa, atau pilih kelas lain yang masih tersedia.
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
