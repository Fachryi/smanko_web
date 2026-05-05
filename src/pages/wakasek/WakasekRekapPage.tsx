import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import type { TahunAjaran, ApiResponse } from '../../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import {
  Users, TrendingUp, Trophy, Award, FileText, Eye, X,
  Medal, Dumbbell, ChevronDown, Loader2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { printWakasekReport, printWakasekPrestasiReport } from '../../utils/printWakasekReport'
import { printStudentReport } from '../../utils/printReport'
import { Download } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────
interface Overview {
  total_siswa: number; total_dinilai: number; rata_rata: number
  tertinggi: number; terendah: number; total_final: number
  total_siswa_berprestasi: number
}
interface PerCabang {
  cabang_id: number; cabang: string; kode: string
  total_siswa: number; total_dinilai: number
  avg_keterampilan: number; avg_prestasi: number
  avg_kehadiran: number; avg_akhir: number
  max_akhir: number; min_akhir: number
}
interface PrestasiSiswa {
  siswa_id: number; nama: string; nis: string; kelas: string
  jenis_kelamin: string; nama_cabang: string
  nama_kejuaraan: string; peringkat: string
  bukti_foto: string; nilai_akhir: number; predikat: string
}
interface PrestasiDist {
  tingkatan: string; jumlah: number; siswa: PrestasiSiswa[]
}
interface KehadiranKelas {
  kelas: string; baik_sekali: number; baik: number
  sedang: number; kurang: number; avg_persen: number
}
interface TopPerformer {
  siswa_id: number; nama: string; nis: string; kelas: string
  jenis_kelamin: string; nama_cabang: string; kode_cabang: string
  nilai_akhir: number; predikat: string; status: string
  nilai_keterampilan: number; nilai_prestasi: number
  nilai_kehadiran: number; prestasi_tingkatan: string
}
interface PredikatDist { predikat: string; jumlah: number }
interface AllSiswa {
  siswa_id: number; nama: string; nisn: string; nis: string; kelas: string; jenis_kelamin: string
  nama_cabang: string; kode_cabang: string; nilai_keterampilan: number; nilai_prestasi: number
  nilai_kehadiran: number; nilai_akhir: number; predikat: string
  status: string; prestasi_tingkatan: string
  persen_hadir: number; nama_guru: string
}
interface DashboardData {
  overview: Overview; per_cabang: PerCabang[]
  prestasi_dist: PrestasiDist[]; kehadiran_kelas: KehadiranKelas[]
  top_performers: TopPerformer[]; predikat_dist: PredikatDist[]
  all_siswa: AllSiswa[]
}

// ── Constants ──────────────────────────────────────────────
const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': '#f9a825', 'B (Baik)': '#22c55e',
  'C (Cukup)': '#3b82f6', 'D (Kurang)': '#f59e0b', 'E (Sangat Kurang)': '#ef4444',
}
const TINGKATAN_COLOR: Record<string, string> = {
  'Internasional':   '#f9a825',
  'Nasional':        '#a855f7',
  'Provinsi':        '#3b82f6',
  'Kabupaten/Kota':  '#22c55e',
  'Pelajar/Sekolah': '#e85d2f',
}
const CHART_COLORS = ['#e85d2f','#f9a825','#22c55e','#3b82f6','#a855f7','#14b8a6','#f43f5e']

// ── Sub-components ─────────────────────────────────────────
const CTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; fill?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e2130', border: '1px solid #2e3348', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#f0f2f8', fontSize: '0.82rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0 0', color: p.fill || '#e85d2f', fontSize: '0.875rem', fontWeight: 700 }}>
          {p.name}: {Number(p.value).toFixed(p.name?.includes('%') ? 1 : 2)}{p.name === 'Siswa' ? '' : ''}
        </p>
      ))}
    </div>
  )
}

