import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Public
import LandingPage        from './pages/LandingPage'
import LoginPage          from './pages/LoginPage'

// Shared
import DashboardPage      from './pages/DashboardPage'

// Admin
import TahunAjaranPage    from './pages/admin/TahunAjaranPage'
import PenggunaPage       from './pages/admin/PenggunaPage'
import SiswaPage          from './pages/admin/SiswaPage'
import KenaikanKelasPage from './pages/admin/KenaikanKelasPage'
import CabangPage         from './pages/admin/CabangPage'
import GraduationPage     from './pages/admin/GraduationPage'
import KriteriaPage       from './pages/admin/KriteriaPage'
import GuruKelasPage      from './pages/admin/GuruKelasPage'
import ProfilPelatihPage  from './pages/admin/ProfilPelatihPage'
import PendampingCaborPage from './pages/admin/PendampingCaborPage'
import SettingsPage       from './pages/admin/SettingsPage'

// Guru Olahraga
import InputNilaiPage     from './pages/guru/InputNilaiPage'
import KelasDetailPage    from './pages/guru/KelasDetailPage'
import FormNilaiPage      from './pages/guru/FormNilaiPage'
import RekapGuruPage      from './pages/guru/RekapGuruPage'

// Wakasek
import WakasekRekapPage   from './pages/wakasek/WakasekRekapPage'
import WakasekAlumniPage  from './pages/wakasek/WakasekAlumniPage'
import WakasekAlumniDetailPage from './pages/wakasek/WakasekAlumniDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Shared – semua role */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />

          {/* ── ADMIN ── */}
          <Route path="/admin/tahun-ajaran" element={
            <ProtectedRoute roles={['admin']}><TahunAjaranPage /></ProtectedRoute>
          } />
          <Route path="/admin/kenaikan-kelas" element={
            <ProtectedRoute roles={['admin']}><KenaikanKelasPage /></ProtectedRoute>
          } />
          <Route path="/admin/kelulusan" element={
            <ProtectedRoute roles={['admin']}><GraduationPage /></ProtectedRoute>
          } />
          <Route path="/admin/pengguna" element={
            <ProtectedRoute roles={['admin']}><PenggunaPage /></ProtectedRoute>
          } />
          <Route path="/admin/siswa" element={
            <ProtectedRoute roles={['admin']}><SiswaPage /></ProtectedRoute>
          } />
          <Route path="/admin/cabang" element={
            <ProtectedRoute roles={['admin']}><CabangPage /></ProtectedRoute>
          } />
          <Route path="/admin/profil-pelatih" element={
            <ProtectedRoute roles={['admin']}><ProfilPelatihPage /></ProtectedRoute>
          } />
          <Route path="/admin/pendamping-cabor" element={
            <ProtectedRoute roles={['admin']}><PendampingCaborPage /></ProtectedRoute>
          } />
          <Route path="/admin/kriteria" element={
            <ProtectedRoute roles={['admin']}><KriteriaPage /></ProtectedRoute>
          } />
          <Route path="/admin/guru-kelas" element={
            <ProtectedRoute roles={['admin']}><GuruKelasPage /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>
          } />

          {/* ── GURU OLAHRAGA ── */}
          {/* Halaman pilih kelas */}
          <Route path="/guru/input-nilai" element={
            <ProtectedRoute roles={['guru_olahraga']}><InputNilaiPage /></ProtectedRoute>
          } />
          {/* Daftar siswa per kelas */}
          <Route path="/guru/kelas/:kelas" element={
            <ProtectedRoute roles={['guru_olahraga']}><KelasDetailPage /></ProtectedRoute>
          } />
          {/* Form penilaian individual */}
          <Route path="/guru/form-nilai/:siswaId" element={
            <ProtectedRoute roles={['guru_olahraga']}><FormNilaiPage /></ProtectedRoute>
          } />
          {/* Rekap & grafik */}
          <Route path="/guru/rekap" element={
            <ProtectedRoute roles={['guru_olahraga']}><RekapGuruPage /></ProtectedRoute>
          } />

          {/* ── WAKASEK ── */}
          <Route path="/wakasek/rekap" element={
            <ProtectedRoute roles={['wakasek']}><WakasekRekapPage /></ProtectedRoute>
          } />
          <Route path="/wakasek/alumni" element={
            <ProtectedRoute roles={['wakasek']}><WakasekAlumniPage /></ProtectedRoute>
          } />
          <Route path="/wakasek/alumni/:siswaId" element={
            <ProtectedRoute roles={['wakasek']}><WakasekAlumniDetailPage /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
