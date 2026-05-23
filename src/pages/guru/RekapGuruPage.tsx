import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import type { TahunAjaran, ApiResponse } from '../../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Trophy, TrendingUp, Users, Award, FileText, Loader2, Medal } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────
interface RekapRow {
  penilaian_id: number; siswa_id: number; nis: string; nama_siswa: string
  kelas: string; nama_cabang: string; kode_cabang: string
  nilai_keterampilan: number; nilai_prestasi: number; nilai_kehadiran: number;
  nilai_akhir: number; predikat: string; status: string
  persentase_hadir: number; nama_guru: string; status_siswa?: string
}

interface Statistik {
  total: number; sudah_dinilai: number; rata_rata: number
  tertinggi: number; terendah: number
  predikat: Record<string, number>
  per_cabang: Array<{ cabang: string; kode: string; jumlah: number; rata_rata: number; tertinggi: number; terendah: number }>
}

interface RekapResponse { data: RekapRow[]; statistik: Statistik | null }

interface PrestasiRow {
  prestasi_id: number
  nama_kejuaraan: string; tingkatan: string; peringkat: string
  nilai_prestasi: number; bukti_foto?: string; tanggal_input: string
  siswa_id: number; nis: string; nama_siswa: string
  kelas: string; jenis_kelamin: string
  nama_cabang: string; kode_cabang: string; nama_guru: string
  tahun_ajaran: string; semester: string
}

interface CaborOption { id: number; nama: string; kode: string }

// ── Constants ─────────────────────────────────────────────────
const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': '#f9a825', 'B (Baik)': '#22c55e',
  'C (Cukup)': '#3b82f6',   'D (Kurang)': '#f59e0b', 'E (Sangat Kurang)': '#ef4444',
}
const CHART_COLORS = ['#e85d2f','#f9a825','#22c55e','#3b82f6','#a855f7','#14b8a6']

const TINGKATAN_COLOR: Record<string, string> = {
  'Internasional': '#a855f7', 'Nasional': '#e85d2f',
  'Provinsi': '#f9a825',      'Kota/Kabupaten': '#3b82f6',
  'Kecamatan': '#22c55e',     'Pelajar/Sekolah': '#14b8a6',
}

