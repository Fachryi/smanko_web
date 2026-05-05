import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/apiClient'
import type { ApiResponse } from '../types'
import { Users, GraduationCap, Dumbbell, CalendarDays, Trophy, TrendingUp } from 'lucide-react'

interface DashboardStats {
  total_siswa: number
  total_cabor: number
  total_pelatih: number
  tahun_ajaran: {
    nama: string
    semester: number
  } | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ApiResponse<DashboardStats>>('/master/dashboard_stats.php')
      .then(res => setData(res.data ?? null))
      .catch(err => console.error('Gagal memuat dashboard:', err))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { 
      label: 'Total Siswa Aktif', 
      value: loading ? '...' : String(data?.total_siswa ?? 0), 
      sub: loading ? 'Memuat...' : `${data?.total_cabor ?? 0} cabang olahraga`, 
      icon: <GraduationCap size={22}/>, type: 'primary' 
    },
    { 
      label: 'Cabang Olahraga',   
      value: loading ? '...' : String(data?.total_cabor ?? 0), 
      sub: 'Terdaftar di sistem', 
      icon: <Dumbbell size={22}/>,    type: 'success' 
    },
    { 
      label: 'Total Pelatih',     
      value: loading ? '...' : String(data?.total_pelatih ?? 0), 
      sub: 'Profil pelatih terdaftar',      
      icon: <Users size={22}/>,       type: 'warning' 
    },
    { 
      label: 'Tahun Ajaran',      
      value: loading ? '...' : (data?.tahun_ajaran?.nama ?? '-'), 
      sub: loading ? 'Memuat...' : `Semester ${data?.tahun_ajaran?.semester ?? '-'} – Aktif`, 
      icon: <CalendarDays size={22}/>, type: 'info' 
    },
  ]

  return (
    <Layout title="Dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Selamat datang, <strong style={{color:'var(--clr-text)'}}>{user?.nama}</strong>. Berikut ringkasan sistem.</p>
        </div>
        <span className="badge badge-success">● Tahun Ajaran Aktif</span>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.type}`}>{s.icon}</div>
            <div className="stat-body">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{display:'flex',alignItems:'center',gap:8}}>
            <TrendingUp size={18} style={{color:'var(--clr-primary-2)'}} />
            Ringkasan Sistem
          </h3>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'var(--sp-5)'}}>
          <div style={{padding:'var(--sp-5)',background:'var(--clr-bg-3)',borderRadius:'var(--r-md)',border:'1px solid var(--clr-border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp-3)',marginBottom:'var(--sp-3)'}}>
              <Trophy size={18} style={{color:'var(--clr-accent)'}}/>
              <strong style={{fontSize:'0.9rem'}}>Formula Nilai Akhir</strong>
            </div>
            <p style={{fontSize:'0.82rem',lineHeight:1.8}}>
              Nilai Akhir = <span style={{color:'var(--clr-primary-2)'}}>Keterampilan × 30%</span> +{' '}
              <span style={{color:'var(--clr-accent)'}}>Prestasi × 40%</span> +{' '}
              <span style={{color:'var(--clr-success)'}}>Kehadiran × 30%</span>
            </p>
            <p style={{fontSize:'0.78rem',marginTop:'var(--sp-2)',color:'var(--clr-text-3)'}}>
              Bobot dapat diubah Admin di menu Pengaturan
            </p>
          </div>
          <div style={{padding:'var(--sp-5)',background:'var(--clr-bg-3)',borderRadius:'var(--r-md)',border:'1px solid var(--clr-border)'}}>
            <div style={{marginBottom:'var(--sp-3)'}}>
              <strong style={{fontSize:'0.9rem'}}>Tabel Predikat</strong>
            </div>
            {[
              ['A (Istimewa)', '≥ 90', 'var(--clr-accent)'],
              ['B (Baik)',     '80 – 89', 'var(--clr-success)'],
              ['C (Cukup)',    '70 – 79', 'var(--clr-info)'],
              ['D (Kurang)',   '60 – 69', 'var(--clr-warning)'],
              ['E (Sangat Kurang)', '< 60', 'var(--clr-danger)'],
            ].map(([p, r, c]) => (
              <div key={p} style={{display:'flex',justifyContent:'space-between',
                                   padding:'4px 0',borderBottom:'1px solid var(--clr-border)',
                                   fontSize:'0.82rem'}}>
                <span style={{color: c as string, fontWeight:600}}>{p}</span>
                <span style={{color:'var(--clr-text-3)'}}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
