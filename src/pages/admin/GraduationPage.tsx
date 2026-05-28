import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { ApiResponse } from '../../types'
import {
  Search, CheckCircle2, AlertCircle, Loader2, GraduationCap, ArrowRight, Users, School
} from 'lucide-react'

interface SuccessResult { total: number }

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
          Kelulusan Berhasil!
        </h2>
        <p style={{ fontSize:'0.875rem', color:'#6b7faa', marginBottom:28, lineHeight:1.5 }}>
          Berhasil meluluskan <strong>{result.total} siswa</strong> menjadi alumni.
        </p>

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

interface StudentBrief {
  id: number; nisn: string; nis: string; nama: string
  kelas: string; jenis_kelamin: string
  nama_cabang: string; kode_cabang: string
}

const XII_CLASSES = ['XII-1','XII-2','XII-3','XII-4','XII-5']

export default function GraduationPage() {
  const [sourceKelas,      setSourceKelas]      = useState('')
  const [availableClasses, setAvailableClasses] = useState<string[]>([])

  const [students,       setStudents]       = useState<StudentBrief[]>([])
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set())

  const [loading,       setLoading]       = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [message,       setMessage]       = useState<{type:'success'|'error'; text:string}|null>(null)
  const [successResult, setSuccessResult] = useState<SuccessResult|null>(null)
  const [showConfirm,   setShowConfirm]   = useState(false)

  // Load available classes from API
  useEffect(() => {
    api.get<ApiResponse<{siswa: unknown[]; kelas_list: string[]}>>('/master/siswa.php')
      .then(sRes => {
        const list = sRes.data?.kelas_list ?? []
        setAvailableClasses(list)
      }).catch(() => {})
  }, [])

  const loadStudents = async () => {
    if (!sourceKelas) return
    setLoading(true); setMessage(null)
    try {
      const res = await api.get<ApiResponse<StudentBrief[]>>(
        `/master/graduation.php?kelas=${sourceKelas}`
      )
      const data = res.data ?? []
      setStudents(data)
      setSelectedIds(new Set(data.map(s => s.id)))
    } catch (e: unknown) {
      setMessage({ type:'error', text: e instanceof Error ? e.message : 'Gagal memuat data.' })
    } finally { setLoading(false) }
  }

  const handleSubmitRequest = () => {
    if (selectedIds.size === 0) { setMessage({ type:'error', text:'Pilih siswa yang akan diluluskan.' }); return }
    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirm(false); setSubmitting(true); setMessage(null)
    const payload = {
      students: students
        .filter(s => selectedIds.has(s.id))
        .map(s => ({ id: s.id })),
    }
    try {
      await api.post('/master/graduation.php', payload)
      setSuccessResult({ total: payload.students.length })
      setSelectedIds(new Set())
    } catch (e: unknown) {
      setMessage({ type:'error', text: e instanceof Error ? e.message : 'Gagal memproses.' })
    } finally { setSubmitting(false) }
  }

  return (
    <Layout title="Kelulusan Siswa Kelas 12">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kelulusan Siswa Kelas 12</h1>
          <p>Proses kelulusan siswa kelas 12 menjadi alumni. Data alumni tetap tersimpan di database.</p>
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
          <div className="form-group" style={{ flex:'1 1 220px', marginBottom:0 }}>
            <label className="form-label">Kelas Asal</label>
            <select className="form-control" value={sourceKelas}
              onChange={e => setSourceKelas(e.target.value)}>
              <option value="">Pilih Kelas...</option>
              {availableClasses.filter(c => c.startsWith('XII-')).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {availableClasses.filter(c => c.startsWith('XII-')).length === 0 && (
              <div style={{ fontSize:'0.75rem', color:'var(--clr-text-3)', marginTop:4 }}>
                Belum ada kelas XII dengan siswa aktif.
              </div>
            )}
          </div>

          <div style={{ flex:'0 0 auto', paddingBottom:0 }}>
            <button className="btn btn-primary" onClick={loadStudents}
              disabled={loading || !sourceKelas}
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
          <div className="card-header" style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'var(--sp-4) var(--sp-5)',
            background:'var(--clr-surface-2)', borderBottom:'1px solid var(--clr-border)',
            flexWrap:'wrap', gap:'var(--sp-3)'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="stat-icon accent" style={{ width:32, height:32 }}>
                <GraduationCap size={16}/>
              </div>
              <h3 className="card-title">
                {selectedIds.size > 0 ? `${selectedIds.size} Siswa Dipilih` : 'Pilih Siswa'}
              </h3>
            </div>

            <button className="btn btn-success"
              disabled={submitting || selectedIds.size === 0}
              onClick={handleSubmitRequest}>
              {submitting ? <Loader2 size={16} className="spin"/> : <GraduationCap size={16}/>}
              Proses Kelulusan ({selectedIds.size})
            </button>
          </div>

          <div className="table-wrapper" style={{ border:'none', borderRadius:0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width:48, paddingLeft:'var(--sp-5)' }}>
                    <input type="checkbox" style={{ cursor:'pointer' }}
                      checked={students.length > 0 && selectedIds.size === students.length}
                      onChange={e => {
                        if (e.target.checked)
                          setSelectedIds(new Set(students.map(s => s.id)))
                        else
                          setSelectedIds(new Set())
                      }}
                    />
                  </th>
                  <th style={{ width:48 }}>No</th>
                  <th>Data Siswa</th>
                  <th style={{ width:120, textAlign:'center' }}>Kelas</th>
                  <th style={{ width:100, textAlign:'center' }}>JK</th>
                  <th>Cabang Olahraga</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} style={{
                    opacity: selectedIds.has(s.id) ? 1 : 0.55,
                    transition: 'opacity 0.15s',
                  }}>
                    <td style={{ paddingLeft:'var(--sp-5)' }}>
                      <input type="checkbox" style={{ cursor:'pointer' }}
                        checked={selectedIds.has(s.id)}
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
                        <strong>{s.nama}</strong>
                        <span style={{ fontSize:'0.75rem', color:'var(--clr-text-3)' }}>
                          NISN: {s.nisn}{s.nis ? ` | NIS: ${s.nis}` : ''}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span className="badge badge-info">{s.kelas}</span>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span className={`badge ${s.jenis_kelamin === 'L' ? 'badge-primary' : 'badge-accent'}`}>
                        {s.jenis_kelamin === 'L' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span className="badge badge-neutral" style={{ fontSize:'0.7rem' }}>{s.kode_cabang}</span>
                        {s.nama_cabang}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no students loaded */}
      {!loading && students.length === 0 && sourceKelas && (
        <div className="card flex-center" style={{ padding: 60, flexDirection:'column', gap: 12 }}>
          <School size={40} style={{ color:'var(--clr-text-4)' }} />
          <p style={{ color:'var(--clr-text-3)', fontSize:'0.9rem' }}>
            Tidak ada siswa aktif di kelas {sourceKelas}.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Konfirmasi Kelulusan"
        message={`Apakah Anda yakin ingin meluluskan ${selectedIds.size} siswa menjadi alumni? Data akan tetap tersimpan di database tetapi tidak akan muncul di tampilan aktif.`}
        confirmLabel="Ya, Luluskan"
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
