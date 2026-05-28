import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import { GraduationCap, Search, Eye, Loader2 } from 'lucide-react'
import type { ApiResponse, CabangOlahraga } from '../../types'

interface AlumniRow {
  siswa_id: number
  nisn: string
  nis: string
  nama: string
  kelas_terakhir: string
  jenis_kelamin: 'L' | 'P'
  cabang_olahraga_id: number
  nama_cabang: string
  kode_cabang: string
  tahun_lulus: string
  total_prestasi: number
  nilai_akhir_tertinggi: number | null
}

export default function WakasekAlumniPage() {
  const navigate = useNavigate()
  const [alumni, setAlumni] = useState<AlumniRow[]>([])
  const [cabangList, setCabangList] = useState<CabangOlahraga[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCabang, setFilterCabang] = useState('')
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCabang) params.set('cabang_olahraga_id', filterCabang)
      if (search.trim()) params.set('search', search.trim())
      const res = await api.get<ApiResponse<{ alumni: AlumniRow[]; cabang_list: CabangOlahraga[] }>>(`/wakasek/alumni_list.php?${params}`)
      setAlumni(res.data?.alumni ?? [])
      setCabangList(res.data?.cabang_list ?? [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [filterCabang])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  return (
    <Layout title="Data Alumni">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Data Alumni</h1>
            <p>{loading ? 'Memuat...' : `${alumni.length} alumni terdaftar`}</p>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="filter-bar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrapper">
              <Search size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama, NISN, atau NIS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filterCabang}
              onChange={e => setFilterCabang(e.target.value)}
              className="filter-select"
            >
              <option value="">Semua Cabang</option>
              {cabangList.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">Cari</button>
            {(search || filterCabang) && (
              <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setFilterCabang(''); loadData() }}>
                Reset
              </button>
            )}
          </form>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>No</th>
                  <th>NISN</th>
                  <th>NIS</th>
                  <th>Nama Alumni</th>
                  <th>JK</th>
                  <th>Kelas Terakhir</th>
                  <th>Cabang Olahraga</th>
                  <th>Tahun Lulus</th>
                  <th style={{ textAlign: 'center' }}>Total Prestasi</th>
                  <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 40 }}>
                      <Loader2 size={28} className="spin" style={{ margin: '0 auto' }} />
                      <p style={{ color: 'var(--clr-text-3)', marginTop: 8 }}>Memuat data alumni...</p>
                    </td>
                  </tr>
                ) : alumni.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>
                      <GraduationCap size={40} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <p>Tidak ada data alumni.</p>
                    </td>
                  </tr>
                ) : alumni.map((a, i) => (
                  <tr key={a.siswa_id}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td><code>{a.nisn}</code></td>
                    <td><code>{a.nis}</code></td>
                    <td><strong>{a.nama}</strong></td>
                    <td>{a.jenis_kelamin}</td>
                    <td><span className="badge badge-info">{a.kelas_terakhir}</span></td>
                    <td>{a.nama_cabang}</td>
                    <td>{a.tahun_lulus || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-success">{a.total_prestasi}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {a.nilai_akhir_tertinggi !== null ? Number(a.nilai_akhir_tertinggi).toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/wakasek/alumni/${a.siswa_id}`)}
                        title="Lihat detail alumni"
                      >
                        <Eye size={14} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  )
}
