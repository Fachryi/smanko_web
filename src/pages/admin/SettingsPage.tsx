import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { SettingPrestasi, SettingKehadiran, SettingBobotUtama, ApiResponse } from '../../types'
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react'

type Tab = 'bobot' | 'prestasi' | 'kehadiran'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('bobot')

  return (
    <Layout title="Pengaturan Global">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pengaturan Global</h1>
          <p>Konfigurasi kriteria penilaian yang berlaku untuk semua cabang olahraga.</p>
        </div>
        <Settings2 size={24} style={{color:'var(--clr-primary-2)'}}/>
      </div>

      <div className="tabs">
        {(['bobot','prestasi','kehadiran'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='bobot'     && '⚖️ Bobot Komponen Utama'}
            {t==='prestasi'  && '🏆 Tingkatan Prestasi'}
            {t==='kehadiran' && '📋 Rentang Kehadiran'}
          </button>
        ))}
      </div>

      {tab==='bobot'     && <BobotTab/>}
      {tab==='prestasi'  && <PrestasiTab/>}
      {tab==='kehadiran' && <KehadiranTab/>}
    </Layout>
  )
}

/* ============================================================
   TAB: Bobot Komponen Utama
   ============================================================ */
function BobotTab() {
  const [data,    setData]    = useState<SettingBobotUtama|null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [form,    setForm]    = useState({ keterampilan:'50', prestasi:'30', kehadiran:'20' })

  useEffect(() => {
    api.get<ApiResponse<SettingBobotUtama>>('/settings/bobot.php')
      .then(r => {
        const d = r.data
        if (d) {
          setData(d)
          setForm({
            keterampilan: String(d.bobot_keterampilan),
            prestasi:     String(d.bobot_prestasi),
            kehadiran:    String(d.bobot_kehadiran),
          })
        }
      }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const total = parseFloat(form.keterampilan||'0') + parseFloat(form.prestasi||'0') + parseFloat(form.kehadiran||'0')
  const isValid = Math.abs(total - 100) < 0.01

  const handleSave = async () => {
    if (!isValid) { setError(`Total bobot harus 100%. Saat ini: ${total.toFixed(2)}%`); return }
    setSaving(true); setError('')
    try {
      await api.put('/settings/bobot.php', {
        bobot_keterampilan: parseFloat(form.keterampilan),
        bobot_prestasi:     parseFloat(form.prestasi),
        bobot_kehadiran:    parseFloat(form.kehadiran),
      })
      setSuccess(true); setTimeout(()=>setSuccess(false), 3000)
    } catch (e:unknown) { setError(e instanceof Error ? e.message : 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>

  const progressColor = total > 100 ? 'danger' : isValid ? 'ok' : 'warning'

  return (
    <div style={{maxWidth:600}}>
      <div className="card">
        <div style={{background:'var(--clr-bg-3)',borderRadius:'var(--r-md)',padding:'var(--sp-4)',
          marginBottom:'var(--sp-5)',fontSize:'0.82rem',color:'var(--clr-text-2)',
          border:'1px solid var(--clr-border)',lineHeight:1.7}}>
          <strong style={{color:'var(--clr-text)'}}>Formula Nilai Akhir Rapor:</strong><br/>
          Nilai Akhir = (Nilai Keterampilan × <span style={{color:'var(--clr-primary-2)'}}>Bobot Keterampilan</span>) +{' '}
          (Nilai Prestasi × <span style={{color:'var(--clr-accent)'}}>Bobot Prestasi</span>) +{' '}
          (Nilai Kehadiran × <span style={{color:'var(--clr-success)'}}>Bobot Kehadiran</span>)
        </div>

        {error   && <div className="login-error" style={{marginBottom:'var(--sp-4)'}}><AlertCircle size={14}/>{error}</div>}
        {success && <div style={{background:'var(--clr-success-bg)',border:'1px solid rgba(34,197,94,0.3)',
          color:'var(--clr-success)',borderRadius:'var(--r-md)',padding:'10px 16px',
          marginBottom:'var(--sp-4)',display:'flex',alignItems:'center',gap:8,fontSize:'0.875rem'}}>
          <CheckCircle2 size={14}/> Bobot berhasil disimpan!
        </div>}

        {[
          { key:'keterampilan', label:'🏃 Keterampilan Olahraga', color:'var(--clr-primary-2)',
            desc:'Bobot untuk nilai keterampilan teknis (weighted average per kriteria cabor)' },
          { key:'prestasi',     label:'🏆 Prestasi Olahraga',     color:'var(--clr-accent)',
            desc:'Bobot untuk nilai prestasi kejuaraan' },
          { key:'kehadiran',    label:'📋 Kehadiran Latihan',      color:'var(--clr-success)',
            desc:'Bobot untuk nilai kehadiran latihan' },
        ].map(({key, label, color, desc}) => (
          <div key={key} className="form-group">
            <label className="form-label" style={{color}}>{label}</label>
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp-3)'}}>
              <input className="form-control" type="number" step="0.01" min="0" max="100"
                value={form[key as keyof typeof form]}
                onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                style={{maxWidth:120}}/>
              <span style={{fontWeight:700,color}}>%</span>
            </div>
            <div className="form-help">{desc}</div>
          </div>
        ))}

        {/* Progress */}
        <div style={{padding:'var(--sp-4)',background:'var(--clr-bg-3)',borderRadius:'var(--r-md)',
          border:'1px solid var(--clr-border)',marginBottom:'var(--sp-5)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'var(--sp-2)'}}>
            <span style={{fontSize:'0.82rem',fontWeight:600}}>Total Bobot</span>
            <span style={{fontWeight:700,fontSize:'0.95rem',
              color: total>100?'var(--clr-danger)':isValid?'var(--clr-success)':'var(--clr-warning)'}}>
              {total.toFixed(2)}% / 100%
            </span>
          </div>
          <div className="progress-bar-wrapper">
            <div className={`progress-bar ${progressColor}`} style={{width:`${Math.min(100,total)}%`}}/>
          </div>
          <div style={{marginTop:8,fontSize:'0.78rem',
            color: isValid?'var(--clr-success)':total>100?'var(--clr-danger)':'var(--clr-warning)',
            display:'flex',alignItems:'center',gap:4}}>
            {isValid ? <><CheckCircle2 size={12}/> Bobot valid (total = 100%)</> 
                     : <><AlertCircle size={12}/> {total>100?'Melebihi':'Kurang dari'} 100%</>}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving||!isValid}>
          {saving?<><span className="spinner"/>Menyimpan...</>:'Simpan Bobot'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   TAB: Tingkatan Prestasi
   ============================================================ */
function PrestasiTab() {
  const [data,    setData]    = useState<SettingPrestasi[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean;id:number}>({open:false,id:0})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<SettingPrestasi|null>(null)
  const [form,    setForm]    = useState({tingkatan:'',nilai:'',urutan:'1'})

  const load = useCallback(async() => {
    setLoading(true)
    try {
      const r = await api.get<ApiResponse<SettingPrestasi[]>>('/settings/prestasi.php')
      setData(r.data??[])
    } catch {} finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  const openAdd = () => { setSelected(null); setForm({tingkatan:'',nilai:'',urutan:String(data.length+1)}); setError(''); setModal('add') }
  const openEdit = (p: SettingPrestasi) => { setSelected(p); setForm({tingkatan:p.tingkatan,nilai:String(p.nilai),urutan:String(p.urutan)}); setError(''); setModal('edit') }

  const handleSave = async () => {
    if (!form.tingkatan||!form.nilai) { setError('Tingkatan dan nilai wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      const payload = {tingkatan:form.tingkatan,nilai:parseFloat(form.nilai),urutan:parseInt(form.urutan)||1}
      if (modal==='add') await api.post('/settings/prestasi.php', payload)
      else if (selected) await api.put(`/settings/prestasi.php?id=${selected.id}`, payload)
      setModal(null); load()
    } catch (e:unknown) { setError(e instanceof Error?e.message:'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await api.delete(`/settings/prestasi.php?id=${confirm.id}`); setConfirm(c=>({...c,open:false})); load() }
    catch (e:unknown) { alert(e instanceof Error?e.message:'Gagal.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{maxWidth:700}}>
      <div className="card" style={{padding:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'var(--sp-4) var(--sp-6)',borderBottom:'1px solid var(--clr-border)'}}>
          <div>
            <h3 style={{marginBottom:2}}>Tingkatan Prestasi</h3>
            <p style={{margin:0,fontSize:'0.8rem'}}>Nilai mutlak yang diberikan (0–100) per tingkatan kejuaraan.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/> Tambah</button>
        </div>
        {loading ? <div className="flex-center" style={{padding:40}}><div className="spinner"/></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Urutan</th><th>Tingkatan</th><th>Nilai</th><th>Aksi</th></tr></thead>
              <tbody>
                {data.map(p=>(
                  <tr key={p.id}>
                    <td style={{color:'var(--clr-text-3)',width:80}}>{p.urutan}</td>
                    <td><strong>{p.tingkatan}</strong></td>
                    <td><span className="badge badge-accent" style={{fontSize:'0.85rem'}}>{p.nilai}</span></td>
                    <td><div className="td-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(p)}><Pencil size={14}/></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setConfirm({open:true,id:p.id})}><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                ))}
                {data.length===0&&<tr><td colSpan={4} className="table-empty">Belum ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='add'?'Tambah Tingkatan':'Edit Tingkatan'}
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<span className="spinner"/>:'Simpan'}</button>
        </>}>
        {error&&<div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{error}</div>}
        <div className="form-group"><label className="form-label">Tingkatan <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: Internasional" value={form.tingkatan} onChange={e=>setForm(f=>({...f,tingkatan:e.target.value}))}/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nilai (0–100) <span className="required">*</span></label>
            <input className="form-control" type="number" min="0" max="100" step="0.01" placeholder="Contoh: 100"
              value={form.nilai} onChange={e=>setForm(f=>({...f,nilai:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Urutan</label>
            <input className="form-control" type="number" min="1" value={form.urutan} onChange={e=>setForm(f=>({...f,urutan:e.target.value}))}/></div>
        </div>
      </Modal>
      <ConfirmDialog open={confirm.open} onClose={()=>setConfirm(c=>({...c,open:false}))} onConfirm={handleDelete} loading={saving} message="Yakin ingin menghapus tingkatan prestasi ini?"/>
    </div>
  )
}

/* ============================================================
   TAB: Rentang Kehadiran
   ============================================================ */
function KehadiranTab() {
  const [data,    setData]    = useState<SettingKehadiran[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean;id:number}>({open:false,id:0})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<SettingKehadiran|null>(null)
  const [form,    setForm]    = useState({kategori:'',nilai_min:'',nilai_max:'',nilai_konversi:'',urutan:'1'})

  const load = useCallback(async()=>{
    setLoading(true)
    try { const r=await api.get<ApiResponse<SettingKehadiran[]>>('/settings/kehadiran.php'); setData(r.data??[]) }
    catch {} finally { setLoading(false) }
  },[])
  useEffect(()=>{ load() },[load])

  const openAdd = () => { setSelected(null); setForm({kategori:'',nilai_min:'',nilai_max:'',nilai_konversi:'',urutan:String(data.length+1)}); setError(''); setModal('add') }
  const openEdit = (k: SettingKehadiran) => { setSelected(k); setForm({kategori:k.kategori,nilai_min:String(k.nilai_min),nilai_max:String(k.nilai_max),nilai_konversi:String(k.nilai_konversi),urutan:String(k.urutan)}); setError(''); setModal('edit') }

  const handleSave = async () => {
    if (!form.kategori||form.nilai_min===''||form.nilai_max===''||!form.nilai_konversi) { setError('Semua field wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      const payload = {kategori:form.kategori,nilai_min:parseFloat(form.nilai_min),nilai_max:parseFloat(form.nilai_max),nilai_konversi:parseFloat(form.nilai_konversi),urutan:parseInt(form.urutan)||1}
      if (modal==='add') await api.post('/settings/kehadiran.php', payload)
      else if (selected) await api.put(`/settings/kehadiran.php?id=${selected.id}`, payload)
      setModal(null); load()
    } catch (e:unknown) { setError(e instanceof Error?e.message:'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await api.delete(`/settings/kehadiran.php?id=${confirm.id}`); setConfirm(c=>({...c,open:false})); load() }
    catch (e:unknown) { alert(e instanceof Error?e.message:'Gagal.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{maxWidth:700}}>
      <div className="card" style={{padding:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'var(--sp-4) var(--sp-6)',borderBottom:'1px solid var(--clr-border)'}}>
          <div>
            <h3 style={{marginBottom:2}}>Rentang Kehadiran</h3>
            <p style={{margin:0,fontSize:'0.8rem'}}>Konversi persentase kehadiran ke nilai rapor.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/> Tambah</button>
        </div>
        {loading ? <div className="flex-center" style={{padding:40}}><div className="spinner"/></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Urutan</th><th>Kategori</th><th>Rentang Hadir (%)</th><th>Nilai Rapor</th><th>Aksi</th></tr></thead>
              <tbody>
                {data.map(k=>(
                  <tr key={k.id}>
                    <td style={{color:'var(--clr-text-3)',width:80}}>{k.urutan}</td>
                    <td><strong>{k.kategori}</strong></td>
                    <td style={{color:'var(--clr-text-2)'}}>{k.nilai_min}% – {k.nilai_max}%</td>
                    <td><span className="badge badge-success" style={{fontSize:'0.85rem'}}>{k.nilai_konversi}</span></td>
                    <td><div className="td-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(k)}><Pencil size={14}/></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setConfirm({open:true,id:k.id})}><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                ))}
                {data.length===0&&<tr><td colSpan={5} className="table-empty">Belum ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='add'?'Tambah Rentang':'Edit Rentang'}
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<span className="spinner"/>:'Simpan'}</button>
        </>}>
        {error&&<div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{error}</div>}
        <div className="form-group"><label className="form-label">Kategori <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: Baik Sekali" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nilai Min (%) <span className="required">*</span></label>
            <input className="form-control" type="number" min="0" max="100" placeholder="Contoh: 86" value={form.nilai_min} onChange={e=>setForm(f=>({...f,nilai_min:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Nilai Max (%) <span className="required">*</span></label>
            <input className="form-control" type="number" min="0" max="100" placeholder="Contoh: 100" value={form.nilai_max} onChange={e=>setForm(f=>({...f,nilai_max:e.target.value}))}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nilai Konversi <span className="required">*</span></label>
            <input className="form-control" type="number" min="0" max="100" step="0.01" placeholder="0–100"
              value={form.nilai_konversi} onChange={e=>setForm(f=>({...f,nilai_konversi:e.target.value}))}/>
            <div className="form-help">Nilai yang dimasukkan ke rapor</div></div>
          <div className="form-group"><label className="form-label">Urutan</label>
            <input className="form-control" type="number" min="1" value={form.urutan} onChange={e=>setForm(f=>({...f,urutan:e.target.value}))}/></div>
        </div>
      </Modal>
      <ConfirmDialog open={confirm.open} onClose={()=>setConfirm(c=>({...c,open:false}))} onConfirm={handleDelete} loading={saving} message="Yakin ingin menghapus rentang kehadiran ini?"/>
    </div>
  )
}