const BULAN_NAMES = [
  '', 'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

// ── Custom Chart Tooltip ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {value:number}[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1e2130', border: '1px solid #2e3348', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#f0f2f8', fontSize: '0.875rem' }}>{label}</p>
        <p style={{ margin: '4px 0 0', color: '#e85d2f', fontSize: '1rem', fontWeight: 700 }}>
          {Number(payload[0]?.value).toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

// ── Page Component ────────────────────────────────────────────
export default function RekapGuruPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'rekap' | 'prestasi'>('rekap')

  // Rekap tab state
  const [tahunAjarans, setTahunAjarans] = useState<TahunAjaran[]>([])
  const [selectedTA,   setSelectedTA]   = useState<number>(0)
  const [data,         setData]         = useState<RekapRow[]>([])
  const [statistik,    setStatistik]    = useState<Statistik | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [kelasFilter,  setKelasFilter]  = useState('')
  const [caborFilter,  setCaborFilter]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Prestasi tab state
  const [prestasiData,      setPrestasiData]      = useState<PrestasiRow[]>([])
  const [caborOptions,      setCaborOptions]      = useState<CaborOption[]>([])
  const [peringkatOptions,  setPeringkatOptions]  = useState<string[]>([])
  const [loadingPrestasi,   setLoadingPrestasi]   = useState(false)
  const [pCaborFilter,      setPCaborFilter]      = useState('')
  const [pBulanFilter,      setPBulanFilter]      = useState('')
  const [pJuaraFilter,      setPJuaraFilter]      = useState('')
  const [pSearch,           setPSearch]           = useState('')

  // Riwayat modal state
  const [riwayatOpen, setRiwayatOpen] = useState(false)
  const [riwayatData, setRiwayatData] = useState<any>(null)
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  // Load tahun ajaran list
  useEffect(() => {
    api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php')
      .then(r => {
        const list = r.data ?? []
        setTahunAjarans(list)
        const aktif = list.find(t => t.status === 'aktif')
        if (aktif) setSelectedTA(aktif.id)
        else if (list.length) setSelectedTA(list[0].id)
      }).catch(() => {})
  }, [])

  // Load rekap data
  const loadRekap = useCallback(async () => {
    if (!selectedTA) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tahun_ajaran_id', String(selectedTA))
      if (kelasFilter)  params.set('kelas',  kelasFilter)
      if (caborFilter)  params.set('cabang_olahraga_id', caborFilter)
      if (statusFilter) params.set('status', statusFilter)
      const r = await api.get<ApiResponse<RekapResponse>>(`/penilaian/rekap.php?${params}`)
      setData(r.data?.data ?? [])
      setStatistik(r.data?.statistik ?? null)
    } catch { } finally { setLoading(false) }
  }, [selectedTA, kelasFilter, caborFilter, statusFilter])

  useEffect(() => { loadRekap() }, [loadRekap])

  // Reset filters when semester changes
  useEffect(() => {
    setKelasFilter('')
    setCaborFilter('')
    setStatusFilter('')
  }, [selectedTA])

  // Load prestasi data
  const loadPrestasi = useCallback(async () => {
    if (!selectedTA) return
    setLoadingPrestasi(true)
    try {
      const params = new URLSearchParams()
      params.set('tahun_ajaran_id', String(selectedTA))
      if (pCaborFilter) params.set('cabang_olahraga_id', pCaborFilter)
      if (pBulanFilter) params.set('bulan', pBulanFilter)
      if (pJuaraFilter) params.set('peringkat', pJuaraFilter)

      const r = await api.get<ApiResponse<{
        prestasi: PrestasiRow[]; cabor: CaborOption[]; peringkat: string[]
      }>>(`/penilaian/prestasi_list.php?${params}`)

      setPrestasiData(r.data?.prestasi ?? [])
      if (r.data?.cabor?.length) setCaborOptions(r.data.cabor)
      if (r.data?.peringkat?.length) setPeringkatOptions(r.data.peringkat)
    } catch { } finally { setLoadingPrestasi(false) }
  }, [selectedTA, pCaborFilter, pBulanFilter, pJuaraFilter])

  useEffect(() => {
    if (activeTab === 'prestasi') loadPrestasi()
  }, [activeTab, loadPrestasi])

  // Derived
  const uniqueKelas  = [...new Set(data.map(r => r.kelas))].sort()
  const uniqueCabang = [...new Set(data.map(r => r.nama_cabang))].sort()
  const predikatPieData = statistik
    ? Object.entries(statistik.predikat).map(([name, value]) => ({ name, value }))
    : []
  const barData = statistik?.per_cabang.map(c => ({ name: c.cabang, 'Rata-rata': c.rata_rata })) ?? []

  // Filter prestasi by search
  const filteredPrestasi = prestasiData.filter(p => {
    if (!pSearch) return true
    const q = pSearch.toLowerCase()
    return (
      p.nama_siswa.toLowerCase().includes(q) ||
      p.nis.includes(q) ||
      (p.nama_kejuaraan || '').toLowerCase().includes(q)
    )
  })

  // Fetch riwayat
  const openRiwayat = async (siswaId: number) => {
    setRiwayatOpen(true)
    setLoadingRiwayat(true)
    setRiwayatData(null)
    try {
      const r = await api.get<ApiResponse<any>>(`/penilaian/riwayat.php?siswa_id=${siswaId}`)
      setRiwayatData(r.data)
    } catch { } finally { setLoadingRiwayat(false) }
  }

  return (
    <Layout title="Rekap Nilai">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Rekapitulasi &amp; Visualisasi Nilai</h1>
          <p>Ringkasan nilai akhir siswa beserta grafik perbandingan per cabang olahraga.</p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--sp-5)', borderBottom: '1px solid var(--clr-border)', paddingBottom: 0 }}>
        {[
          { key: 'rekap',    label: 'Rekap Nilai',     icon: <TrendingUp size={15} /> },
          { key: 'prestasi', label: 'Daftar Prestasi', icon: <Medal size={15} /> },
        ].map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key as 'rekap' | 'prestasi')}
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

      {/* ── Shared: Tahun Ajaran selector ── */}
      <div className="card" style={{ marginBottom: 'var(--sp-5)', padding: 'var(--sp-4) var(--sp-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
            <label className="form-label">Tahun Ajaran / Semester</label>
            <select className="form-control" value={selectedTA}
              onChange={e => setSelectedTA(Number(e.target.value))}>
              {tahunAjarans.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nama} – Sem {t.semester} {t.status === 'aktif' ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Rekap tab extra filters */}
          {activeTab === 'rekap' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kelas</label>
                <select className="filter-select" value={kelasFilter} onChange={e => setKelasFilter(e.target.value)}>
                  <option value="">Semua Kelas</option>
                  {uniqueKelas.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cabang Olahraga</label>
                <select className="filter-select" value={caborFilter} onChange={e => setCaborFilter(e.target.value)}>
                  <option value="">Semua Cabor</option>
                  {uniqueCabang.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </>
          )}

          {/* Prestasi tab extra filters */}
          {activeTab === 'prestasi' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cabang Olahraga</label>
                <select className="filter-select" value={pCaborFilter} onChange={e => setPCaborFilter(e.target.value)}>
                  <option value="">Semua Cabor</option>
                  {caborOptions.map(c => <option key={c.id} value={String(c.id)}>{c.nama}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Bulan</label>
                <select className="filter-select" value={pBulanFilter} onChange={e => setPBulanFilter(e.target.value)}>
                  <option value="">Semua Bulan</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={String(m)}>{BULAN_NAMES[m]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Predikat Juara</label>
                <select className="filter-select" value={pJuaraFilter} onChange={e => setPJuaraFilter(e.target.value)}>
                  <option value="">Semua Juara</option>
                  {peringkatOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  {['Juara 1','Juara 2','Juara 3','Medali Emas','Medali Perak','Medali Perunggu'].map(p => (
                    !peringkatOptions.includes(p) && <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          TAB 1: REKAP NILAI
      ══════════════════════════════════════ */}
      {activeTab === 'rekap' && (
        loading ? (
          <div className="flex-center" style={{ padding: 80 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            {/* Stat Cards */}
            {statistik && (
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon primary"><Users size={22} /></div>
                  <div className="stat-body">
                    <div className="stat-label">Sudah Dinilai</div>
                    <div className="stat-value">{statistik.sudah_dinilai}</div>
                    <div className="stat-sub">dari {statistik.total} siswa</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon success"><TrendingUp size={22} /></div>
                  <div className="stat-body">
                    <div className="stat-label">Rata-rata Kelas</div>
                    <div className="stat-value">{statistik.rata_rata.toFixed(2)}</div>
                    <div className="stat-sub">Nilai akhir rata-rata</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon accent"><Trophy size={22} /></div>
                  <div className="stat-body">
                    <div className="stat-label">Nilai Tertinggi</div>
                    <div className="stat-value">{statistik.tertinggi.toFixed(2)}</div>
                    <div className="stat-sub">Nilai terendah: {statistik.terendah.toFixed(2)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon warning"><Award size={22} /></div>
                  <div className="stat-body">
                    <div className="stat-label">Predikat Terbanyak</div>
                    <div className="stat-value" style={{ fontSize: '1rem' }}>
                      {Object.entries(statistik.predikat).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '–'}
                    </div>
                    <div className="stat-sub">Distribusi predikat</div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            {statistik && data.length > 0 && (
              <div className="grid-responsive" style={{ marginBottom: 'var(--sp-6)' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Rata-rata Nilai per Cabang</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                      <XAxis dataKey="name" tick={{ fill: '#9ba3be', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#9ba3be', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Rata-rata" radius={[4, 4, 0, 0]}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Distribusi Predikat</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={predikatPieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${value}`}>
                        {predikatPieData.map((entry, i) => (
                          <Cell key={i} fill={PREDIKAT_COLOR[entry.name] || CHART_COLORS[i]} />
                        ))}
                      </Pie>
                      <Legend formatter={val => <span style={{ color: '#9ba3be', fontSize: '0.78rem' }}>{val}</span>} />
                      <Tooltip
                        contentStyle={{ background: '#1e2130', border: '1px solid #2e3348', borderRadius: 8 }}
                        labelStyle={{ color: '#f0f2f8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Data Tables */}
            {(() => {
              const activeStudents = data.filter(r => r.status_siswa !== 'nonaktif')
              const inactiveStudents = data.filter(r => r.status_siswa === 'nonaktif')

              const renderTable = (students: RekapRow[], title: string, isInactive: boolean) => (
                <div className="card" style={{ padding: 0, marginBottom: isInactive ? 0 : 'var(--sp-6)', opacity: isInactive ? 0.85 : 1 }}>
                  <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--clr-border)', background: isInactive ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: isInactive ? 'var(--clr-danger)' : 'var(--clr-text)' }}>
                      {title} ({students.length} siswa)
                    </h3>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Cabang</th>
                          <th>Keterampilan</th><th>Prestasi</th><th>Kehadiran</th>
                          <th>Nilai Akhir</th><th>Predikat</th><th>Status</th>
                          <th>Dinilai Oleh</th>
                          <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr><td colSpan={13} className="table-empty">Belum ada data penilaian.</td></tr>
                        ) : students.map((row, i) => (
                          <tr key={row.penilaian_id} style={{ background: isInactive ? 'rgba(239,68,68,0.02)' : undefined }}>
                            <td style={{ color: 'var(--clr-text-3)', width: 40 }}>{i + 1}</td>
                            <td><code style={{ fontSize: '0.78rem' }}>{row.nis}</code></td>
                            <td><strong>{row.nama_siswa}</strong></td>
                            <td><span className="badge badge-info">{row.kelas}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>{row.nama_cabang}</td>
                            <td style={{ fontWeight: 600 }}>{Number(row.nilai_keterampilan).toFixed(2)}</td>
                            <td style={{ fontWeight: 600 }}>{Number(row.nilai_prestasi).toFixed(2)}</td>
                            <td>
                              <div style={{ fontSize: '0.82rem' }}>
                                <strong>{Number(row.nilai_kehadiran).toFixed(2)}</strong>
                                {row.persentase_hadir != null && (
                                  <div style={{ color: 'var(--clr-text-3)', fontSize: '0.72rem' }}>
                                    {Number(row.persentase_hadir).toFixed(1)}% hadir
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: '1rem', color: PREDIKAT_COLOR[row.predikat] || 'var(--clr-text)' }}>
                                {Number(row.nilai_akhir).toFixed(2)}
                              </strong>
                            </td>
                            <td>
                              <span className="badge" style={{
                                background: `${PREDIKAT_COLOR[row.predikat] || '#9ba3be'}20`,
                                color: PREDIKAT_COLOR[row.predikat] || '#9ba3be',
                                fontSize: '0.7rem'
                              }}>
                                {row.predikat}
                              </span>
                            </td>
                            <td>
                              {row.status === 'final'
                                ? <span className="badge badge-success">✓ Final</span>
                                : <span className="badge badge-warning">📝 Draft</span>}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)' }}>{row.nama_guru}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                onClick={() => openRiwayat(row.siswa_id)}
                                title="Lihat Riwayat Nilai"
                              >
                                🕒 Riwayat
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )

              return (
                <>
                  {renderTable(activeStudents, 'Daftar Nilai Siswa Aktif', false)}
                  {inactiveStudents.length > 0 && renderTable(inactiveStudents, 'Riwayat Nilai Siswa Nonaktif', true)}
                </>
              )
            })()}
          </>
        )
      )}

      {/* ══════════════════════════════════════
          TAB 2: DAFTAR PRESTASI
      ══════════════════════════════════════ */}
      {activeTab === 'prestasi' && (
        loadingPrestasi ? (
          <div className="flex-center" style={{ padding: 80 }}><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            {/* Stat ringkas */}
            <div className="stat-grid" style={{ marginBottom: 'var(--sp-5)' }}>
              <div className="stat-card">
                <div className="stat-icon accent"><Trophy size={22} /></div>
                <div className="stat-body">
                  <div className="stat-label">Total Kejuaraan</div>
                  <div className="stat-value">{prestasiData.length}</div>
                  <div className="stat-sub">Prestasi Terdaftar</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon primary"><Medal size={22} /></div>
                <div className="stat-body">
                  <div className="stat-label">Siswa Berprestasi</div>
                  <div className="stat-value">{new Set(prestasiData.map(p => p.siswa_id)).size}</div>
                  <div className="stat-sub">Total Siswa</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon warning"><Trophy size={22} /></div>
                <div className="stat-body">
                  <div className="stat-label">Juara 1</div>
                  <div className="stat-value">{prestasiData.filter(p => p.peringkat?.toLowerCase().includes('juara 1') || p.peringkat?.includes('Emas')).length}</div>
                  <div className="stat-sub">Prestasi Terbaik</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon success"><Trophy size={22} /></div>
                <div className="stat-body">
                  <div className="stat-label">Tingkat Internasional/Nasional</div>
                  <div className="stat-value">{prestasiData.filter(p => ['Internasional','Nasional'].includes(p.tingkatan)).length}</div>
                  <div className="stat-sub">Prestasi Bergengsi</div>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="card" style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)' }}>
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <input
                  className="form-control"
                  placeholder="Cari nama siswa, NIS, atau nama kejuaraan..."
                  value={pSearch}
                  onChange={e => setPSearch(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-4)' }}>
                  🔍
                </span>
              </div>
            </div>

            {/* Prestasi table */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Medal size={16} style={{ color: 'var(--clr-accent)' }} />
                  Daftar Prestasi Siswa
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                    {(() => {
                      const studentCount = new Set(filteredPrestasi.map(p => p.siswa_id)).size
                      return `${studentCount} Siswa (${filteredPrestasi.length} Kejuaraan)`
                    })()}
                  </span>
                </h3>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Siswa</th>
                      <th>Kelas</th>
                      <th>Cabang</th>
                      <th style={{ padding: 0, verticalAlign: 'middle', borderBottom: '1px solid var(--clr-border)' }}>
                        <div style={{ 
                          display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr 1.2fr 0.5fr', 
                          gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)',
                          fontSize: '0.78rem', color: 'var(--clr-text-3)', borderBottom: 'none'
                        }}>
                          <div>NAMA KEJUARAAN</div>
                          <div>BULAN</div>
                          <div>TINGKATAN</div>
                          <div>JUARA</div>
                          <div style={{ textAlign: 'right' }}>NILAI</div>
                        </div>
                      </th>
                      <th style={{ textAlign: 'center', width: 80 }}>Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrestasi.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">
                          {prestasiData.length === 0
                            ? 'Belum ada data prestasi untuk semester ini.'
                            : 'Tidak ada hasil yang cocok dengan pencarian.'}
                        </td>
                      </tr>
                    ) : (() => {
                      // Grouping data by student
                      const groups: any[] = []
                      filteredPrestasi.forEach(p => {
                        const existing = groups.find(g => g.siswa_id === p.siswa_id)
                        if (existing) {
                          existing.achievements.push(p)
                        } else {
                          groups.push({
                            ...p,
                            achievements: [p]
                          })
                        }
                      })

                      return groups.map((student, i) => (
                        <tr key={student.siswa_id} style={{ verticalAlign: 'top' }}>
                          <td style={{ color: 'var(--clr-text-3)', paddingTop: 'var(--sp-4)' }}>{i + 1}</td>
                          <td style={{ paddingTop: 'var(--sp-4)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-primary)' }}>{student.nama_siswa}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                              <code>{student.nis}</code>
                            </div>
                          </td>
                          <td style={{ paddingTop: 'var(--sp-4)' }}>
                            <span className="badge badge-info">{student.kelas}</span>
                          </td>
                          <td style={{ paddingTop: 'var(--sp-4)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.nama_cabang}</div>
                          </td>
                          {/* Achievement Details (Stacked) */}
                          <td style={{ padding: 0 }}>
                            {student.achievements.map((ach: any, idx: number) => {
                              const clr = TINGKATAN_COLOR[ach.tingkatan] || '#9ba3be'
                              const bulanName = ach.bulan ? BULAN_NAMES[ach.bulan] : (BULAN_NAMES[(new Date(ach.tanggal_input)).getMonth() + 1] || '–')
                              
                              return (
                                <div key={ach.prestasi_id} style={{ 
                                  padding: 'var(--sp-3) var(--sp-4)',
                                  borderBottom: idx === student.achievements.length - 1 ? 'none' : '1px solid var(--clr-border-2)',
                                  display: 'grid',
                                  gridTemplateColumns: '1.5fr 0.8fr 1fr 1.2fr 0.5fr',
                                  gap: 'var(--sp-3)',
                                  alignItems: 'center',
                                  background: idx % 2 === 0 ? 'transparent' : 'var(--clr-bg-2)20'
                                }}>
                                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ach.nama_kejuaraan}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>{bulanName}</div>
                                  <div>
                                    <span style={{ 
                                      fontSize: '0.7rem', fontWeight: 700, color: clr,
                                      padding: '2px 8px', borderRadius: 'var(--r-full)',
                                      background: `${clr}15`, border: `1px solid ${clr}30`
                                    }}>{ach.tingkatan}</span>
                                  </div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ach.peringkat}</div>
                                  <div style={{ textAlign: 'right', fontWeight: 800, color: clr }}>{Number(ach.nilai_prestasi).toFixed(0)}</div>
                                </div>
                              )
                            })}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                              {student.achievements.map((ach: any) => (
                                ach.bukti_foto ? (
                                  <a key={ach.prestasi_id}
                                    href={`/api/${ach.bukti_foto}`}
                                    target="_blank" rel="noopener noreferrer"
                                    title={`Bukti ${ach.nama_kejuaraan}`}
                                    style={{ 
                                      width: 28, height: 28, borderRadius: '50%', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      background: 'var(--clr-info-bg)', color: 'var(--clr-info)',
                                      border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.8rem'
                                    }}
                                  >
                                    📎
                                  </a>
                                ) : <div key={ach.prestasi_id} style={{ height: 28 }}>–</div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {/* MODAL RIWAYAT NILAI */}
      {riwayatOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setRiwayatOpen(false)}>
          <div style={{
            background: '#ffffff', border: '1px solid var(--clr-border)',
            borderRadius: 16, maxWidth: 760, width: '100%', maxHeight: '80vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(11,45,107,0.22)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--clr-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1), transparent)',
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>🕒 Riwayat Nilai Siswa</h3>
                {riwayatData && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                    {riwayatData.siswa.nama} ({riwayatData.siswa.nis}) - {riwayatData.siswa.nama_cabang}
                  </p>
                )}
              </div>
              <button onClick={() => setRiwayatOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--clr-text-3)',
                cursor: 'pointer', padding: 4, borderRadius: 6,
              }}>✕</button>
            </div>
            
            <div style={{ overflow: 'auto', flex: 1, padding: 'var(--sp-4)' }}>
              {loadingRiwayat ? (
                <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
              ) : !riwayatData || riwayatData.riwayat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-4)' }}>
                  Belum ada riwayat nilai untuk siswa ini.
                </div>
              ) : (
                <table className="table" style={{ width: '100%', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Tahun Ajaran</th>
                      <th>Kelas</th>
                      <th>Keterampilan</th>
                      <th>Prestasi</th>
                      <th>Kehadiran</th>
                      <th>Nilai Akhir</th>
                      <th>Predikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatData.riwayat.map((rw: any) => (
                      <tr key={rw.penilaian_id}>
                        <td style={{ fontWeight: 600 }}>{rw.tahun_ajaran} - Sem {rw.semester}</td>
                        <td><span className="badge badge-info">{rw.kelas_saat_dinilai}</span></td>
                        <td>{Number(rw.nilai_keterampilan).toFixed(2)}</td>
                        <td>{Number(rw.nilai_prestasi).toFixed(2)}</td>
                        <td>{Number(rw.nilai_kehadiran).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>{Number(rw.nilai_akhir).toFixed(2)}</td>
                        <td><span className="badge badge-neutral">{rw.predikat}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
