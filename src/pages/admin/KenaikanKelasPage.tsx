import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { ApiResponse } from '../../types'
import {
  Search, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, Save, TrendingUp, ArrowRight
} from 'lucide-react'

// ── Success Modal ─────────────────────────────────────────────
interface SuccessResult { total: number; target_ta: string }

function SuccessModal({ result, onGo }: { result: SuccessResult; onGo: () => void }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onGo(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [onGo])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(11,45,107,0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', border: '1px solid #dce6f7', borderRadius: 24,
        padding: '40px 36px', maxWidth: 420, width: '100%', textAlign: 'center',
        boxShadow: '0 32px 80px rgba(11,45,107,0.25)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:6,
          background:'linear-gradient(90deg,#16a34a,#22c55e)' }} />

        <div style={{ width:72, height:72, borderRadius:'50%',
          background:'rgba(34,197,94,0.1)', border:'2px solid rgba(34,197,148,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle2 size={36} style={{ color:'#22c55e' }} />
        </div>

        <h2 style={{ fontSize:'1.2rem', fontWeight:800, marginBottom:8, color:'#0b2d6b' }}>
          Proses Berhasil!
        </h2>
        <p style={{ fontSize:'0.875rem', color:'#6b7faa', marginBottom:28, lineHeight:1.5 }}>
          Berhasil memproses pemindahan <strong>{result.total} siswa</strong><br/>
          ke tahun ajaran target.
        </p>

        <div style={{ background:'#f8faff', border:'1.5px solid #dce6f7',
          borderRadius:16, padding:'16px 24px', marginBottom:28 }}>
          <div style={{ fontSize:'0.72rem', textTransform:'uppercase',
            letterSpacing:'0.05em', color:'#8b9ab8', marginBottom:4 }}>
            Tahun Ajaran Tujuan
          </div>
          <div style={{ fontSize:'1.05rem', fontWeight:800, color:'#1155a8' }}>
            {result.target_ta}
          </div>
        </div>

        <button onClick={onGo} style={{
          width:'100%', padding:'12px 24px',
          background:'linear-gradient(135deg,#1155a8 0%,#1e6ec8 100%)',
          border:'none', borderRadius:12, color:'#fff',
          fontSize:'0.95rem', fontWeight:700, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          boxShadow:'0 6px 20px rgba(17,85,168,0.3)',
        }}>
          Selesai <ArrowRight size={18} />
        </button>
        <p style={{ marginTop:12, fontSize:'0.78rem', color:'#9ba3be' }}>
          Jendela tertutup dalam <strong style={{ color:'#1155a8' }}>{countdown}</strong> detik...
        </p>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────
interface StudentBrief {
  id: number; nis: string; nama: string
  kelas_lama: string; target_kelas_exist?: string
}
interface TahunAjaran {
  id: number; nama: string; semester: number; status: string
}

// ── Page ──────────────────────────────────────────────────────
export default function KenaikanKelasPage() {
  const [taList,           setTaList]           = useState<TahunAjaran[]>([])
  const [sourceTaId,       setSourceTaId]       = useState<number>(0)
  const [targetTaId,       setTargetTaId]       = useState<number>(0)
  const [sourceKelas,      setSourceKelas]      = useState('')
  const [availableClasses, setAvailableClasses] = useState<string[]>([])

  const [students,       setStudents]       = useState<StudentBrief[]>([])
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set())
  const [targetMappings, setTargetMappings] = useState<Record<number, string>>({})

  const [loading,       setLoading]       = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [message,       setMessage]       = useState<{type:'success'|'error'; text:string}|null>(null)
  const [successResult, setSuccessResult] = useState<SuccessResult|null>(null)
  const [showConfirm,   setShowConfirm]   = useState(false)

  // Load tahun ajaran & daftar kelas tersedia
  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php'),
      api.get<ApiResponse<{siswa: unknown[]; kelas_list: string[]}>>('/master/siswa.php'),
    ]).then(([taRes, sRes]) => {
      const list = taRes.data ?? []
      setTaList(list)
      setAvailableClasses(sRes.data?.kelas_list ?? [])
      const active = list.find(t => t.status === 'aktif')
      if (active) setSourceTaId(active.id)
    }).catch(() => {})
  }, [])

  const activeTa = taList.find(t => t.status === 'aktif')

  const suggestNextKelas = (k: string) => {
    if (k.startsWith('XI-')) return k.replace('XI-', 'XII-')
    if (k.startsWith('X-'))  return k.replace('X-', 'XI-')
    return k
  }

  const loadStudents = async () => {
    if (!sourceTaId || !sourceKelas) return
    setLoading(true); setMessage(null)
    try {
      const res = await api.get<ApiResponse<StudentBrief[]>>(
        `/master/promotion.php?source_ta_id=${sourceTaId}&kelas=${sourceKelas}&target_ta_id=${targetTaId}`
      )
      const data = res.data ?? []
      setStudents(data)

      const mappings: Record<number, string> = {}
      const initiallySelected = new Set<number>()
      const next = suggestNextKelas(sourceKelas)

      data.forEach(s => {
        if (s.target_kelas_exist) {
          mappings[s.id] = s.target_kelas_exist
        } else {
          mappings[s.id] = next
          initiallySelected.add(s.id)
        }
      })
      setTargetMappings(mappings)
      setSelectedIds(initiallySelected)
    } catch (e: unknown) {
      setMessage({ type:'error', text: e instanceof Error ? e.message : 'Gagal memuat data.' })
    } finally { setLoading(false) }
  }

  const handleUpdateMapping = (id: number, val: string) =>
    setTargetMappings(prev => ({ ...prev, [id]: val }))

  const handleSubmitRequest = () => {
    if (!targetTaId) { setMessage({ type:'error', text:'Pilih Tahun Ajaran tujuan terlebih dahulu.' }); return }
    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirm(false); setSubmitting(true); setMessage(null)
    const payload = {
      target_ta_id: targetTaId,
      students: students
        .filter(s => selectedIds.has(s.id))
        .map(s => ({ id: s.id, target_kelas: targetMappings[s.id] || '' })),
    }
    try {
      await api.post('/master/promotion.php', payload)
      const targetTa = taList.find(t => t.id === targetTaId)
      setSuccessResult({
        total: payload.students.length,
        target_ta: targetTa ? `${targetTa.nama} – Sem ${targetTa.semester}` : 'Tahun Ajaran Baru',
      })
      setSelectedIds(new Set())
    } catch (e: unknown) {
      setMessage({ type:'error', text: e instanceof Error ? e.message : 'Gagal memproses.' })
    } finally { setSubmitting(false) }
  }

  return (
    <Layout title="Kenaikan Kelas">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pindah / Kenaikan Kelas Massal</h1>
          <p>Kelola perpindahan siswa antar tahun ajaran secara kolektif.</p>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom:'var(--sp-5)' }}>
          {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          {message.text}
        </div>
      )}

      {/* Filter Card */}
      <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
        <div style={{ display:'flex', gap:'var(--sp-4)', flexWrap:'wrap', alignItems:'flex-end' }}>

          {/* Tahun Ajaran Asal – static */}
          <div className="form-group" style={{ flex:'1 1 220px', marginBottom:0 }}>
            <label className="form-label">Tahun Ajaran Asal</label>
            <div style={{
              height: 42, padding: '0 14px',
              border: '1.5px solid var(--clr-border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--clr-bg-3)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.9rem', color: 'var(--clr-text)',
            }}>
              {activeTa ? (
                <>
                  <span className="badge badge-success" style={{ fontSize:'0.68rem', flexShrink:0 }}>Aktif</span>
                  <span style={{ fontWeight:600 }}>{activeTa.nama}</span>
                  <span style={{ color:'var(--clr-text-3)', fontSize:'0.82rem' }}>– Sem {activeTa.semester}</span>
                </>
              ) : (
                <span style={{ color:'var(--clr-text-3)' }}>Belum ada tahun ajaran aktif</span>
              )}
            </div>
          </div>

          {/* Kelas Asal */}
          <div className="form-group" style={{ flex:'1 1 160px', marginBottom:0 }}>
            <label className="form-label">Kelas Asal</label>
            <select className="form-control" value={sourceKelas}
              onChange={e => setSourceKelas(e.target.value)}>
              <option value="">Pilih Kelas...</option>
              {availableClasses.filter(c => !c.startsWith('XII-')).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tombol */}
          <div style={{ flex:'0 0 auto', paddingBottom:0 }}>
            <button className="btn btn-primary" onClick={loadStudents}
              disabled={loading || !sourceTaId || !sourceKelas}
              style={{ height:42, paddingInline:24 }}>
              {loading ? <Loader2 size={16} className="spin"/> : <Search size={16}/>}
              Tampilkan Siswa
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Siswa */}
      {students.length > 0 && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* Header tabel */}
          <div className="card-header" style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'var(--sp-4) var(--sp-5)',
            background:'var(--clr-surface-2)', borderBottom:'1px solid var(--clr-border)',
            flexWrap:'wrap', gap:'var(--sp-3)'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="stat-icon primary" style={{ width:32, height:32 }}>
                <TrendingUp size={16}/>
              </div>
              <h3 className="card-title">
                {selectedIds.size > 0 ? `${selectedIds.size} Siswa Terpilih` : 'Pilih Siswa'}
              </h3>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--clr-text-2)', whiteSpace:'nowrap' }}>
                  Pindah Ke:
                </span>
                <select className="form-control" style={{ width:210, padding:'6px 12px' }}
                  value={targetTaId} onChange={e => setTargetTaId(Number(e.target.value))}>
                  <option value={0}>Pilih Tahun Ajaran Tujuan...</option>
                  {taList.map(ta => (
                    <option key={ta.id} value={ta.id}>
                      {ta.nama} – Sem {ta.semester}{ta.status === 'aktif' ? ' (Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-success"
                disabled={submitting || !targetTaId || selectedIds.size === 0}
                onClick={handleSubmitRequest}>
                {submitting ? <Loader2 size={16} className="spin"/> : <Save size={16}/>}
                Simpan Perpindahan ({selectedIds.size})
              </button>
            </div>
          </div>

          {/* Tabel */}
          <div className="table-wrapper" style={{ border:'none', borderRadius:0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width:48, paddingLeft:'var(--sp-5)' }}>
                    <input type="checkbox" style={{ cursor:'pointer' }}
                      checked={students.length > 0 &&
                        selectedIds.size === students.filter(s => !s.target_kelas_exist).length}
                      onChange={e => {
                        if (e.target.checked)
                          setSelectedIds(new Set(students.filter(s => !s.target_kelas_exist).map(s => s.id)))
                        else
                          setSelectedIds(new Set())
                      }}
                    />
                  </th>
                  <th style={{ width:48 }}>No</th>
                  <th>Data Siswa</th>
                  <th style={{ width:140, textAlign:'center' }}>Kelas Sekarang</th>
                  <th style={{ width:40, textAlign:'center' }}></th>
                  <th style={{ width:200 }}>Kelas Tujuan</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const isDone = !!s.target_kelas_exist
                  return (
                    <tr key={s.id} style={{
                      opacity: isDone ? 0.65 : selectedIds.has(s.id) ? 1 : 0.55,
                      transition: 'opacity 0.15s',
                      background: isDone ? 'var(--clr-bg-2)' : 'transparent',
                    }}>
                      <td style={{ paddingLeft:'var(--sp-5)' }}>
                        <input type="checkbox" style={{ cursor: isDone ? 'default' : 'pointer' }}
                          checked={selectedIds.has(s.id)} disabled={isDone}
                          onChange={() => {
                            const next = new Set(selectedIds)
                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id)
                            setSelectedIds(next)
                          }}
                        />
                      </td>
                      <td style={{ color:'var(--clr-text-3)' }}>{i + 1}</td>
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <strong>{s.nama}</strong>
                            {isDone && (
                              <span className="badge badge-success" style={{ fontSize:'0.62rem', padding:'1px 6px' }}>
                                ✓ Sudah Dipindah
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize:'0.75rem', color:'var(--clr-text-3)' }}>NIS: {s.nis}</span>
                        </div>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <span className="badge badge-neutral">{s.kelas_lama}</span>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <ChevronRight size={15} style={{ color:'var(--clr-text-4)' }}/>
                      </td>
                      <td>
                        <input className="form-control"
                          style={{ padding:'5px 10px', fontSize:'0.875rem',
                            background: isDone ? 'transparent' : '#fff' }}
                          value={targetMappings[s.id] ?? ''}
                          disabled={isDone}
                          onChange={e => handleUpdateMapping(s.id, e.target.value)}
                          placeholder="Nama kelas tujuan..."
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Konfirmasi Pindah Kelas"
        message={`Apakah Anda yakin ingin memproses kenaikan/pindah kelas untuk ${selectedIds.size} siswa terpilih ke tahun ajaran yang dipilih?`}
        confirmLabel="Ya, Proses"
        loading={submitting}
      />

      {successResult && (
        <SuccessModal
          result={successResult}
          onGo={() => { setSuccessResult(null); loadStudents() }}
        />
      )}
    </Layout>
  )
}
