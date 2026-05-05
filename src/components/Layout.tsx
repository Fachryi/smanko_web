import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, GraduationCap, Dumbbell, ListChecks,
  CalendarDays, Settings, ClipboardList, Menu, X,
  LogOut, BookOpen, Trophy, TrendingUp
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from '../types'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         icon: <LayoutDashboard size={18}/>,  to: '/dashboard',             roles: ['admin','guru_olahraga','wakasek'] },
  // Admin
  { label: 'Tahun Ajaran',      icon: <CalendarDays size={18}/>,      to: '/admin/tahun-ajaran',    roles: ['admin'] },
  { label: 'Kenaikan Kelas',    icon: <TrendingUp size={18}/>,        to: '/admin/kenaikan-kelas',  roles: ['admin'] },
  { label: 'Pengguna',          icon: <Users size={18}/>,             to: '/admin/pengguna',        roles: ['admin'] },
  { label: 'Data Siswa',        icon: <GraduationCap size={18}/>,     to: '/admin/siswa',           roles: ['admin'] },
  { label: 'Cabang Olahraga',   icon: <Dumbbell size={18}/>,          to: '/admin/cabang',          roles: ['admin'] },
  { label: 'Profil Pelatih',    icon: <Users size={18}/>,             to: '/admin/profil-pelatih',  roles: ['admin'] },
  { label: 'Kriteria Penilaian',icon: <ListChecks size={18}/>,        to: '/admin/kriteria',        roles: ['admin'] },
  { label: 'Penugasan Guru',    icon: <BookOpen size={18}/>,          to: '/admin/guru-kelas',      roles: ['admin'] },
  { label: 'Pengaturan',        icon: <Settings size={18}/>,          to: '/admin/settings',        roles: ['admin'] },
  // Guru / Staff
  { label: 'Input Nilai',       icon: <ClipboardList size={18}/>,     to: '/guru/input-nilai',      roles: ['guru_olahraga'] },
  { label: 'Rekap Nilai',       icon: <Trophy size={18}/>,            to: '/guru/rekap',            roles: ['guru_olahraga'] },
  // Pendamping Cabor
  { label: 'Rekap Nilai',       icon: <Trophy size={18}/>,            to: '/wakasek/rekap',         roles: ['wakasek'] },
]

const ROLE_LABELS: Record<Role, string> = {
  admin:          'Administrator',
  guru_olahraga:  'Guru / Staff',
  wakasek:        'Pendamping Cabor',
}

interface Props { children: React.ReactNode; title?: string }

export default function Layout({ children, title }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [])

  // Close mobile sidebar when screen becomes wide
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const role    = user?.role as Role
  const initials = user?.nama?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() ?? 'U'

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/logo-smanko.jpg" alt="Logo SMANKO" />
        </div>
        <div className="sidebar-logo-text">
          <h2>SMANKO</h2>
          <span>Keberbakatan Olahraga Sulsel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">{ROLE_LABELS[role]}</div>
          {NAV_ITEMS.filter(item => item.roles.includes(role)).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <strong>{user?.nama}</strong>
            <span>{ROLE_LABELS[role]}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (Desktop: fixed, Mobile: drawer) ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="sidebar-mobile-close"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* ── Main ── */}
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-header">
          {/* Desktop: collapse toggle */}
          <button
            className="header-toggle desktop-only"
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Mobile: hamburger */}
          <button
            className="header-toggle mobile-only"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="header-title">{title || 'SMANKO'}</div>
          <span className="header-breadcrumb">{ROLE_LABELS[role]}</span>

          {/* Mobile: logout shortcut */}
          <button
            className="btn-logout mobile-only"
            onClick={handleLogout}
            style={{ marginLeft: 'auto' }}
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  )
}
