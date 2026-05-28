import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import { ArrowLeft, BookOpen, Trophy, Download, Loader2, Eye, GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { ApiResponse } from '../../types'
import { printAlumniDetailReport } from '../../utils/printAlumniReport'

interface SiswaInfo {
  id: number; nisn: string; nis: string; nama: string
  kelas_terakhir: string; jenis_kelamin: string; status: string
  nama_cabang: string; kode_cabang: string
}

interface RiwayatNilai {
  penilaian_id: number; status: string
  nilai_keterampilan: number; nilai_prestasi: number
  nilai_kehadiran: number; nilai_akhir: number
  predikat: string; catatan: string
  kelas_saat_dinilai: string; tahun_ajaran: string
  semester: number; nama_guru: string
}

interface PrestasiItem {
  prestasi_id: number; nama_kejuaraan: string
  tingkatan: string; peringkat: string
  nilai_prestasi: number; bukti_foto: string | null
  bulan: number; tanggal_input: string
  tahun_ajaran: string; semester: number
}

type TabType = 'nilai' | 'prestasi'

const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': '#f9a825', 'B (Baik)': '#22c55e',
  'C (Cukup)': '#3b82f6', 'D (Kurang)': '#f59e0b', 'E (Sangat Kurang)': '#ef4444',
}

