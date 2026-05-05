import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import type { ApiResponse } from '../../types'
import {
  Search, ClipboardList, CheckCircle, Clock, ChevronLeft,
  GraduationCap, Dumbbell, FileText, Loader2, Printer, Download
} from 'lucide-react'
import { printStudentReport } from '../../utils/printReport'
import { useAuth } from '../../contexts/AuthContext'

interface SiswaStatus {
  id: number
  nisn: string
  nis: string
  nama: string
  jenis_kelamin: 'L' | 'P'
  kelas: string
  nama_cabang: string
  kode_cabang: string
  penilaian_id: number | null
  nilai_akhir: number | null
  predikat: string | null
  status_penilaian: 'draft' | 'final' | null
  tanggal_input: string | null
}

interface KelasData {
  kelas: string
  total: number
  sudah_dinilai: number
  belum_dinilai: number
  tahun_ajaran?: {
    id: number
    nama: string
    semester: number
    status: 'aktif' | 'tutup'
  }
  siswa: SiswaStatus[]
}

const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': 'badge-accent',
  'B (Baik)':     'badge-success',
  'C (Cukup)':    'badge-info',
  'D (Kurang)':   'badge-warning',
  'E (Sangat Kurang)': 'badge-danger',
}

export default function KelasDetailPage() {
  const { kelas }           = useParams<{ kelas: string }>()
  const [searchParams]      = useSearchParams()
  const taId                = Number(searchParams.get('ta') ?? 0)
  const navigate            = useNavigate()
  const { user }            = useAuth()

  const [data, setData]     = useState<KelasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'semua' | 'belum' | 'sudah'>('semua')
  const [printingId, setPrintingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!kelas || !taId) return
    setLoading(true)
    try {
      const r = await api.get<ApiResponse<KelasData>>(
        `/penilaian/status_kelas.php?kelas=${kelas}&tahun_ajaran_id=${taId}`
      )
      setData(r.data ?? null)
    } catch { } finally { setLoading(false) }
  }, [kelas, taId])

  useEffect(() => { load() }, [load])

  const filtered = (data?.siswa ?? []).filter(s => {
    const matchSearch = !search ||
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'semua' ? true :
      filter === 'belum' ? s.penilaian_id === null :
      s.penilaian_id !== null
    return matchSearch && matchFilter
  })

  const pct = data && data.total > 0
    ? Math.round((data.sudah_dinilai / data.total) * 100) : 0

  /* ── Cetak Raport per siswa ── */
  const handlePrint = async (s: SiswaStatus) => {
    if (!s.penilaian_id) return
    setPrintingId(s.id)
    try {
      // Ambil detail penilaian, tahun ajaran, dan bobot bersamaan
      const [pRes, taRes, bobotRes] = await Promise.all([
        api.get<ApiResponse<any>>(`/penilaian/input.php?siswa_id=${s.id}&tahun_ajaran_id=${taId}`),
        api.get<ApiResponse<any[]>>('/master/tahun_ajaran.php'),
        api.get<ApiResponse<any>>('/settings/bobot.php').catch(() => ({ data: null })),
      ])

      const penilaian = pRes.data
      if (!penilaian) { alert('Data penilaian tidak ditemukan.'); return }

      const taList = taRes.data ?? []
      const ta = taList.find((t: any) => t.id === taId)
      const taNama = ta ? `${ta.nama} – Semester ${ta.semester}` : String(taId)

      // Bobot dari setting admin (fallback 50/30/20)
      const bData = (bobotRes as any)?.data
      const bobot = bData ? {
        keterampilan: parseFloat(bData.bobot_keterampilan) || 50,
        prestasi:     parseFloat(bData.bobot_prestasi)     || 30,
        kehadiran:    parseFloat(bData.bobot_kehadiran)    || 20,
      } : undefined

      printStudentReport({
        siswa: {
          nama:          s.nama,
          nisn:          s.nisn,
          nis:           s.nis,
          kelas:         s.kelas,
          jenis_kelamin: s.jenis_kelamin,
          nama_cabang:   s.nama_cabang,
          kode_cabang:   s.kode_cabang,
        },
        penilaian,
        tahunAjaran: taNama,
        guruNama: penilaian.nama_pelatih || 'Belum Ditugaskan',
        bobot,
      })
    } catch (e: any) {
      console.error(e);
      alert('Gagal memuat data untuk dicetak. Error: ' + (e?.message || JSON.stringify(e)))
    } finally {
      setPrintingId(null)
    }
  }

  return (
    <Layout title={`Kelas ${kelas}`}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-4)' }}
        onClick={() => navigate('/guru/input-nilai')}>
        <ChevronLeft size={16} /> Kembali ke Daftar Kelas
      </button>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kelas {kelas}</h1>
          <p>Daftar siswa dan status penilaian. Klik <strong>Input Nilai</strong> untuk mulai menilai.</p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-success"><CheckCircle size={12} /> {data.sudah_dinilai} Selesai</span>
            <span className="badge badge-warning"><Clock size={12} /> {data.belum_dinilai} Belum</span>
          </div>
        )}
      </div>

      {/* Progress */}
      {data && (
        <div className="card" style={{ marginBottom: 'var(--sp-5)', padding: 'var(--sp-4) var(--sp-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: '0.85rem' }}>
            <span>Progress Penilaian Kelas {kelas}</span>
            <strong style={{ color: pct === 100 ? 'var(--clr-success)' : 'var(--clr-warning)' }}>
              {data.sudah_dinilai} / {data.total} siswa ({pct}%)
            </strong>
          </div>
          <div className="progress-bar-wrapper" style={{ height: 10 }}>
            <div className={`progress-bar ${pct === 100 ? 'ok' : pct > 50 ? 'warning' : 'danger'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari nama atau NIS..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['semua', 'belum', 'sudah'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}>
            {f === 'semua' ? 'Semua' : f === 'belum' ? '⏳ Belum Dinilai' : '✅ Sudah Dinilai'}
          </button>
        ))}
        <span className="badge badge-neutral">{filtered.length} siswa</span>
      </div>

      {/* Student Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex-center" style={{ padding: 60 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>NIS</th>
                  <th>Nama Siswa</th>
                  <th>JK</th>
                  <th>Cabang Olahraga</th>
                  <th>Status</th>
                  <th>Nilai Akhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="table-empty">
                    <GraduationCap size={32} style={{ margin: '0 auto 8px', color: 'var(--clr-text-4)' }} />
                    Tidak ada siswa ditemukan.
                  </td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--clr-text-3)', width: 48 }}>{i + 1}</td>
                    <td><code style={{ fontSize: '0.82rem' }}>{s.nis}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: s.jenis_kelamin === 'L'
                            ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                            : 'linear-gradient(135deg,#ec4899,#be185d)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.75rem', color: '#fff', flexShrink: 0
                        }}>
                          {s.nama.charAt(0).toUpperCase()}
                        </div>
                        <strong>{s.nama}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.jenis_kelamin === 'L' ? 'badge-primary' : 'badge-accent'}`}>
                        {s.jenis_kelamin === 'L' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Dumbbell size={14} style={{ color: 'var(--clr-primary-2)' }} />
                        <span style={{ fontSize: '0.865rem' }}>{s.nama_cabang}</span>
                      </div>
                    </td>
                    <td>
                      {s.penilaian_id === null ? (
                        <span className="badge badge-danger"><Clock size={11} /> Belum Dinilai</span>
                      ) : s.status_penilaian === 'final' ? (
                        <span className="badge badge-success"><CheckCircle size={11} /> Final</span>
                      ) : (
                        <span className="badge badge-warning">📝 Draft</span>
                      )}
                    </td>
                    <td>
                      {s.nilai_akhir !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--clr-text)' }}>
                            {Number(s.nilai_akhir).toFixed(2)}
                          </strong>
                          {s.predikat && (
                            <span className={`badge ${PREDIKAT_COLOR[s.predikat] || 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                              {s.predikat}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--clr-text-4)', fontSize: '0.82rem' }}>–</span>
                      )}
                    </td>
                    <td>
                      {/* Tombol aksi */}
                      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'nowrap' }}>
                        {/* Tombol Input/Edit */}
                        <button
                          className={`btn btn-sm ${s.penilaian_id ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => navigate(`/guru/form-nilai/${s.id}?ta=${taId}&kelas=${kelas}`)}
                        >
                          <ClipboardList size={14} />
                          <span className="hide-mobile">
                            {data?.tahun_ajaran?.status === 'tutup' ? 'Lihat' : (s.penilaian_id ? 'Edit' : 'Input')}
                          </span>
                        </button>

                        {/* Tombol Cetak PDF */}
                        {s.penilaian_id && (
                          <button
                            className="btn btn-sm"
                            disabled={printingId === s.id}
                            title="Cetak/Unduh PDF"
                            onClick={() => handlePrint(s)}
                            style={{
                              background: 'var(--clr-info-bg)',
                              color: 'var(--clr-info)',
                              border: '1px solid rgba(59,130,246,0.3)',
                              padding: '0 8px'
                            }}
                          >
                            {printingId === s.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Printer size={14} />}
                            <span className="hide-mobile">Cetak PDF</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