// Lightbox untuk preview bukti foto/PDF
function BuktiLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf')
  const fullUrl = `/api/${url}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      {/* Close & actions bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 12, width: '100%', maxWidth: 900,
      }} onClick={e => e.stopPropagation()}>
        <span style={{ color: '#9ba3be', fontSize: '0.82rem', flex: 1 }}>
          📎 {url.split('/').pop()}
        </span>
        <a href={fullUrl} download target="_blank" rel="noopener noreferrer">
          <button style={{
            background: '#2d3352', border: '1px solid #3a4060',
            borderRadius: 8, padding: '6px 14px', color: '#f0f2f8',
            cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
          }}>⬇ Unduh</button>
        </a>
        <button onClick={onClose} style={{
          background: '#ef4444', border: 'none', borderRadius: 8,
          width: 32, height: 32, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>✕</button>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 900, width: '100%', maxHeight: '80vh',
        background: '#1e2130', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #3a4060',
      }} onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe
            src={fullUrl}
            style={{ width: '100%', height: '80vh', border: 'none' }}
            title="Bukti Sertifikat"
          />
        ) : (
          <img
            src={fullUrl}
            alt="Bukti sertifikat"
            style={{
              width: '100%', maxHeight: '80vh',
              objectFit: 'contain', display: 'block',
            }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none'
              const parent = (e.target as HTMLImageElement).parentElement
              if (parent) parent.innerHTML = '<div style="padding:40px;text-align:center;color:#9ba3be">⚠ Gambar tidak dapat dimuat. Coba unduh file.</div>'
            }}
          />
        )}
      </div>
    </div>
  )
}

// Prestasi Drill-down Modal
function PrestasiModal({ tingkatan, siswa, onClose }: {
  tingkatan: string; siswa: PrestasiSiswa[]; onClose: () => void
}) {
  const color = TINGKATAN_COLOR[tingkatan] || '#9ba3be'
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff', border: '1px solid var(--clr-border)',
          borderRadius: 16, maxWidth: 760, width: '100%', maxHeight: '80vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(11,45,107,0.22)',
        }} onClick={e => e.stopPropagation()}>
          {/* Modal Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--clr-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `linear-gradient(90deg, ${color}20, transparent)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Medal size={20} style={{ color }} />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Prestasi Tingkat {tingkatan}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)' }}>{siswa.length} siswa berprestasi — klik 👁 untuk lihat bukti</p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--clr-text-3)',
              cursor: 'pointer', padding: 4, borderRadius: 6,
            }}><X size={18} /></button>
          </div>
          {/* Modal Body */}
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nama Siswa</th><th>Kelas</th><th>Cabang</th>
                  <th>Nama Kejuaraan</th><th>Peringkat</th>
                  <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                  <th style={{ textAlign: 'center' }}>Bukti</th>
                </tr>
              </thead>
              <tbody>
                {siswa.map(s => (
                  <tr key={s.siswa_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: s.jenis_kelamin === 'L'
                            ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                            : 'linear-gradient(135deg,#ec4899,#be185d)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>{s.nama.charAt(0)}</div>
                        <strong style={{ fontSize: '0.875rem' }}>{s.nama}</strong>
                      </div>
                    </td>
                    <td><span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{s.kelas}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{s.nama_cabang}</td>
                    <td style={{ fontSize: '0.82rem' }}>{s.nama_kejuaraan || '–'}</td>
                    <td>
                      <span style={{
                        background: `${color}20`, color, padding: '2px 8px',
                        borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      }}>{s.peringkat || '–'}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: PREDIKAT_COLOR[s.predikat] }}>
                      {Number(s.nilai_akhir).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {s.bukti_foto ? (
                        <button
                          title="Lihat bukti sertifikat"
                          onClick={() => setPreviewUrl(s.bukti_foto)}
                          style={{
                            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                            border: 'none', borderRadius: 8, padding: '5px 10px',
                            cursor: 'pointer', color: '#fff',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.78rem', fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                          }}>
                          <Eye size={13} /> Lihat
                        </button>
                      ) : (
                        <span style={{
                          color: 'var(--clr-text-4)', fontSize: '0.75rem',
                          background: 'var(--clr-bg-3)', padding: '3px 8px',
                          borderRadius: 6, display: 'inline-block',
                        }}>Tidak ada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {previewUrl && (
        <BuktiLightbox url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function WakasekRekapPage() {
  const { user } = useAuth()
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTA,      setSelectedTA]      = useState<number>(0)
  const [dash,            setDash]            = useState<DashboardData | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [printing,        setPrinting]        = useState(false)
  const [drillDown,       setDrillDown]       = useState<PrestasiDist | null>(null)
  const [activeChart,     setActiveChart]     = useState<'akhir' | 'keterampilan' | 'prestasi' | 'kehadiran'>('akhir')
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rekap'>('dashboard')
  const [prestasiData, setPrestasiData] = useState<any[]>([])
  const [loadingPrestasi, setLoadingPrestasi] = useState(false)
  const [previewUrl,      setPreviewUrl]      = useState<string | null>(null)
  
  const [filterCabang, setFilterCabang] = useState<string>('')
  const [filterSeluruhCabor, setFilterSeluruhCabor] = useState<string>('')
  const [filterSeluruhKelas, setFilterSeluruhKelas] = useState<string>('')
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [filterBulan,  setFilterBulan]  = useState<number | ''>('')
  const [filterJuara,  setFilterJuara]  = useState<string>('')
  const [leaderboardPage, setLeaderboardPage] = useState(1)

  const BULAN_NAMES = ['', 'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

  const filteredPrestasiData = prestasiData.filter(p => {
    let match = true
    if (filterCabang && p.nama_cabang !== filterCabang) match = false
    if (filterBulan && String(p.bulan) !== String(filterBulan)) match = false
    if (filterJuara) {
      if (filterJuara === '1' && !p.peringkat?.toLowerCase().includes('1') && !p.peringkat?.toLowerCase().includes('emas')) match = false
      if (filterJuara === '2' && !p.peringkat?.toLowerCase().includes('2') && !p.peringkat?.toLowerCase().includes('perak')) match = false
      if (filterJuara === '3' && !p.peringkat?.toLowerCase().includes('3') && !p.peringkat?.toLowerCase().includes('perunggu')) match = false
    }
    return match
  })

  // Custom fetch function for Prestasi list
  const loadPrestasi = useCallback(async () => {
    if (!selectedTA) return
    setLoadingPrestasi(true)
    try {
      const res = await api.get<ApiResponse<{ prestasi: any[] }>>(`/penilaian/prestasi_list.php?tahun_ajaran_id=${selectedTA}`)
      setPrestasiData(res.data?.prestasi || [])
    } catch {} finally { setLoadingPrestasi(false) }
  }, [selectedTA])

  useEffect(() => {
    loadPrestasi()
  }, [loadPrestasi])

  useEffect(() => {
    setLeaderboardPage(1)
  }, [dash])

  useEffect(() => {
    api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php')
      .then(r => {
        const list = r.data ?? []
        setTahunAjaranList(list)
        const aktif = list.find(t => t.status === 'aktif')
        if (aktif) setSelectedTA(aktif.id)
        else if (list.length) setSelectedTA(list[0].id)
      }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!selectedTA) return
    setLoading(true)
    try {
      const r = await api.get<ApiResponse<DashboardData>>(
        `/wakasek/dashboard.php?tahun_ajaran_id=${selectedTA}`
      )
      setDash(r.data ?? null)
    } catch { } finally { setLoading(false) }
  }, [selectedTA])

  useEffect(() => { load() }, [load])

  const handlePrint = async () => {
    if (!dash) return
    setPrinting(true)
    const ta = tahunAjaranList.find(t => t.id === selectedTA)
    const taNama = ta ? `${ta.nama} – Semester ${ta.semester}` : String(selectedTA)
    try {
      printWakasekReport({
        tahunAjaran: taNama,
        overview: {
          total_siswa:   Number(dash.overview.total_siswa),
          total_dinilai: Number(dash.overview.total_dinilai),
          rata_rata:     Number(dash.overview.rata_rata),
          tertinggi:     Number(dash.overview.tertinggi),
          terendah:      Number(dash.overview.terendah),
        },
        allSiswa: dash.all_siswa,
        wakasekNama: user?.nama ?? 'Pendamping Cabor',
      })
    } finally {
      setTimeout(() => setPrinting(false), 1000)
    }
  }

  // ── Chart data prep ────────────────────────────────────
  const barDataKey = activeChart === 'akhir' ? 'avg_akhir'
    : activeChart === 'keterampilan' ? 'avg_keterampilan'
    : activeChart === 'prestasi' ? 'avg_prestasi' : 'avg_kehadiran'

  const barChartData = (dash?.per_cabang ?? []).map(c => ({
    name: c.cabang.length > 12 ? c.cabang.slice(0, 12) + '…' : c.cabang,
    value: Number(c[barDataKey as keyof PerCabang] ?? 0),
    total: c.total_dinilai,
    fullName: c.cabang,
  }))

  // Tren rata-rata nilai per kelas
  const trendKelasData = (() => {
    const map: Record<string, { akhir: number[]; keterampilan: number[]; prestasi: number[]; kehadiran: number[] }> = {}
    for (const s of (dash?.all_siswa ?? [])) {
      if (!map[s.kelas]) map[s.kelas] = { akhir: [], keterampilan: [], prestasi: [], kehadiran: [] }
      map[s.kelas].akhir.push(Number(s.nilai_akhir))
      map[s.kelas].keterampilan.push(Number(s.nilai_keterampilan))
      map[s.kelas].prestasi.push(Number(s.nilai_prestasi))
      map[s.kelas].kehadiran.push(Number(s.nilai_kehadiran))
    }
    const avg = (arr: number[]) => arr.length
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kelas, v]) => ({
        kelas,
        'Nilai Akhir':  avg(v.akhir),
        'Keterampilan': avg(v.keterampilan),
        'Prestasi':     avg(v.prestasi),
        'Kehadiran':    avg(v.kehadiran),
      }))
  })()

  const donutData = (dash?.prestasi_dist ?? []).map(p => ({
    name: p.tingkatan, value: p.jumlah,
  }))


  const pct = dash ? Math.round((Number(dash.overview.total_dinilai) / Math.max(Number(dash.overview.total_siswa), 1)) * 100) : 0

  // Rank medals
  const medals = ['🥇', '🥈', '🥉']

  return (
    <Layout title="Dashboard Pendamping Cabor">
      {/* ── Page Header ──────────────────────────────── */}
      <div style={{
        borderRadius: 'var(--r-xl)',
        marginBottom: 'var(--sp-6)',
        position: 'relative', overflow: 'hidden',
        minHeight: 160,
        boxShadow: '0 8px 32px rgba(11,45,107,0.22)',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/dashboard-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />

        {/* Overlays untuk keterbacaan teks (lebih transparan agar gambar terlihat) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(11,45,107,0.82) 0%, rgba(11,45,107,0.60) 55%, rgba(11,45,107,0.30) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(11,45,107,0.3) 100%)',
        }} />

        {/* Red accent bar kiri */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 5,
          background: 'linear-gradient(180deg, #c1272d, #e85d2f)',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: 'var(--sp-6) var(--sp-6) var(--sp-6) calc(var(--sp-6) + 8px)',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-4)',
        }}>
          {/* Left: branding + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            {/* School logo */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
              border: '2.5px solid rgba(255,255,255,0.4)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              flexShrink: 0,
            }}>
              <img src="/logo-smanko.jpg" alt="Logo SMANKO"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              {/* Micro label */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(193,39,45,0.25)',
                border: '1px solid rgba(193,39,45,0.4)',
                borderRadius: 'var(--r-full)',
                padding: '2px 10px', marginBottom: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Live Dashboard
                </span>
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, margin: '0 0 4px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                🎯 Dashboard Eksekutif
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem', margin: 0 }}>
                Helicopter View – Pendamping Cabor SMANKO Sulawesi Selatan
              </p>
            </div>
          </div>

          {/* Right: filter & actions */}
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedTA}
              onChange={e => setSelectedTA(Number(e.target.value))}
              style={{
                minWidth: 220, padding: '9px 36px 9px 14px',
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 'var(--r-md)', color: '#fff',
                fontSize: '0.875rem', outline: 'none',
                appearance: 'none', cursor: 'pointer',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%23ffffff' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                backdropFilter: 'blur(8px)',
              }}>
              {tahunAjaranList.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#0b2d6b', color: '#fff' }}>
                  {t.nama} – Sem {t.semester} {t.status === 'aktif' ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <button
              disabled={printing || !dash}
              onClick={handlePrint}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 18px',
                background: printing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#1155a8,#1e6ec8)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 'var(--r-md)', color: '#fff',
                fontWeight: 700, fontSize: '0.875rem', cursor: printing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(17,85,168,0.4)',
                backdropFilter: 'blur(8px)',
                opacity: printing || !dash ? 0.6 : 1,
              }}>
              {printing
                ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Menyiapkan...</>
                : <><FileText size={16} /> Export PDF Lengkap</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--sp-5)', borderBottom: '1px solid var(--clr-border)', paddingBottom: 0 }}>
        {[
          { key: 'dashboard', label: 'Dashboard Eksekutif', icon: <TrendingUp size={15} /> },
          { key: 'rekap',     label: 'Rekap Seluruh Siswa', icon: <Users size={15} /> },
        ].map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key as 'dashboard' | 'rekap')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: '0.875rem', fontWeight: 600,
              color: activeTab === tab.key ? 'var(--clr-accent)' : 'var(--clr-text-3)',
              borderBottom: activeTab === tab.key ? '2px solid var(--clr-accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.18s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 100 }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : !dash ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>Gagal memuat data dashboard.</div>
      ) : activeTab === 'dashboard' ? (
        <>
          {/* ── 1. Overview Cards ── */}
          <div className="stat-grid" style={{ marginBottom: 'var(--sp-6)' }}>
            {[
              {
                icon: <Users size={22} />, cls: 'primary',
                label: 'Total Siswa Aktif', value: dash.overview.total_siswa,
                sub: `${dash.overview.total_dinilai} sudah dinilai (${pct}%)`,
              },
              {
                icon: <TrendingUp size={22} />, cls: 'success',
                label: 'Rata-rata Keseluruhan', value: Number(dash.overview.rata_rata).toFixed(2),
                sub: `Tertinggi: ${Number(dash.overview.tertinggi).toFixed(2)}`,
              },
              {
                icon: <Trophy size={22} />, cls: 'accent',
                label: 'Siswa Berprestasi', value: dash.overview.total_siswa_berprestasi || 0,
                sub: `${dash.prestasi_dist.length} tingkatan kejuaraan`,
              },
              {
                icon: <Award size={22} />, cls: 'warning',
                label: 'Penilaian Final', value: dash.overview.total_final,
                sub: `dari ${dash.overview.total_dinilai} penilaian`,
              },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className={`stat-icon ${c.cls}`}>{c.icon}</div>
                <div className="stat-body">
                  <div className="stat-label">{c.label}</div>
                  <div className="stat-value">{c.value}</div>
                  <div className="stat-sub">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── CHARTS ROW 1: Bar + Donut ── */}
          <div className="grid-responsive" style={{ marginBottom: 'var(--sp-5)' }}>

            {/* Bar Chart — Nilai per Cabor */}
            <div className="card">
              <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dumbbell size={16} style={{ color: 'var(--clr-primary-2)' }} />
                    Komparasi Nilai Per Cabor
                  </h3>
                </div>
                {/* Chart type switcher */}
                <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {(['akhir', 'keterampilan', 'prestasi', 'kehadiran'] as const).map(k => (
                    <button key={k}
                      className={`btn btn-sm ${activeChart === k ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveChart(k)}
                      style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
                      {k === 'akhir' ? 'Nilai Akhir' : k === 'keterampilan' ? 'Keterampilan' : k === 'prestasi' ? 'Prestasi' : 'Kehadiran'}
                    </button>
                  ))}
                </div>
              </div>
              {barChartData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-4)' }}>Belum ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barChartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                    <XAxis dataKey="name" tick={{ fill: '#9ba3be', fontSize: 10 }}
                      angle={-20} textAnchor="end" interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#9ba3be', fontSize: 11 }} />
                    <Tooltip content={<CTooltip />} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]} name="Nilai">
                      {barChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut Chart — Distribusi Prestasi */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Medal size={16} style={{ color: 'var(--clr-accent)' }} />
                  Distribusi Prestasi Kejuaraan
                </h3>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Klik irisan → detail siswa
                </span>
              </div>
              {donutData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-4)' }}>
                  Belum ada data prestasi
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={95}
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={3}
                        onClick={(_, idx) => setDrillDown(dash.prestasi_dist[idx])}
                        style={{ cursor: 'pointer' }}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i}
                            fill={TINGKATAN_COLOR[entry.name] || CHART_COLORS[i]}
                            stroke={TINGKATAN_COLOR[entry.name] || CHART_COLORS[i]}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e2130', border: '1px solid #2e3348', borderRadius: 8 }}
                        labelStyle={{ color: '#f0f2f8' }}
                        formatter={(val: number, name: string) => [`${val} siswa`, name]}
                      />
                      <Legend
                        formatter={val => (
                          <span style={{ color: '#9ba3be', fontSize: '0.78rem' }}>{val}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Clickable legend + count */}
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--sp-2)' }}>
                    {dash.prestasi_dist.map(p => (
                      <button key={p.tingkatan}
                        onClick={() => setDrillDown(p)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 'var(--r-full)',
                          border: `1px solid ${TINGKATAN_COLOR[p.tingkatan] || '#9ba3be'}40`,
                          background: `${TINGKATAN_COLOR[p.tingkatan] || '#9ba3be'}15`,
                          color: TINGKATAN_COLOR[p.tingkatan] || '#9ba3be',
                          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TINGKATAN_COLOR[p.tingkatan] || '#9ba3be', flexShrink: 0 }} />
                        {p.tingkatan}: {p.jumlah}
                        <ChevronDown size={11} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

                    {/* ── ROW 3: Leaderboard + Predikat Distribution ── */}
          <div className="grid-responsive" style={{ marginBottom: 'var(--sp-5)' }}>

            {/* Leaderboard */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: 'var(--sp-4) var(--sp-5)',
                borderBottom: '1px solid var(--clr-border)',
                background: 'linear-gradient(90deg, #f9a82510, transparent)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Trophy size={18} style={{ color: '#f9a825' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>🏆 Leaderboard Bintang Sekolah</h3>
                <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Top 10</span>
              </div>
              {dash.top_performers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-4)' }}>Belum ada data</div>
              ) : (
                <div>
                  {(() => {
                    const ITEMS_PER_PAGE = 3
                    const totalLbp = Math.ceil(dash.top_performers.length / ITEMS_PER_PAGE)
                    const displayedPerformers = dash.top_performers.slice((leaderboardPage - 1) * ITEMS_PER_PAGE, leaderboardPage * ITEMS_PER_PAGE)

                    return (
                      <>
                        {displayedPerformers.map((p, idx) => {
                          const i = (leaderboardPage - 1) * ITEMS_PER_PAGE + idx
                          
                          return (
                            <div key={p.siswa_id} style={{
                              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                              padding: 'var(--sp-3) var(--sp-4)',
                              borderBottom: '1px solid var(--clr-border)',
                              background: i === 0 ? 'rgba(249,168,37,0.06)' : i === 1 ? 'rgba(156,163,175,0.04)' : i === 2 ? 'rgba(180,83,9,0.04)' : 'transparent',
                              transition: 'background 0.2s',
                            }}>
                              {/* Rank */}
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: i < 3
                                  ? `linear-gradient(135deg, ${['#f9a825','#9ca3af','#b45309'][i]}, ${['#d97706','#6b7280','#92400e'][i]})`
                                  : 'var(--clr-bg-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: i < 3 ? '1rem' : '0.78rem',
                                color: i < 3 ? '#fff' : 'var(--clr-text-3)', flexShrink: 0,
                              }}>
                                {i < 3 ? medals[i] : i + 1}
                              </div>

                              {/* Avatar */}
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: p.jenis_kelamin === 'L'
                                  ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                                  : 'linear-gradient(135deg,#ec4899,#be185d)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.78rem', color: '#fff', flexShrink: 0,
                              }}>{p.nama.charAt(0)}</div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.nama}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>
                                  {p.kelas} · {p.nama_cabang}
                                  {p.prestasi_tingkatan !== '-' && (
                                    <span style={{ marginLeft: 6, color: TINGKATAN_COLOR[p.prestasi_tingkatan] || 'var(--clr-text-3)' }}>
                                      · {p.prestasi_tingkatan}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Score */}
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                  fontSize: '1.1rem', fontWeight: 800,
                                  color: PREDIKAT_COLOR[p.predikat] || 'var(--clr-text)',
                                }}>{Number(p.nilai_akhir).toFixed(2)}</div>
                                <div style={{
                                  fontSize: '0.68rem', fontWeight: 700,
                                  color: PREDIKAT_COLOR[p.predikat] || 'var(--clr-text-4)',
                                }}>{p.predikat}</div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {totalLbp > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--clr-bg-2)' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              disabled={leaderboardPage === 1}
                              onClick={() => setLeaderboardPage(prev => prev - 1)}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', height: 26 }}
                            >
                              Sebelumnya
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-3)' }}>
                              Hal {leaderboardPage} dari {totalLbp}
                            </span>
                            <button 
                              className="btn btn-secondary btn-sm"
                              disabled={leaderboardPage === totalLbp}
                              onClick={() => setLeaderboardPage(prev => prev + 1)}
                              style={{ padding: '4px 10px', fontSize: '0.75rem', height: 26 }}
                            >
                              Selanjutnya
                            </button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Predikat Distribution */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={16} style={{ color: 'var(--clr-warning)' }} />
                  Distribusi Predikat
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {dash.predikat_dist.map(d => {
                  const total = dash.overview.total_dinilai || 1
                  const pctVal = Math.round((Number(d.jumlah) / total) * 100)
                  const color = PREDIKAT_COLOR[d.predikat] || '#9ba3be'
                  return (
                    <div key={d.predikat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color }}>{d.predikat}</span>
                        <span style={{ color: 'var(--clr-text-3)' }}>{d.jumlah} siswa ({pctVal}%)</span>
                      </div>
                      <div style={{ background: 'var(--clr-bg-3)', borderRadius: 'var(--r-full)', height: 8 }}>
                        <div style={{
                          height: '100%', borderRadius: 'var(--r-full)',
                          background: color, width: `${pctVal}%`,
                          transition: 'width 0.6s ease', boxShadow: `0 0 8px ${color}60`,
                        }} />
                      </div>
                    </div>
                  )
                })}
                {dash.predikat_dist.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--clr-text-4)' }}>Belum ada data</div>
                )}
              </div>
            </div>
          </div>

          {/* ── FILTER PRESTASI ── */}
          <div style={{
            background: '#fff', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4) var(--sp-5)', marginBottom: 'var(--sp-4)',
            border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
            display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                CABANG OLAHRAGA
              </label>
              <select className="form-control" style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} value={filterCabang} onChange={e => setFilterCabang(e.target.value)}>
                <option value="">Semua Cabor</option>
                {Array.from(new Set(prestasiData.map(p => p.nama_cabang))).map((c: any) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                BULAN
              </label>
              <select className="form-control" style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} value={filterBulan} onChange={e => setFilterBulan(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Semua Bulan</option>
                {BULAN_NAMES.map((b, i) => i > 0 && <option key={i} value={i}>{b}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                PREDIKAT JUARA
              </label>
              <select className="form-control" style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} value={filterJuara} onChange={e => setFilterJuara(e.target.value)}>
                <option value="">Semua Juara</option>
                <option value="1">Juara 1 / Emas</option>
                <option value="2">Juara 2 / Perak</option>
                <option value="3">Juara 3 / Perunggu</option>
              </select>
            </div>
          </div>

          {/* ── NEW ROW: Daftar Prestasi Siswa ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--sp-5)' }}>
            <div className="card-header" style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Medal size={18} style={{ color: 'var(--clr-accent)' }} />
                <h3 className="card-title">Daftar Capaian Prestasi Olahraga Siswa</h3>
                <span className="badge badge-neutral">{filteredPrestasiData.length} Data Prestasi</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => printWakasekPrestasiReport({ tahunAjaran: tahunAjaranList.find(t => t.id === selectedTA)?.nama || '', prestasi: filteredPrestasiData, wakasekNama: user?.nama || 'Pendamping Cabor' })}
              >
                <FileText size={14} /> Export PDF
              </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              {loadingPrestasi ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--clr-text-4)' }}>Memuat data prestasi...</div>
              ) : filteredPrestasiData.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--clr-text-4)' }}>Belum ada data prestasi sesuai filter</div>
              ) : (
                <table style={{ width: '100%', minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Siswa</th>
                      <th>Kelas</th>
                      <th>Cabang</th>
                      <th style={{ padding: 0, verticalAlign: 'middle', borderBottom: '1px solid var(--clr-border)' }}>
                        <div style={{ 
                          display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 0.5fr 1.2fr', 
                          gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)',
                          fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', borderBottom: 'none', letterSpacing: '0.5px'
                        }}>
                          <div>NAMA KEJUARAAN</div>
                          <div style={{ textAlign: 'center' }}>BULAN</div>
                          <div style={{ textAlign: 'center' }}>TINGKATAN</div>
                          <div style={{ textAlign: 'center' }}>JUARA</div>
                          <div style={{ textAlign: 'center' }}>NILAI</div>
                          <div style={{ textAlign: 'center' }}>DINILAI OLEH</div>
                        </div>
                      </th>
                      <th style={{ textAlign: 'center', width: 80 }}>Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groups: any[] = []
                      filteredPrestasiData.forEach(p => {
                        const existing = groups.find(g => g.siswa_id === p.siswa_id)
                        if (existing) {
                          existing.achievements.push(p)
                        } else {
                          groups.push({ ...p, achievements: [p] })
                        }
                      })

                      return groups.map((student, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--clr-border-2)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)', verticalAlign: 'top' }}>
                          <td style={{ padding: '16px 16px', color: 'var(--clr-text-3)' }}>{i + 1}</td>
                          <td style={{ padding: '16px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>{student.nama_siswa}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{student.nis}</div>
                          </td>
                          <td style={{ padding: '16px 16px' }}><span className="badge badge-info">{student.kelas}</span></td>
                          <td style={{ padding: '16px 16px', fontWeight: 600 }}>{student.nama_cabang}</td>
                          
                          <td style={{ padding: 0 }}>
                            {student.achievements.map((ach: any, idx: number) => {
                              const TINGKATAN_COLOR: Record<string,string> = {
                                'Internasional':   '#f9a825',
                                'Nasional':        '#a855f7',
                                'Provinsi':        '#3b82f6',
                                'Kabupaten/Kota':  '#22c55e',
                                'Pelajar/Sekolah': '#e85d2f',
                              }
                              const color = TINGKATAN_COLOR[ach.tingkatan] || '#9ba3be'
                              const BULAN_NAMES = ['', 'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
                              const bulanStr = ach.bulan ? BULAN_NAMES[ach.bulan] : (BULAN_NAMES[new Date(ach.tanggal_input).getMonth() + 1] || '–')
                              
                              return (
                                <div key={idx} style={{ 
                                  padding: '12px 16px',
                                  borderBottom: idx === student.achievements.length - 1 ? 'none' : '1px solid var(--clr-border-2)',
                                  display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 0.5fr 1.2fr', 
                                  gap: 'var(--sp-3)', alignItems: 'center',
                                  background: idx % 2 === 0 ? 'transparent' : 'var(--clr-bg-2)20'
                                }}>
                                  <div style={{ fontWeight: 600, color: 'var(--clr-text-2)' }}>{ach.nama_kejuaraan || '–'}</div>
                                  <div style={{ textAlign: 'center', color: 'var(--clr-text-3)' }}>{bulanStr}</div>
                                  <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color, padding: '2px 8px', borderRadius: '4px', background: color + '15', border: '1px solid ' + color + '30' }}>
                                      {ach.tingkatan}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{ach.peringkat}</div>
                                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#f9a825' }}>{Number(ach.nilai_prestasi).toFixed(0)}</div>
                                  <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>{ach.nama_guru}</div>
                                </div>
                              )
                            })}
                          </td>

                          <td style={{ padding: '16px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                              {student.achievements.map((ach: any, idx: number) => (
                                ach.bukti_foto ? (
                                  <button key={idx} onClick={() => setPreviewUrl(ach.bukti_foto)} title="Lihat Bukti" style={{ background: 'var(--clr-bg-3)', border: '1px solid var(--clr-border)', borderRadius: '50%', width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--clr-text-3)' }}>
                                    <Eye size={14} />
                                  </button>
                                ) : <div key={idx} style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Full Data Table ── */}
        {(() => {
          const filteredAllSiswa = (dash.all_siswa || []).filter(s => {
            const matchCabor = filterSeluruhCabor ? s.nama_cabang === filterSeluruhCabor : true
            const matchKelas = filterSeluruhKelas ? s.kelas === filterSeluruhKelas : true
            return matchCabor && matchKelas
          })
          const activeTaObj = tahunAjaranList.find(t => t.id === selectedTA)
          const semesterStr = activeTaObj ? `${activeTaObj.nama} – Sem ${activeTaObj.semester}` : 'Sistem Aktif'

          return (
          <div className="card" style={{ padding: 0 }}>
            <div style={{
              padding: 'var(--sp-5) var(--sp-5)',
              borderBottom: '1px solid var(--clr-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Rekap Seluruh Siswa ({filteredAllSiswa.length} data)
                </h3>
              </div>
              
              {/* Filter Bar */}
              <div style={{
                paddingTop: 'var(--sp-2)', paddingBottom: 'var(--sp-4)',
                display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap'
              }}>
                {/* Semester (Readonly) */}
                <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                    SEMESTER AKTIF
                  </label>
                  <div style={{ 
                    width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155'
                  }}>
                    {semesterStr}
                  </div>
                </div>

                {/* Filter Cabang Olahraga */}
                <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                    CABANG OLAHRAGA
                  </label>
                  <select className="form-control" style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} value={filterSeluruhCabor} onChange={e => setFilterSeluruhCabor(e.target.value)}>
                    <option value="">Semua Cabor</option>
                    {Array.from(new Set((dash.all_siswa || []).map(s => s.nama_cabang))).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Kelas */}
                <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#162b60', marginBottom: 8, letterSpacing: '0.5px' }}>
                    KELAS
                  </label>
                  <select className="form-control" style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} value={filterSeluruhKelas} onChange={e => setFilterSeluruhKelas(e.target.value)}>
                    <option value="">Semua Kelas</option>
                    {Array.from(new Set((dash.all_siswa || []).map(s => s.kelas))).sort().map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>No</th><th>NIS</th><th>Nama Siswa</th>
                    <th>Kelas</th><th>Cabang</th>
                    <th>Keterampilan</th><th>Prestasi</th><th>Kehadiran</th>
                    <th>Nilai Akhir</th><th>Predikat</th><th>Status</th>
                    <th style={{ textAlign: 'center' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllSiswa.length === 0 ? (
                    <tr><td colSpan={12} className="table-empty">Belum ada data penilaian.</td></tr>
                  ) : filteredAllSiswa.map((s, i) => (
                    <tr key={s.siswa_id || i}>
                      <td style={{ color: 'var(--clr-text-3)', width: 40 }}>{i + 1}</td>
                      <td><code style={{ fontSize: '0.78rem' }}>{s.nis}</code></td>
                      <td><strong>{s.nama}</strong></td>
                      <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{s.kelas}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>{s.nama_cabang}</td>
                      <td style={{ fontWeight: 600 }}>{Number(s.nilai_keterampilan).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>{Number(s.nilai_prestasi).toFixed(2)}</td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          <strong>{Number(s.nilai_kehadiran).toFixed(2)}</strong>
                          <div style={{ color: 'var(--clr-text-3)', fontSize: '0.72rem' }}>{s.persen_hadir}% hadir</div>
                        </div>
                      </td>
                      <td>
                        <strong style={{
                          fontSize: '1rem',
                          color: PREDIKAT_COLOR[s.predikat] || 'var(--clr-text)',
                        }}>{Number(s.nilai_akhir).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span style={{
                          background: `${PREDIKAT_COLOR[s.predikat] || '#9ba3be'}20`,
                          color: PREDIKAT_COLOR[s.predikat] || '#9ba3be',
                          padding: '2px 8px', borderRadius: 'var(--r-sm)',
                          fontSize: '0.7rem', fontWeight: 700,
                        }}>{s.predikat}</span>
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'final' ? 'badge-success' : 'badge-warning'}`}>
                          {s.status === 'final' ? '✓ Final' : '📝 Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm"
                          title="Cetak Raport PDF"
                          disabled={printingId === s.siswa_id}
                          onClick={async () => {
                            setPrintingId(s.siswa_id)
                            try {
                              const [pRes, taRes, bobotRes] = await Promise.all([
                                api.get<ApiResponse<any>>(`/penilaian/input.php?siswa_id=${s.siswa_id}&tahun_ajaran_id=${selectedTA}`),
                                api.get<ApiResponse<any[]>>('/master/tahun_ajaran.php'),
                                api.get<ApiResponse<any>>('/settings/bobot.php').catch(() => ({ data: null })),
                              ])
                              const penilaian = pRes.data
                              if (!penilaian) return
                              const ta = (taRes.data ?? []).find((t: any) => t.id === selectedTA)
                              // Bobot dari setting admin
                              const bData = (bobotRes as any)?.data
                              const bobot = bData ? {
                                keterampilan: parseFloat(bData.bobot_keterampilan) || 50,
                                prestasi:     parseFloat(bData.bobot_prestasi)     || 30,
                                kehadiran:    parseFloat(bData.bobot_kehadiran)    || 20,
                              } : undefined
                              printStudentReport({
                                siswa: {
                                  nama: s.nama, nisn: s.nisn, nis: s.nis, kelas: s.kelas,
                                  jenis_kelamin: s.jenis_kelamin,
                                  nama_cabang: s.nama_cabang, kode_cabang: s.kode_cabang,
                                },
                                penilaian,
                                tahunAjaran: ta ? `${ta.nama} – Semester ${ta.semester}` : String(selectedTA),
                                guruNama: penilaian.nama_pelatih || 'Belum Ditugaskan',
                                bobot,
                              })
                            } catch { alert('Gagal memuat data raport.') }
                            finally { setPrintingId(null) }
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                            borderRadius: 'var(--r-sm)'
                          }}
                        >
                          {printingId === s.siswa_id
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <><FileText size={14} /> PDF</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        })()}
        </>
      )}

      {/* ── Drill-down Modal ── */}
      {drillDown && (
        <PrestasiModal
          tingkatan={drillDown.tingkatan}
          siswa={drillDown.siswa}
          onClose={() => setDrillDown(null)}
        />
      )}

      {/* Lightbox for Prestasi */}
      {previewUrl && (
        <BuktiLightbox url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </Layout>
  )
}
