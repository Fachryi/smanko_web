import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { CabangOlahraga, KriteriaKeterampilan, ApiResponse } from '../../types'
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, CheckCircle } from 'lucide-react'

type FormData = { nama:string; bobot:string; urutan:string }

export default function KriteriaPage() {
  const [cabangList, setCabangList] = useState<CabangOlahraga[]>([])
  const [selectedCabang, setSelectedCabang] = useState<number>(0)
  const [kriteria, setKriteria]   = useState<KriteriaKeterampilan[]>([])
  const [totalBobot, setTotalBobot] = useState(0)
  const [loading,  setLoading]    = useState(false)
  const [modal,    setModal]      = useState<'add'|'edit'|null>(null)
  const [confirm,  setConfirm]    = useState<{open:boolean;id:number}>({open:false,id:0})
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState('')
  const [selected, setSelected]   = useState<KriteriaKeterampilan|null>(null)
  const [form,     setForm]       = useState<FormData>({nama:'',bobot:'',urutan:'1'})
  const [successInfo, setSuccessInfo] = useState<{open:boolean;nama:string;action:'add'|'edit'}>({open:false,nama:'',action:'add'})

  useEffect(() => {
    api.get<ApiResponse<CabangOlahraga[]>>('/master/cabang.php')
      .then(r => {
        const list = r.data ?? []
        setCabangList(list)
        if (list.length) setSelectedCabang(list[0].id)
      }).catch(()=>{})
  },[])

  const loadKriteria = useCallback(async () => {
    if (!selectedCabang) return
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<{kriteria:KriteriaKeterampilan[];total_bobot:number;valid:boolean}>>(
        `/master/kriteria.php?cabang_olahraga_id=${selectedCabang}`
      )
      setKriteria(res.data?.kriteria ?? [])
      setTotalBobot(res.data?.total_bobot ?? 0)
    } catch { } finally { setLoading(false) }
  }, [selectedCabang])
  useEffect(() => { loadKriteria() }, [loadKriteria])

  const sisaBobot = 100 - totalBobot

  const openAdd = () => {
    setSelected(null)
    setForm({nama:'',bobot:String(Math.max(0,sisaBobot).toFixed(2)),urutan:String(kriteria.length+1)})
    setError(''); setModal('add')
  }
  const openEdit = (k: KriteriaKeterampilan) => {
    setSelected(k)
    setForm({nama:k.nama,bobot:String(k.bobot),urutan:String(k.urutan)})
    setError(''); setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nama||!form.bobot) { setError('Nama dan bobot wajib diisi.'); return }
    const bobot = parseFloat(form.bobot)
    if (isNaN(bobot)||bobot<=0) { setError('Bobot harus lebih dari 0.'); return }

    setSaving(true); setError('')
    const action = modal as 'add'|'edit'
    const namaDisimpan = form.nama.trim()
    try {
      const payload = {
        cabang_olahraga_id: selectedCabang,
        nama: form.nama.trim(),
        bobot,
        urutan: parseInt(form.urutan)||1,
      }
      if (modal==='add') await api.post('/master/kriteria.php', payload)
      else if (selected) await api.put(`/master/kriteria.php?id=${selected.id}`, payload)
      setModal(null)
      setSuccessInfo({open:true, nama:namaDisimpan, action})
      loadKriteria()
    } catch (e:unknown) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/master/kriteria.php?id=${confirm.id}`)
      setConfirm(c=>({...c,open:false})); loadKriteria()
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Gagal.') }
    finally { setSaving(false) }
  }

  const progressColor = totalBobot < 99 ? 'warning' : totalBobot > 100 ? 'danger' : 'ok'
  const progressWidth = Math.min(100, totalBobot)

  return (
    <Layout title="Kriteria Keterampilan">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kriteria Keterampilan</h1>
          <p>Indikator penilaian teknis per cabang olahraga. Total bobot wajib <strong>100%</strong>.</p>
        </div>
      </div>

      {/* Cabang Selector */}
      <div className="card" style={{marginBottom:'var(--sp-5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'var(--sp-4)',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <label className="form-label" style={{marginBottom:'var(--sp-2)'}}>Pilih Cabang Olahraga</label>
            <select className="form-control" value={selectedCabang}
              onChange={e=>setSelectedCabang(Number(e.target.value))}>
              {cabangList.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          </div>
          <div style={{flex:2,minWidth:300}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'var(--sp-2)'}}>
              <span className="form-label" style={{marginBottom:0}}>Total Bobot</span>
              <span style={{fontSize:'0.85rem',fontWeight:700,
                color: totalBobot>100 ? 'var(--clr-danger)' : totalBobot===100 ? 'var(--clr-success)' : 'var(--clr-warning)'}}>
                {totalBobot.toFixed(2)}% / 100%
              </span>
            </div>
            <div className="progress-bar-wrapper">
              <div className={`progress-bar ${progressColor}`} style={{width:`${progressWidth}%`}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              {totalBobot===100
                ? <span style={{fontSize:'0.78rem',color:'var(--clr-success)',display:'flex',alignItems:'center',gap:4}}>
                    <CheckCircle2 size={13}/> Bobot sudah lengkap
                  </span>
                : <span style={{fontSize:'0.78rem',color:'var(--clr-warning)',display:'flex',alignItems:'center',gap:4}}>
                    <AlertCircle size={13}/> Sisa {sisaBobot.toFixed(2)}% belum dialokasikan
                  </span>
              }
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd} disabled={totalBobot>=100}>
            <Plus size={16}/> Tambah Kriteria
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="flex-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{width:48}}>No</th>
                  <th>Nama Kriteria</th>
                  <th>Bobot (%)</th>
                  <th>Urutan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kriteria.length===0 ? (
                  <tr><td colSpan={5} className="table-empty">
                    Belum ada kriteria. Tambahkan indikator keterampilan untuk cabang ini.
                  </td></tr>
                ) : kriteria.map((k,i) => (
                  <tr key={k.id}>
                    <td style={{color:'var(--clr-text-3)'}}>{i+1}</td>
                    <td><strong>{k.nama}</strong></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'var(--sp-3)'}}>
                        <div style={{width:80,background:'var(--clr-bg-3)',borderRadius:'var(--r-full)',height:6,overflow:'hidden'}}>
                          <div style={{height:'100%',background:'var(--clr-primary)',borderRadius:'var(--r-full)',
                            width:`${Math.min(100,k.bobot)}%`}}/>
                        </div>
                        <span style={{fontWeight:700,color:'var(--clr-primary-2)'}}>{k.bobot}%</span>
                      </div>
                    </td>
                    <td style={{color:'var(--clr-text-3)'}}>{k.urutan}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(k)}><Pencil size={15}/></button>
                        <button className="btn btn-danger btn-sm btn-icon"
                          onClick={()=>setConfirm({open:true,id:k.id})}><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {kriteria.length>0 && (
                <tfoot>
                  <tr style={{background:'var(--clr-surface-2)'}}>
                    <td colSpan={2} style={{padding:'10px 16px',fontWeight:700,fontSize:'0.875rem'}}>TOTAL BOBOT</td>
                    <td style={{padding:'10px 16px',fontWeight:700,
                      color: totalBobot===100 ? 'var(--clr-success)' : 'var(--clr-warning)'}}>
                      {totalBobot.toFixed(2)}%
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)}
        title={modal==='add'?'Tambah Kriteria':'Edit Kriteria'}
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
        <div className="form-group">
          <label className="form-label">Nama Kriteria <span className="required">*</span></label>
          <input className="form-control" placeholder="Contoh: Teknik Dasar"
            value={form.nama} onChange={e=>setForm(f=>({...f,nama:e.target.value}))}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bobot (%) <span className="required">*</span></label>
            <input className="form-control" type="number" step="0.01" min="0.01" max="100"
              placeholder={`Maks. sisa ${sisaBobot.toFixed(2)}%`}
              value={form.bobot} onChange={e=>setForm(f=>({...f,bobot:e.target.value}))}/>
            {modal==='add' && (
              <div className="form-help">Sisa bobot tersedia: <strong>{sisaBobot.toFixed(2)}%</strong></div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Urutan</label>
            <input className="form-control" type="number" min="1"
              value={form.urutan} onChange={e=>setForm(f=>({...f,urutan:e.target.value}))}/>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open} onClose={()=>setConfirm(c=>({...c,open:false}))}
        onConfirm={handleDelete} loading={saving}
        message="Yakin ingin menghapus kriteria ini? Tidak bisa dihapus jika sudah digunakan dalam penilaian."
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
            {successInfo.action === 'add' ? 'Kriteria Penilaian Berhasil Ditambahkan' : 'Kriteria Penilaian Berhasil Diperbarui'}
          </h3>
          <p>
            Kriteria <strong>{successInfo.nama}</strong> berhasil{' '}
            {successInfo.action === 'add' ? 'ditambahkan ke cabang olahraga.' : 'diperbarui.'}
          </p>
        </div>
      </Modal>
    </Layout>
  )
}
