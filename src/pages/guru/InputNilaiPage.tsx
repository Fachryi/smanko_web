import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import type { TahunAjaran, ApiResponse } from '../../types'
import { GraduationCap, ClipboardList, CheckCircle, Clock, ChevronRight, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface GuruKelasItem {
  id: number
  kelas: string
  tahun_ajaran_id: number
  tahun_ajaran: string
  semester: number
}

interface KelasStats {
  kelas: string
  total: number
  sudah_dinilai: number
  belum_dinilai: number
}

export default function InputNilaiPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [kelasList, setKelasList]         = useState<GuruKelasItem[]>([])
  const [tahunAjaran, setTahunAjaran]     = useState<TahunAjaran[]>([])
  const [selectedTA, setSelectedTA]       = useState<number>(0)
  const [loading, setLoading]             = useState(true)
  const [kelasStats, setKelasStats]       = useState<Record<string, KelasStats>>({})
  const [loadingStats, setLoadingStats]   = useState(false)

  // Load tahun ajaran
  useEffect(() => {
    api.get<ApiResponse<TahunAjaran[]>>('/master/tahun_ajaran.php')
      .then(r => {
        const list = r.data ?? []
        setTahunAjaran(list)
        const aktif = list.find(t => t.status === 'aktif')
        if (aktif) setSelectedTA(aktif.id)
        else if (list.length) setSelectedTA(list[0].id)
      }).catch(() => {})
  }, [])

  // Load kelas guru
  useEffect(() => {
    if (!selectedTA) return
    setLoading(true)
    api.get<ApiResponse<GuruKelasItem[]>>(`/master/guru_kelas.php?tahun_ajaran_id=${selectedTA}`)
      .then(r => setKelasList(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedTA])

  // Load stats untuk setiap kelas
  const loadStats = useCallback(async () => {
    if (!selectedTA || kelasList.length === 0) return
    setLoadingStats(true)
    const statsMap: Record<string, KelasStats> = {}
    await Promise.all(
      kelasList.map(async (gk) => {
        try {
          const r = await api.get<ApiResponse<KelasStats>>(
            `/penilaian/status_kelas.php?kelas=${gk.kelas}&tahun_ajaran_id=${selectedTA}`
          )
          if (r.data) statsMap[gk.kelas] = r.data
        } catch { /* ignore */ }
      })
    )
    setKelasStats(statsMap)
    setLoadingStats(false)
  }, [kelasList, selectedTA])

  useEffect(() => { loadStats() }, [loadStats])

  const uniqueKelas = [...new Set(kelasList.map(g => g.kelas))].sort()
  const taSelected  = tahunAjaran.find(t => t.id === selectedTA)

  return (
    <Layout title="Input Nilai">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Input Nilai Siswa</h1>
          <p>Pilih kelas untuk mulai menilai siswa yang Anda ampuh.</p>
        </div>
      </div>

      {/* Tahun Ajaran - Static */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-4) var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1, minWidth: 240 }}>
            <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap', fontWeight: 700 }}>
              Tahun Ajaran:
            </label>
            <div style={{
              flex: 1,
              height: 40, padding: '0 14px',
              border: '1.5px solid var(--clr-border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--clr-bg-3)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.9rem', color: 'var(--clr-text)',
            }}>
              {taSelected ? (
                <span style={{ fontWeight: 600 }}>
                  {taSelected.nama} – Semester {taSelected.semester}
                </span>
              ) : (
                <span style={{ color: 'var(--clr-text-3)' }}>Memuat...</span>
              )}
            </div>
          </div>
          {taSelected && (
            <span className={`badge ${taSelected.status === 'aktif' ? 'badge-success' : 'badge-neutral'}`}>
              {taSelected.status === 'aktif' ? '● Periode Aktif' : '● Periode Tutup'}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--clr-text-3)' }}>
            <Users size={16} />
            <span>Halo, <strong style={{ color: 'var(--clr-text)' }}>{user?.nama}</strong></span>
          </div>
        </div>
      </div>


      {/* Kelas Cards */}
      {loading ? (
        <div className="flex-center" style={{ padding: 80 }}><div className="spinner spinner-lg" /></div>
      ) : uniqueKelas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-12)' }}>
          <GraduationCap size={48} style={{ margin: '0 auto var(--sp-4)', color: 'var(--clr-text-4)' }} />
          <h3 style={{ color: 'var(--clr-text-2)', marginBottom: 'var(--sp-2)' }}>Belum Ada Penugasan</h3>
          <p>Anda belum ditugaskan ke kelas manapun untuk tahun ajaran ini.<br />Hubungi Admin untuk pengaturan penugasan kelas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-5)' }}>
          {uniqueKelas.map(kelas => {
            const stats = kelasStats[kelas]
            const pct = stats && stats.total > 0 ? Math.round((stats.sudah_dinilai / stats.total) * 100) : 0
            const progressColor = pct === 100 ? 'ok' : pct > 50 ? 'warning' : 'danger'

            return (
              <button
                key={kelas}
                className="card"
                style={{
                  cursor: 'pointer', textAlign: 'left', border: '1px solid var(--clr-border)',
                  transition: 'all 0.2s ease', background: 'var(--clr-surface)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-primary)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                onClick={() => navigate(`/guru/kelas/${kelas}?ta=${selectedTA}`)}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div className="stat-icon primary" style={{ width: 44, height: 44 }}>
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '1.1rem', display: 'block' }}>Kelas {kelas}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)' }}>
                        {stats ? `${stats.total} siswa` : 'Memuat...'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--clr-text-4)' }} />
                </div>

                {/* Progress */}
                {loadingStats && !stats ? (
                  <div style={{ height: 40 }} className="flex-center"><div className="spinner" /></div>
                ) : stats ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--clr-text-3)' }}>Progress Penilaian</span>
                      <strong style={{ color: pct === 100 ? 'var(--clr-success)' : 'var(--clr-warning)' }}>{pct}%</strong>
                    </div>
                    <div className="progress-bar-wrapper">
                      <div className={`progress-bar ${progressColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                        <CheckCircle size={14} style={{ color: 'var(--clr-success)' }} />
                        <span style={{ color: 'var(--clr-success)' }}>{stats.sudah_dinilai} Selesai</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                        <Clock size={14} style={{ color: 'var(--clr-warning)' }} />
                        <span style={{ color: 'var(--clr-warning)' }}>{stats.belum_dinilai} Belum</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Badge */}
                <div style={{ paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 'var(--sp-2)' }}>
                  <span className="badge badge-info"><ClipboardList size={11} /> Klik untuk buka</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
