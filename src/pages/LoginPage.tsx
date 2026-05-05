import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  User, Lock, Eye, EyeOff, AlertCircle,
  Shield, BarChart3, Award, ChevronRight
} from 'lucide-react'

const BLUE_DARK  = '#0b2d6b'
const BLUE_MID   = '#1155a8'
const BLUE_LIGHT = '#1e6ec8'
const RED        = '#c1272d'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('Username dan password wajib diisi.'); return }
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Username atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 40px',
    background: '#f5f8ff',
    border: '1.5px solid #dce6f7',
    borderRadius: 10, color: '#1a2744',
    fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <>
      <style>{`
        .login-outer {
          min-height: 100vh;
          background-image: url(/login-bg.jpg);
          background-size: cover;
          background-position: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          font-family: var(--font-sans);
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .login-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
        }
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 880px;
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08);
        }
        .login-brand-panel {
          flex: 1;
          background: linear-gradient(160deg, rgba(11,45,107,0.75) 0%, rgba(17,85,168,0.60) 60%, rgba(10,34,88,0.75) 100%);
          backdrop-filter: blur(8px);
          padding: 36px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .login-form-panel {
          flex: 0 0 360px;
          background: #ffffff;
          padding: 36px 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-mobile-footer {
          display: none;
        }

        /* ── Mobile: max 640px ── */
        @media (max-width: 640px) {
          .login-outer {
            padding: 16px 16px 48px 16px;
            align-items: flex-end;
            justify-content: center;
            height: 100dvh;
            overflow: hidden;
          }
          .login-card {
            flex-direction: column;
            border-radius: 24px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.25);
            min-height: auto;
            margin-top: 0;
            overflow: visible;
            width: 100%;
            max-width: 380px;
          }
          .login-brand-panel {
            display: none;
          }
          .login-form-panel {
            flex: 1;
            width: 100%;
            min-width: 0;
            padding: 48px 24px 28px;
            justify-content: center;
            border-radius: 24px;
            background: #ffffff;
            position: relative;
          }
          .form-header-container {
            position: static !important;
            margin-bottom: 20px !important;
            margin-top: 12px;
          }
          .form-logo {
            position: absolute !important;
            top: -42px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            margin-bottom: 0 !important;
            width: 84px !important;
            height: 84px !important;
            background: #ffffff !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
            border: none !important;
            z-index: 10;
          }
          .form-logo:hover {
            transform: translateX(-50%) scale(1.05) !important;
          }
          .login-mobile-footer {
            display: block;
            position: absolute;
            bottom: 16px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.7rem;
            color: rgba(255,255,255,0.9);
            text-shadow: 0 1px 4px rgba(0,0,0,0.5);
            z-index: 2;
          }
          form {
            gap: 12px !important;
          }
          .form-header-container h2 {
            font-size: 1.25rem !important;
            margin-top: 8px !important;
          }
        }

        /* ── Small tablet: 641–768px ── */
        @media (min-width: 641px) and (max-width: 768px) {
          .login-brand-panel {
            padding: 28px 22px;
          }
          .login-form-panel {
            flex: 0 0 300px;
            padding: 28px 24px;
          }
        }
      `}</style>

      <div className="login-outer">
        {/* Overlay */}
        <div className="login-overlay" />

        {/* ── Main Card ── */}
        <div className="login-card">

          {/* ════════════════════════════════════
              LEFT: Branding panel (blue) — hidden on mobile
              ════════════════════════════════════ */}
          <div className="login-brand-panel">
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(193,39,45,0.1)',
            }} />

            {/* Top: Logo + school name */}
            <div>
              <div
                onClick={() => navigate('/')}
                title="Kembali ke Beranda"
                style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36, cursor: 'pointer' }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                  border: '2.5px solid rgba(255,255,255,0.35)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}>
                  <img src="/logo-smanko.jpg" alt="Logo SMANKO"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', lineHeight: 1.3 }}>
                    SMA Negeri Khusus
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    Keberbakatan Olahraga<br />Provinsi Sulawesi Selatan
                  </div>
                </div>
              </div>

              {/* Red accent line */}
              <div style={{
                width: 44, height: 4, borderRadius: 2,
                background: `linear-gradient(90deg, ${RED}, #e84a4f)`,
                marginBottom: 18,
              }} />

              {/* Hero text */}
              <h1 style={{
                color: '#fff', fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
                fontWeight: 900, lineHeight: 1.2, margin: '0 0 16px',
              }}>
                Sistem Informasi<br />
                <span style={{ color: '#f9c74f' }}>Rekapitulasi Nilai</span><br />
                Cabang Olahraga
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: '0.83rem', lineHeight: 1.65,
                margin: '0 0 28px', maxWidth: 320,
              }}>
                Platform digital penilaian siswa pelajar SMANKO — terukur, transparan, dan terintegrasi.
              </p>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
              {[
                { icon: <Shield size={14} />, text: 'Akses aman berbasis peran (Admin, Guru / Staff, Pendamping Cabor)' },
                { icon: <BarChart3 size={14} />, text: 'Rekapitulasi otomatis dengan perhitungan berbobot' },
                { icon: <Award size={14} />, text: 'Keterampilan, Prestasi & Kehadiran terintegrasi' },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 9, padding: '8px 12px',
                  color: 'rgba(255,255,255,0.82)', fontSize: '0.78rem',
                }}>
                  <span style={{ color: '#f9c74f', flexShrink: 0 }}>{f.icon}</span>
                  {f.text}
                </div>
              ))}
              <p style={{
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)',
                marginTop: 16, margin: '16px 0 0',
              }}>
                © 2026 SMANKO Sulawesi Selatan
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════
              RIGHT: Form panel (white/clean)
              ════════════════════════════════════ */}
          <div className="login-form-panel">
            {/* Logo + title */}
            <div className="form-header-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, position: 'relative' }}>
              <div
                onClick={() => navigate('/')}
                title="Kembali ke Beranda"
                className="form-logo"
                style={{
                  width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                  border: `3px solid ${BLUE_LIGHT}30`,
                  boxShadow: `0 4px 20px ${BLUE_DARK}20`,
                  marginBottom: 14,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 4
                }}
              >
                <img src="/logo-smanko.jpg" alt="Logo SMANKO"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              </div>

              <h2 style={{
                fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px',
                color: BLUE_DARK, letterSpacing: '0.5px',
              }}>
                SMANKO
              </h2>
              {/* Blue + Red + White separator */}
              <div style={{ display: 'flex', gap: 4, margin: '8px 0' }}>
                <div style={{ width: 28, height: 3, borderRadius: 2, background: BLUE_MID }} />
                <div style={{ width: 14, height: 3, borderRadius: 2, background: RED }} />
                <div style={{ width: 28, height: 3, borderRadius: 2, background: '#e2e8f0' }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#8b9ab8', margin: 0, textAlign: 'center' }}>
                Masuk ke akun Anda untuk melanjutkan
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff5f5', border: '1.5px solid #fca5a5',
                borderRadius: 9, padding: '9px 13px',
                color: '#dc2626', fontSize: '0.8rem', marginBottom: 14,
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Username */}
              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: BLUE_DARK, marginBottom: 6, letterSpacing: '0.2px',
                }}>
                  USERNAME <span style={{ color: RED }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: '#a0b0cc', pointerEvents: 'none',
                  }} />
                  <input
                    id="login-username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    style={inputStyle}
                    onFocus={e => {
                      e.target.style.borderColor = BLUE_MID
                      e.target.style.boxShadow = `0 0 0 3px ${BLUE_MID}20`
                      e.target.style.background = '#fff'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#dce6f7'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#f5f8ff'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: BLUE_DARK, marginBottom: 6, letterSpacing: '0.2px',
                }}>
                  PASSWORD <span style={{ color: RED }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: '#a0b0cc', pointerEvents: 'none',
                  }} />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: 42 }}
                    onFocus={e => {
                      e.target.style.borderColor = BLUE_MID
                      e.target.style.boxShadow = `0 0 0 3px ${BLUE_MID}20`
                      e.target.style.background = '#fff'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#dce6f7'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#f5f8ff'
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#a0b0cc',
                    cursor: 'pointer', padding: 2, display: 'flex',
                  }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: loading
                    ? '#94afd4'
                    : `linear-gradient(135deg, ${BLUE_MID} 0%, ${BLUE_LIGHT} 100%)`,
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : `0 4px 16px ${BLUE_MID}45`,
                  transition: 'all 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 15, height: 15, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }} />
                    Memuat...
                  </>
                ) : (
                  <>Masuk ke Sistem <ChevronRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer — visible on mobile */}
        <p className="login-mobile-footer">
          © 2026 SMANKO Sulawesi Selatan
        </p>
      </div>
    </>
  )
}