const TINGKATAN_COLOR: Record<string, string> = {
  'Internasional': '#f9a825', 'Nasional': '#a855f7',
  'Provinsi': '#3b82f6', 'Kabupaten/Kota': '#22c55e',
  'Kecamatan': '#14b8a6', 'Pelajar/Sekolah': '#e85d2f',
}

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function WakasekAlumniDetailPage() {
  const { siswaId } = useParams<{ siswaId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [siswa, setSiswa] = useState<SiswaInfo | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatNilai[]>([])
  const [prestasi, setPrestasi] = useState<PrestasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('nilai')
  const [printing, setPrinting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!siswaId) return
    setLoading(true)
    api.get<ApiResponse<{ siswa: SiswaInfo; riwayat: RiwayatNilai[]; prestasi: PrestasiItem[] }>>(
      `/wakasek/alumni_detail.php?siswa_id=${siswaId}`
    ).then(r => {
      setSiswa(r.data?.siswa ?? null)
      setRiwayat(r.data?.riwayat ?? [])
      setPrestasi(r.data?.prestasi ?? [])
    }).catch(() => {
      navigate('/wakasek/alumni')
    }).finally(() => setLoading(false))
  }, [siswaId])

  const handlePrint = async () => {
    if (!siswa) return
    setPrinting(true)
    try {
      await printAlumniDetailReport({
        siswa,
        riwayat,
        prestasi,
        wakasekNama: user?.nama ?? 'Wakasek Kesiswaan',
      })
    } catch { } finally { setPrinting(false) }
  }

  if (loading) {
    return (
      <Layout title="Detail Alumni">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={32} className="spin" />
            <p style={{ color: 'var(--clr-text-3)', marginTop: 12 }}>Memuat data alumni...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!siswa) {
    return (
      <Layout title="Detail Alumni">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--clr-text-3)' }}>
          <p>Data alumni tidak ditemukan.</p>
          <button className="btn btn-primary" onClick={() => navigate('/wakasek/alumni')} style={{ marginTop: 12 }}>
            Kembali ke daftar alumni
          </button>
        </div>
      </Layout>
    )
  }

  const totalSemester = riwayat.length
  const rataNilaiAkhir = riwayat.length > 0
    ? (riwayat.reduce((s, r) => s + Number(r.nilai_akhir || 0), 0) / riwayat.length).toFixed(2)
    : '0.00'

  return (
    <Layout title="Detail Alumni">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Page Header ── */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate('/wakasek/alumni')} title="Kembali">
              <ArrowLeft size={18} />
            </button>
            <div className="page-header-left" style={{ margin: 0 }}>
              <h1 style={{ fontSize: '1.2rem' }}>{siswa.nama}</h1>
              <p>Alumni {siswa.nama_cabang} — {siswa.kelas_terakhir}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handlePrint} disabled={printing}>
            {printing ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            Cetak PDF
          </button>
        </div>

        {/* ── Info Siswa ── */}
        <div className="info-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, background: 'var(--clr-bg-2)', borderRadius: 12,
          padding: 20, border: '1px solid var(--clr-border)',
        }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>NISN</p>
            <p style={{ fontWeight: 700 }}>{siswa.nisn}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>NIS</p>
            <p style={{ fontWeight: 700 }}>{siswa.nis}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Jenis Kelamin</p>
            <p style={{ fontWeight: 700 }}>{siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Cabang Olahraga</p>
            <p style={{ fontWeight: 700 }}>{siswa.nama_cabang} ({siswa.kode_cabang})</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Kelas Terakhir</p>
            <p style={{ fontWeight: 700 }}>{siswa.kelas_terakhir}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Semester Ditempuh</p>
            <p style={{ fontWeight: 700 }}>{totalSemester} semester</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Rata-rata Nilai Akhir</p>
            <p style={{ fontWeight: 700, color: PREDIKAT_COLOR[riwayat[riwayat.length - 1]?.predikat] || '#f0f2f8' }}>
              {rataNilaiAkhir}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginBottom: 2 }}>Total Prestasi</p>
            <p style={{ fontWeight: 700 }}>{prestasi.length} prestasi</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'nilai' ? 'active' : ''}`}
            onClick={() => setActiveTab('nilai')}
          >
            <BookOpen size={16} /> Riwayat Nilai ({riwayat.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'prestasi' ? 'active' : ''}`}
            onClick={() => setActiveTab('prestasi')}
          >
            <Trophy size={16} /> Prestasi ({prestasi.length})
          </button>
        </div>

        {/* ── Tab Content: Nilai ── */}
        {activeTab === 'nilai' && (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Tahun Ajaran</th>
                    <th style={{ textAlign: 'center' }}>Semester</th>
                    <th>Kelas</th>
                    <th style={{ textAlign: 'center' }}>Keterampilan</th>
                    <th style={{ textAlign: 'center' }}>Prestasi</th>
                    <th style={{ textAlign: 'center' }}>Kehadiran</th>
                    <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                    <th>Predikat</th>
                    <th>Status</th>
                    <th>Guru Penilai</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: 30, color: 'var(--clr-text-3)' }}>
                        Belum ada data penilaian.
                      </td>
                    </tr>
                  ) : riwayat.map((r, i) => (
                    <tr key={r.penilaian_id}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td><strong>{r.tahun_ajaran}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-info">Semester {r.semester}</span>
                      </td>
                      <td>{r.kelas_saat_dinilai}</td>
                      <td style={{ textAlign: 'center' }}>{Number(r.nilai_keterampilan || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{Number(r.nilai_prestasi || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{Number(r.nilai_kehadiran || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: PREDIKAT_COLOR[r.predikat] }}>
                        {Number(r.nilai_akhir || 0).toFixed(2)}
                      </td>
                      <td>
                        <span style={{ color: PREDIKAT_COLOR[r.predikat], fontWeight: 600, fontSize: '0.82rem' }}>
                          {r.predikat || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'final' ? 'badge-success' : 'badge-warning'}`}>
                          {r.status === 'final' ? 'Final' : 'Draft'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{r.nama_guru || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab Content: Prestasi ── */}
        {activeTab === 'prestasi' && (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Tahun Ajaran</th>
                    <th style={{ textAlign: 'center' }}>Semester</th>
                    <th>Nama Kejuaraan</th>
                    <th style={{ textAlign: 'center' }}>Tingkatan</th>
                    <th style={{ textAlign: 'center' }}>Peringkat</th>
                    <th style={{ textAlign: 'center' }}>Nilai</th>
                    <th style={{ textAlign: 'center' }}>Bulan</th>
                    <th style={{ textAlign: 'center' }}>Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {prestasi.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--clr-text-3)' }}>
                        <Trophy size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                        <p>Tidak ada data prestasi.</p>
                      </td>
                    </tr>
                  ) : prestasi.map((p, i) => (
                    <tr key={p.prestasi_id}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td><strong>{p.tahun_ajaran}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-info">Semester {p.semester}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.nama_kejuaraan}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          background: `${TINGKATAN_COLOR[p.tingkatan] || '#6b7280'}20`,
                          color: TINGKATAN_COLOR[p.tingkatan] || '#6b7280',
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                        }}>
                          {p.tingkatan}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.peringkat || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>
                        {Number(p.nilai_prestasi || 0).toFixed(0)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                        {p.bulan ? BULAN_NAMES[p.bulan] : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.bukti_foto ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setPreviewUrl(p.bukti_foto)}
                            title="Lihat bukti"
                          >
                            <Eye size={13} />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--clr-text-4)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Lightbox ── */}
      {previewUrl && (
        <BuktiLightbox url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </Layout>
  )
}

// ── Lightbox Component ──
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 12, width: '100%', maxWidth: 900,
      }} onClick={e => e.stopPropagation()}>
        <span style={{ color: '#9ba3be', fontSize: '0.82rem', flex: 1 }}>
          {url.split('/').pop()}
        </span>
        <a href={fullUrl} download target="_blank" rel="noopener noreferrer">
          <button style={{
            background: '#2d3352', border: '1px solid #3a4060',
            borderRadius: 8, padding: '6px 14px', color: '#f0f2f8',
            cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
          }}>Download</button>
        </a>
        <button onClick={onClose} style={{
          background: '#ef4444', border: 'none', borderRadius: 8,
          width: 32, height: 32, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>X</button>
      </div>
      <div style={{
        maxWidth: 900, width: '100%', maxHeight: '80vh',
        background: '#1e2130', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #3a4060',
      }} onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={fullUrl} style={{ width: '100%', height: '80vh', border: 'none' }} title="Bukti" />
        ) : (
          <img src={fullUrl} alt="Bukti" style={{
            width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block',
          }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none'
              const parent = (e.target as HTMLImageElement).parentElement
              if (parent) parent.innerHTML = '<div style="padding:40px;text-align:center;color:#9ba3be">Gambar tidak dapat dimuat.</div>'
            }}
          />
        )}
      </div>
    </div>
  )
}
