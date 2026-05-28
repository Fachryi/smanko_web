import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { api } from '../../lib/apiClient'
import type { User, TahunAjaran, GuruKelas, ApiResponse } from '../../types'
import { BookOpen, CheckSquare, Square, Save, CheckCircle } from 'lucide-react'

const KELAS_TERSEDIA = ['X-1','X-2','X-3','X-4','X-5','XI-1','XI-2','XI-3','XI-4','XI-5','XII-1','XII-2','XII-3','XII-4','XII-5']

export default function GuruKelasPage() {
  const [gurus,        setGurus]        = useState<User[]>([])
  const [tahunAjarans, setTahunAjarans] = useState<TahunAjaran[]>([])
  const [selectedGuru, setSelectedGuru] = useState<number>(0)
  const [selectedTA,   setSelectedTA]   = useState<number>(0)
  const [tugasGuru,    setTugasGuru]    = useState<GuruKelas[]>([])
  const [checkedKelas, setCheckedKelas] = useState<Set<string>>(new Set())
  const [saving,       setSaving]       = useState(false)
  const [allAssign,    setAllAssign]    = useState<GuruKelas[]>([])
  const [successInfo,  setSuccessInfo]  = useState<{open:boolean;nama:string}>({open:false,nama:''})
  const [siswaCounts,  setSiswaCounts]  = useState<Record<string, number>>({})

  // Load guru & tahun ajaran & hitung siswa per kelas
  useEffect(() => {
    api.get<ApiResponse<{siswa: {kelas: string}[]}>>('/master/siswa.php?status=aktif')
      .then(r => {
        const list = r.data?.siswa || []
        const counts: Record<string, number> = {}
        list.forEach(s => {
          counts[s.kelas] = (counts[s.kelas] || 0) + 1
        })
        setSiswaCounts(counts)
      }).catch(()=>{})

    api.get<ApiResponse<User[]>>('/master/users.php?role=guru_olahraga&status=aktif')
      .then(r => {
        const list = r.data ?? []
        setGurus(list)
        if (list.length) setSelectedGuru(list[0].id)
      }).catch(()=>{})
    api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php')
      .then(r => {
        const list = r.data ?? []
        setTahunAjarans(list)
        const aktif = list.find(t=>t.status==='aktif')
        if (aktif) setSelectedTA(aktif.id)
        else if (list.length) setSelectedTA(list[0].id)
      }).catch(()=>{})
  },[])

  // Load all assignments (for summary table)
  const loadAll = useCallback(async () => {
    if (!selectedTA) return
    try {
      const res = await api.get<ApiResponse<GuruKelas[]>>(`/master/guru_kelas.php?tahun_ajaran_id=${selectedTA}`)
      setAllAssign(res.data ?? [])
    } catch {}
  }, [selectedTA])
  useEffect(() => { loadAll() }, [loadAll])

  // Load kelas assignments for selected guru
  const loadGuruKelas = useCallback(async () => {
    if (!selectedGuru || !selectedTA) return
    try {
      const res = await api.get<ApiResponse<GuruKelas[]>>(`/master/guru_kelas.php?user_id=${selectedGuru}&tahun_ajaran_id=${selectedTA}`)
      const data = res.data ?? []
      setTugasGuru(data)
      setCheckedKelas(new Set(data.map(g=>g.kelas)))
    } catch {}
  }, [selectedGuru, selectedTA])
  useEffect(() => { loadGuruKelas() }, [loadGuruKelas])

  const toggleKelas = (kelas: string) => {
    setCheckedKelas(prev => {
      const next = new Set(prev)
      if (next.has(kelas)) next.delete(kelas)
      else next.add(kelas)
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedGuru||!selectedTA) return
    setSaving(true)
    const namaGuru = gurus.find(g=>g.id===selectedGuru)?.nama || ''
    try {
      await api.post('/master/guru_kelas.php', {
        user_id: selectedGuru,
        tahun_ajaran_id: selectedTA,
        kelas: Array.from(checkedKelas),
      })
      loadAll()  // refresh ringkasan penugasan di kanan
      setSuccessInfo({open:true, nama:namaGuru})
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  const selectedGuruData = gurus.find(g=>g.id===selectedGuru)

  // Group allAssign by guru
  const byGuru: Record<number, {nama:string; kelas:string[]}> = {}
  const otherAssignments = new Map<string, string>()

  allAssign.forEach(a => {
    const id = a.user_id
    if (!byGuru[id]) byGuru[id] = { nama: a.nama_guru||'', kelas: [] }
    byGuru[id].kelas.push(a.kelas)

    if (id !== selectedGuru) {
      otherAssignments.set(a.kelas, a.nama_guru || 'Guru lain')
    }
  })

  return (
    <Layout title="Penugasan Guru ke Kelas">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Penugasan Guru ke Kelas</h1>
          <p>Plotting kelas yang menjadi tanggung jawab setiap Guru / Staff per tahun ajaran.</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--sp-6)'}}>
        {/* Left: Assignment Form */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>
                <BookOpen size={18} style={{color:'var(--clr-primary-2)'}}/>
                Atur Penugasan
              </h3>
            </div>

            {/* Pilih Tahun Ajaran */}
            <div className="form-group">
              <label className="form-label">Tahun Ajaran</label>
                <select className="form-control" value={selectedTA}
                  onChange={e=>setSelectedTA(Number(e.target.value))}>
                  {(() => {
                    const sorted = [...tahunAjarans].sort((a, b) => {
                      if (a.nama !== b.nama) return a.nama.localeCompare(b.nama);
                      return a.semester - b.semester;
                    });
                    const activeIdx = sorted.findIndex(t => t.status === 'aktif');
                    return sorted.filter((_, i) => activeIdx === -1 || Math.abs(i - activeIdx) <= 1).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nama} – Semester {t.semester} {t.status==='aktif'?'(Aktif)':''}
                      </option>
                    ));
                  })()}
                </select>
            </div>

            {/* Pilih Guru */}
            <div className="form-group">
              <label className="form-label">Guru / Staff</label>
              <select className="form-control" value={selectedGuru}
                onChange={e => setSelectedGuru(Number(e.target.value))}>
                {gurus.map(g=><option key={g.id} value={g.id}>{g.nama}</option>)}
              </select>
            </div>

            {selectedGuruData && (
              <div style={{background:'var(--clr-bg-3)',borderRadius:'var(--r-md)',padding:'var(--sp-3) var(--sp-4)',
                marginBottom:'var(--sp-4)',fontSize:'0.82rem',color:'var(--clr-text-2)',
                border:'1px solid var(--clr-border)'}}>
                Guru <strong style={{color:'var(--clr-text)'}}>{selectedGuruData.nama}</strong> akan bisa menilai{' '}
                semua siswa di kelas yang dipilih, dari <em>semua cabang olahraga</em>.
              </div>
            )}

            {/* Kelas Checkbox Grid */}
            <div className="form-group">
              <label className="form-label">
                Pilih Kelas yang Diampu
                <span style={{marginLeft:8,fontWeight:400,color:'var(--clr-text-3)'}}>
                  ({checkedKelas.size} dipilih)
                </span>
              </label>
              <div className="checkbox-grid">
                {KELAS_TERSEDIA.map(kelas => {
                  const checked = checkedKelas.has(kelas)
                  const otherTeacher = otherAssignments.get(kelas)
                  const disabled = !!otherTeacher

                  return (
                    <label 
                      key={kelas} 
                      className={`checkbox-item ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                      style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                      title={disabled ? `Sudah ditugaskan ke ${otherTeacher}` : ''}
                    >
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        disabled={disabled}
                        onChange={() => { if (!disabled) toggleKelas(kelas) }}
                      />
                      {checked ? <CheckSquare size={15} style={{color: disabled ? 'var(--clr-text-4)' : 'var(--clr-primary-2)'}}/> 
                               : <Square size={15} style={{color:'var(--clr-text-4)'}}/>}
                      
                      <span style={{flex: 1}}>{kelas}</span>
                      
                      <span style={{
                        fontSize: '0.7rem',
                        color: disabled ? 'var(--clr-text-4)' : 'var(--clr-text-3)',
                        marginLeft: 'auto',
                        background: 'var(--clr-bg-3)',
                        padding: '2px 6px',
                        borderRadius: 'var(--r-sm)',
                        fontWeight: 500
                      }}>
                        {siswaCounts[kelas] || 0} Siswa
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner"/>Menyimpan...</> : <><Save size={16}/>Simpan Penugasan</>}
            </button>
          </div>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Ringkasan Penugasan</h3>
              <span className="badge badge-neutral">
                {tahunAjarans.find(t=>t.id===selectedTA)?.nama} - Sem {tahunAjarans.find(t=>t.id===selectedTA)?.semester}
              </span>
            </div>

            {Object.keys(byGuru).length === 0 ? (
              <div style={{textAlign:'center',padding:'var(--sp-8)',color:'var(--clr-text-3)'}}>
                Belum ada penugasan untuk tahun ajaran ini.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-3)'}}>
                {Object.entries(byGuru).map(([, g]) => (
                  <div key={g.nama} style={{padding:'var(--sp-3) var(--sp-4)',background:'var(--clr-bg-3)',
                    borderRadius:'var(--r-md)',border:'1px solid var(--clr-border)'}}>
                    <strong style={{display:'block',fontSize:'0.875rem',marginBottom:'var(--sp-2)'}}>{g.nama}</strong>
                    <div style={{display:'flex',gap:'var(--sp-2)',flexWrap:'wrap'}}>
                      {g.kelas.sort().map(k=>(
                        <span key={k} className="badge badge-primary">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{marginTop:'var(--sp-4)',background:'var(--clr-info-bg)',border:'1px solid rgba(59,130,246,0.3)',
            borderRadius:'var(--r-md)',padding:'var(--sp-4)',fontSize:'0.82rem',color:'var(--clr-info)'}}>
            <strong>ℹ️ Logika Sistem</strong>
            <ul style={{marginTop:'var(--sp-2)',paddingLeft:'var(--sp-4)',lineHeight:1.8}}>
              <li>Guru hanya melihat siswa di kelas yang ditugaskan</li>
              <li>Guru bisa menilai semua cabor di kelasnya</li>
              <li>Siswa di kelas lain tidak terlihat oleh pelatih</li>
            </ul>
          </div>
        </div>
      </div>

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
          <h3 style={{marginBottom:'var(--sp-2)'}}>Penugasan Berhasil Disimpan</h3>
          <p>
            Penugasan kelas untuk guru <strong>{successInfo.nama}</strong> berhasil disimpan.
            Halaman telah diperbarui.
          </p>
        </div>
      </Modal>
    </Layout>
  )
}
