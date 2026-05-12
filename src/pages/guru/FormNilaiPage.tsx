import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../lib/apiClient'
import type { ApiResponse, SettingPrestasi, KriteriaKeterampilan } from '../../types'
import {
  ChevronLeft, Save, Eye, Upload, X, CheckCircle2, Plus,
  Dumbbell, GraduationCap, Trophy, ClipboardCheck, AlertCircle, ArrowRight
} from 'lucide-react'

// ── Success Modal Popup ──────────────────────────────────────
interface SuccessResult {
  nama_siswa: string
  nilai_akhir: string
  predikat: string
  status: string
}

function SuccessModal({ result, onGo }: { result: SuccessResult; onGo: () => void }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onGo(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [onGo])

  const predikatColor: Record<string, string> = {
    'A (Istimewa)': '#f9a825', 'B (Baik)': '#22c55e',
    'C (Cukup)': '#1155a8',   'D (Kurang)': '#f59e0b', 'E (Sangat Kurang)': '#ef4444',
  }
  const color = predikatColor[result.predikat] || '#1155a8'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(11, 45, 107, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #dce6f7',
        borderRadius: 24,
        padding: '40px 36px',
        maxWidth: 420, width: '100%',
        textAlign: 'center',
        boxShadow: '0 32px 80px rgba(11, 45, 107, 0.25)',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: 'linear-gradient(90deg, #1155a8, #1e6ec8)'
        }} />

        {/* Checkmark icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '2px solid rgba(34, 197, 148, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} style={{ color: '#22c55e' }} />
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4, color: '#0b2d6b' }}>
          Penilaian Berhasil Disimpan!
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7faa', marginBottom: 28 }}>
          {result.nama_siswa}
        </p>

        {/* Nilai utama card */}
        <div style={{
          background: '#f8faff',
          border: '1.5px solid #dce6f7',
          borderRadius: 20, padding: '20px 24px',
          marginBottom: 28,
        }}>
          <div style={{
            fontSize: '4rem', fontWeight: 900, lineHeight: 1,
            color, textShadow: `0 4px 20px ${color}30`,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {result.nilai_akhir}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.95rem', fontWeight: 700, color }}>
            {result.predikat}
          </div>
          <div style={{
            marginTop: 6, fontSize: '0.75rem', color: '#8b9ab8',
            fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            Status: {result.status === 'final'
              ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Final</span>
              : <span style={{ color: '#f59e0b', fontWeight: 700 }}>📝 Draft</span>}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onGo}
          style={{
            width: '100%', padding: '12px 24px',
            background: 'linear-gradient(135deg, #1155a8 0%, #1e6ec8 100%)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: '0.95rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10,
            boxShadow: '0 6px 20px rgba(17, 85, 168, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Kembali ke Daftar Siswa
          <ArrowRight size={18} />
        </button>

        {/* Countdown timer */}
        <p style={{ marginTop: 14, fontSize: '0.78rem', color: '#9ba3be' }}>
          Otomatis kembali dalam <strong style={{ color: '#1155a8' }}>{countdown}</strong> detik...
        </p>
      </div>
    </div>
  )
}

interface SiswaDetail {
  id: number; nisn: string; nis: string; nama: string; kelas: string
  jenis_kelamin: 'L' | 'P'
  cabang_olahraga_id: number; nama_cabang: string; kode_cabang: string
}

// Satu entri kejuaraan dalam daftar multi-prestasi
export interface PrestasiEntry {
  tingkatan: string
  nama_kejuaraan: string
  nomor_pertandingan: string   // nomor/spesialisasi pertandingan
  predikat_juara: string
  tanggal_prestasi: string  // format YYYY-MM-DD
  bukti_foto: File | null
  existing_bukti_foto?: string
}

interface ExistingPenilaian {
  id: number; status: string; catatan: string; nilai_keterampilan: number
  nilai_prestasi: number; nilai_kehadiran: number; nilai_akhir: number; predikat: string
  tahun_ajaran_status?: 'aktif' | 'tutup'
  keterampilan: Array<{ kriteria_id: number; nilai_mentah: number; bobot: number; nama_kriteria: string }>
  prestasi_list?: Array<{ tingkatan: string; nama_kejuaraan: string; peringkat: string; bulan?: number; tanggal_prestasi?: string; bukti_foto?: string; nilai: number }>
  prestasi?:  { tingkatan: string; nama_kejuaraan: string; peringkat: string; bulan?: number; tanggal_prestasi?: string; bukti_foto?: string; nilai: number }
  kehadiran?: { total_hadir: number; total_sesi: number; persentase: number; nilai: number }
  kehadiran_bulanan?: Array<{ bulan: number; tahun: number; total_sesi: number; total_hadir: number }>
}

interface KehadiranBulan {
  bulan: number
  tahun: number
  total_sesi: string
  total_hadir: string
}

const BULAN_NAMES = [
  '', 'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': '#f9a825', 'B (Baik)': '#22c55e',
  'C (Cukup)': '#3b82f6',   'D (Kurang)': '#f59e0b', 'E (Sangat Kurang)': '#ef4444',
}

export default function FormNilaiPage() {
  const { siswaId }         = useParams<{ siswaId: string }>()
  const [searchParams]      = useSearchParams()
  const taId                = Number(searchParams.get('ta') ?? 0)
  const kelasBack           = searchParams.get('kelas') ?? ''
  const navigate            = useNavigate()

  const [siswa, setSiswa]               = useState<SiswaDetail | null>(null)
  const [kriteria, setKriteria]         = useState<KriteriaKeterampilan[]>([])
  const [prestasiOptions, setPrestasiOptions] = useState<SettingPrestasi[]>([])
  const [existing, setExisting]         = useState<ExistingPenilaian | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)

  // Bobot dari pengaturan global (default fallback 50/30/20)
  const [bobot, setBobot] = useState({ keterampilan: 50, prestasi: 30, kehadiran: 20 })

  // Tabel konversi kehadiran (identik dengan setting_kehadiran di backend)
  const [settingKehadiran, setSettingKehadiran] = useState<Array<{
    nilai_min: number; nilai_max: number; nilai_konversi: number
  }>>([])

  // Form state
  const [nilaiKeterampilan, setNilaiKeterampilan] = useState<Record<number, string>>({})
  const [prestasiList, setPrestasiList] = useState<PrestasiEntry[]>([
    { tingkatan: '', nama_kejuaraan: '', nomor_pertandingan: '', predikat_juara: '', tanggal_prestasi: '', bukti_foto: null }
  ])
  // Kehadiran per bulan
  const currentYear = new Date().getFullYear()
  const [kehadiranBulanan, setKehadiranBulanan] = useState<KehadiranBulan[]>([
    { bulan: new Date().getMonth() + 1, tahun: currentYear, total_sesi: '', total_hadir: '' }
  ])
  const [statusPenilaian, setStatusPenilaian] = useState<'draft' | 'final'>('draft')
  const [catatan, setCatatan]      = useState('')

  const load = useCallback(async () => {
    if (!siswaId || !taId) return
    setLoading(true)
    try {
      // Load data siswa
      const sRes = await api.get<ApiResponse<SiswaDetail>>(`/master/siswa.php?id=${siswaId}`)
      const s = sRes.data
      if (!s) return
      setSiswa(s)

      // Load kriteria sesuai cabor
      const kRes = await api.get<ApiResponse<{ kriteria: KriteriaKeterampilan[] }>>(
        `/master/kriteria.php?cabang_olahraga_id=${s.cabang_olahraga_id}`
      )
      const kriteriaList = kRes.data?.kriteria ?? []
      setKriteria(kriteriaList)

      // Init nilai keterampilan
      const initNilai: Record<number, string> = {}
      kriteriaList.forEach(k => { initNilai[k.id] = '' })
      setNilaiKeterampilan(initNilai)

      // Load setting prestasi
      const pRes = await api.get<ApiResponse<SettingPrestasi[]>>('/settings/prestasi.php')
      setPrestasiOptions(pRes.data ?? [])

      // Load bobot komponen utama dari pengaturan global
      try {
        const bRes = await api.get<ApiResponse<{ bobot_keterampilan: number; bobot_prestasi: number; bobot_kehadiran: number }>>('/settings/bobot.php')
        if (bRes.data) {
          setBobot({
            keterampilan: parseFloat(String(bRes.data.bobot_keterampilan)) || 50,
            prestasi:     parseFloat(String(bRes.data.bobot_prestasi))     || 30,
            kehadiran:    parseFloat(String(bRes.data.bobot_kehadiran))    || 20,
          })
        }
      } catch { /* gunakan default 50/30/20 */ }

      // Load tabel konversi kehadiran (agar estimasi frontend = backend)
      try {
        const khRes = await api.get<ApiResponse<Array<{ nilai_min: number; nilai_max: number; nilai_konversi: number }>>>('/settings/kehadiran.php')
        if (khRes.data && Array.isArray(khRes.data)) {
          setSettingKehadiran(khRes.data.map(r => ({
            nilai_min:      parseFloat(String(r.nilai_min)),
            nilai_max:      parseFloat(String(r.nilai_max)),
            nilai_konversi: parseFloat(String(r.nilai_konversi)),
          })))
        }
      } catch { /* gunakan persentase mentah sebagai fallback */ }

      // Load penilaian yang sudah ada
      try {
        const eRes = await api.get<ApiResponse<ExistingPenilaian>>(
          `/penilaian/input.php?siswa_id=${siswaId}&tahun_ajaran_id=${taId}`
        )
        if (eRes.data) {
          const e = eRes.data
          setExisting(e)
          setStatusPenilaian(e.status as 'draft' | 'final')
          setCatatan(e.catatan ?? '')

          // Fill keterampilan
          const kMap: Record<number, string> = {}
          e.keterampilan?.forEach(kd => { kMap[kd.kriteria_id] = String(kd.nilai_mentah) })
          setNilaiKeterampilan(kMap)

          // Fill prestasi — dukung multi
          const srcList = e.prestasi_list?.length ? e.prestasi_list
            : e.prestasi ? [e.prestasi] : []
          if (srcList.length > 0) {
            setPrestasiList(srcList.map(pr => ({
              tingkatan:           pr.tingkatan ?? '',
              nama_kejuaraan:      pr.nama_kejuaraan ?? '',
              nomor_pertandingan:  (pr as any).nomor_pertandingan ?? '',
              predikat_juara:      pr.peringkat ?? '',
              tanggal_prestasi:    pr.tanggal_prestasi
                ? pr.tanggal_prestasi
                : pr.bulan
                  ? `2024-${String(pr.bulan).padStart(2, '0')}-01`
                  : '',
              bukti_foto:          null,
              existing_bukti_foto: pr.bukti_foto,
            })))
          }

          // Fill kehadiran — format baru per bulan
          if (e.kehadiran_bulanan && e.kehadiran_bulanan.length > 0) {
            setKehadiranBulanan(e.kehadiran_bulanan.map(kb => ({
              bulan:       kb.bulan,
              tahun:       kb.tahun,
              total_sesi:  String(kb.total_sesi),
              total_hadir: String(kb.total_hadir),
            })))
          } else if (e.kehadiran) {
            // Backward compat: data lama hanya punya total, jadikan 1 baris
            setKehadiranBulanan([{
              bulan:       new Date().getMonth() + 1,
              tahun:       currentYear,
              total_sesi:  String(e.kehadiran.total_sesi),
              total_hadir: String(e.kehadiran.total_hadir),
            }])
          }
        }
      } catch { /* belum ada penilaian */ }

    } catch { } finally { setLoading(false) }
  }, [siswaId, taId])

  useEffect(() => { load() }, [load])

  // ── Real-time Calculation ──────────────────────────────────
  // CATATAN: MySQL DECIMAL dikirim PHP sebagai string → harus di-parse ke number
  const hitungKeterampilan = () => {
    return kriteria.reduce((sum, k) => {
      const val   = parseFloat(nilaiKeterampilan[k.id] || '0') || 0
      const bobot = parseFloat(String(k.bobot)) || 0   // bobot bisa string dari API
      return sum + (val * (bobot / 100))
    }, 0)
  }

  const nilaiKetTotal = hitungKeterampilan()

  // Nilai prestasi = MAX dari semua kejuaraan yang diisi
  const nilaiPrestasiVal = Math.max(
    0,
    ...prestasiList.map(p => {
      const opt = prestasiOptions.find(o => o.tingkatan === p.tingkatan)
      return parseFloat(String(opt?.nilai ?? 0)) || 0
    })
  )

  // Total kehadiran = SUM dari semua baris bulan
  const totalPertemuan = kehadiranBulanan.reduce((s, kb) => s + (parseInt(kb.total_sesi) || 0), 0)
  const totalHadir     = kehadiranBulanan.reduce((s, kb) => s + (parseInt(kb.total_hadir) || 0), 0)
  const persenHadir    = totalPertemuan > 0 ? (totalHadir / totalPertemuan) * 100 : 0

  // Konversi persentase kehadiran → nilai (identik dengan hitungNilaiKehadiran() di backend PHP)
  const hitungNilaiKehadiranFE = (persen: number): number => {
    if (settingKehadiran.length === 0) return persen  // fallback: gunakan persentase mentah
    const row = settingKehadiran.find(r => persen >= r.nilai_min && persen <= r.nilai_max)
    return row ? row.nilai_konversi : 0
  }
  const nilaiKehadiranEstimasi = hitungNilaiKehadiranFE(persenHadir)

  // Estimasi nilai akhir — menggunakan nilai konversi kehadiran, bukan persentase mentah
  const estimasi = nilaiKetTotal * (bobot.keterampilan / 100)
    + nilaiPrestasiVal * (bobot.prestasi / 100)
    + nilaiKehadiranEstimasi * (bobot.kehadiran / 100)

  const getPredikat = (n: number) => {
    if (n >= 90) return 'A (Istimewa)'
    if (n >= 80) return 'B (Baik)'
    if (n >= 70) return 'C (Cukup)'
    if (n >= 60) return 'D (Kurang)'
    return 'E (Sangat Kurang)'
  }

  const allKriteriaFilled = kriteria.every(k => {
    const v = parseFloat(nilaiKeterampilan[k.id] ?? '')
    return !isNaN(v) && v >= 0 && v <= 100
  })

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allKriteriaFilled) { setSaveError('Semua nilai keterampilan wajib diisi (0-100).'); return }
    if (prestasiList.some(p => !p.tingkatan)) {
      setSaveError('Pilih tingkatan kejuaraan untuk setiap entri prestasi.'); return
    }
    if (kehadiranBulanan.length === 0) {
      setSaveError('Minimal satu bulan kehadiran wajib diisi.'); return
    }
    if (kehadiranBulanan.some(kb => !kb.total_sesi || !kb.total_hadir)) {
      setSaveError('Isi total sesi dan jumlah hadir untuk setiap bulan.'); return
    }
    if (kehadiranBulanan.some(kb => parseInt(kb.total_hadir) > parseInt(kb.total_sesi))) {
      setSaveError('Jumlah hadir tidak boleh melebihi total sesi pada salah satu bulan.'); return
    }

    setSaving(true); setSaveError(null)
    try {
      const keterampilanPayload = kriteria.map(k => ({
        kriteria_id: k.id,
        nilai: parseFloat(nilaiKeterampilan[k.id] || '0'),
      }))

      // Payload multi-prestasi
      const prestasiPayload = prestasiList.map(p => ({
        tingkatan:            p.tingkatan,
        nama_kejuaraan:       p.nama_kejuaraan,
        nomor_pertandingan:   p.nomor_pertandingan,
        predikat_juara:       p.predikat_juara,
        tanggal_prestasi:     p.tanggal_prestasi || null,
      }))

      const kehadiranBulananPayload = kehadiranBulanan.map(kb => ({
        bulan:       kb.bulan,
        tahun:       kb.tahun,
        total_sesi:  parseInt(kb.total_sesi) || 0,
        total_hadir: parseInt(kb.total_hadir) || 0,
      }))

      const hasFile = prestasiList.some(p => p.bukti_foto !== null)
      let response

      if (hasFile) {
        const fd = new FormData()
        fd.append('siswa_id',            String(siswaId))
        fd.append('tahun_ajaran_id',     String(taId))
        fd.append('status',              statusPenilaian)
        fd.append('catatan',             catatan)
        fd.append('keterampilan',        JSON.stringify(keterampilanPayload))
        fd.append('prestasi_list',       JSON.stringify(prestasiPayload))
        fd.append('kehadiran_bulanan',   JSON.stringify(kehadiranBulananPayload))
        prestasiList.forEach((p, i) => {
          if (p.bukti_foto) fd.append(`bukti_foto_${i}`, p.bukti_foto)
        })

        const token = localStorage.getItem('smanko_token')
        const res = await fetch('/api/penilaian/input.php', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token ?? ''}` },
          body: fd,
        })
        response = await res.json()
        if (response.status === 'error') throw new Error(response.message)
      } else {
        response = await api.post('/penilaian/input.php', {
          siswa_id:           Number(siswaId),
          tahun_ajaran_id:    taId,
          status:             statusPenilaian,
          catatan,
          keterampilan:       keterampilanPayload,
          prestasi_list:      prestasiPayload,
          kehadiran_bulanan:  kehadiranBulananPayload,
        })
      }

      // Tampilkan success popup modal
      setSuccessResult({
        nama_siswa: siswa?.nama ?? '',
        nilai_akhir: response.data?.nilai_akhir ?? '-',
        predikat: response.data?.predikat ?? '-',
        status: statusPenilaian,
      })

    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Layout title="Form Penilaian">
      <div className="flex-center" style={{ padding: 80 }}><div className="spinner spinner-lg" /></div>
    </Layout>
  )

  if (!siswa) return (
    <Layout title="Form Penilaian">
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p>Data siswa tidak ditemukan.</p>
      </div>
    </Layout>
  )

  const estimasiPredikat = getPredikat(estimasi)
  const isReadOnly = existing?.status === 'final' || existing?.tahun_ajaran_status === 'tutup'

  return (
    <>
      <Layout title={`Nilai – ${siswa.nama}`}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-4)' }}
        onClick={() => navigate(`/guru/kelas/${kelasBack}?ta=${taId}`)}>
        <ChevronLeft size={16} /> Kembali ke Daftar Siswa
      </button>

      {isReadOnly && (
        <div style={{
          background: 'var(--clr-warning-bg)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-5)',
          marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.875rem', color: 'var(--clr-warning)'
        }}>
          <AlertCircle size={16} />
          Penilaian ini sudah <strong>FINAL</strong>. Hanya Admin yang dapat mengubahnya.
        </div>
      )}

      <div className="form-nilai-grid">

        {/* ── Left: Form ── */}
        <form onSubmit={handleSubmit} className="form-nilai-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          {/* Identitas Siswa — dengan background image */}
          <div style={{
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
            position: 'relative', minHeight: 120,
            boxShadow: '0 6px 24px rgba(11,45,107,0.18)',
          }}>
            {/* Background image */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/student-profile-bg.jpg)',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            {/* Overlay - Lebih transparan agar gambar terlihat */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(100deg, rgba(11,45,107,0.75) 0%, rgba(11,45,107,0.50) 50%, rgba(11,45,107,0.20) 100%)',
            }} />
            {/* Left red accent */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
              background: 'linear-gradient(180deg, #c1272d, #e85d2f)',
            }} />

            {/* Content */}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
              padding: 'var(--sp-5) var(--sp-5) var(--sp-5) calc(var(--sp-5) + 4px)',
            }}>
              {/* Avatar */}
              <div style={{
                width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
                background: siswa.jenis_kelamin === 'L'
                  ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                  : 'linear-gradient(135deg,#ec4899,#be185d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 800, color: '#fff',
                border: '3px solid rgba(255,255,255,0.35)',
                boxShadow: siswa.jenis_kelamin === 'L'
                  ? '0 0 0 4px rgba(59,130,246,0.25), 0 4px 16px rgba(0,0,0,0.3)'
                  : '0 0 0 4px rgba(236,72,153,0.25), 0 4px 16px rgba(0,0,0,0.3)',
              }}>
                {siswa.nama.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: 4, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                  {siswa.nama}
                </h2>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-full)', padding: '2px 10px',
                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600,
                  }}>
                    <GraduationCap size={11} /> NISN: {siswa.nisn}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-full)', padding: '2px 10px',
                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600,
                  }}>
                    <GraduationCap size={11} /> NIS: {siswa.nis}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(30,110,200,0.3)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(30,110,200,0.4)',
                    borderRadius: 'var(--r-full)', padding: '2px 10px',
                    fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700,
                  }}>
                    {siswa.kelas}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(17,85,168,0.35)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-full)', padding: '2px 10px',
                    fontSize: '0.72rem', color: '#bfdbfe', fontWeight: 600,
                  }}>
                    <Dumbbell size={11} /> {siswa.nama_cabang}
                  </span>
                  {existing && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: existing.status === 'final' ? 'rgba(22,163,74,0.25)' : 'rgba(217,119,6,0.25)',
                      border: `1px solid ${existing.status === 'final' ? 'rgba(22,163,74,0.4)' : 'rgba(217,119,6,0.4)'}`,
                      borderRadius: 'var(--r-full)', padding: '2px 10px',
                      fontSize: '0.72rem',
                      color: existing.status === 'final' ? '#86efac' : '#fcd34d',
                      fontWeight: 700,
                    }}>
                      {existing.status === 'final' ? '✓ Final' : '📝 Draft'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 1: Keterampilan ── */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dumbbell size={18} style={{ color: 'var(--clr-primary-2)' }} />
                Keterampilan Olahraga – {siswa.nama_cabang}
              </h3>
              <span className="badge badge-neutral">Wajib 0–100</span>
            </div>

            {kriteria.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--clr-text-3)' }}>
                Belum ada kriteria untuk cabang ini. Hubungi Admin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {kriteria.map(k => {
                  const val    = parseFloat(nilaiKeterampilan[k.id] ?? '') || 0
                  const bobot  = parseFloat(String(k.bobot)) || 0
                  const berbobot = val * (bobot / 100)
                  return (
                    <div key={k.id} style={{
                      background: 'var(--clr-bg-3)', borderRadius: 'var(--r-md)',
                      border: '1px solid var(--clr-border)', padding: 'var(--sp-4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{k.nama}</strong>
                          <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                            Bobot {k.bobot}%
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--clr-text-3)' }}>
                          Kontribusi: <strong style={{ color: 'var(--clr-primary-2)' }}>{berbobot.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        <input
                          type="number" min="0" max="100" step="0.01"
                          className="form-control"
                          style={{ maxWidth: 120 }}
                          placeholder="0 – 100"
                          value={nilaiKeterampilan[k.id] ?? ''}
                          onChange={e => setNilaiKeterampilan(prev => ({ ...prev, [k.id]: e.target.value }))}
                          disabled={isReadOnly}
                          required
                        />
                        <div style={{ flex: 1 }}>
                          <div className="progress-bar-wrapper">
                            <div className="progress-bar ok" style={{ width: `${Math.min(100, val)}%` }} />
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{val}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Subtotal Keterampilan */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--sp-3) var(--sp-4)', background: 'var(--clr-primary-bg)',
                  borderRadius: 'var(--r-md)', border: '1px solid rgba(232,93,47,0.3)',
                }}>
                  <strong>Total Nilai Keterampilan</strong>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--clr-primary-2)' }}>
                    {nilaiKetTotal.toFixed(2)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: Multi-Prestasi ── */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} style={{ color: 'var(--clr-accent)' }} />
                Prestasi Olahraga
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginLeft: 4 }}>
                  {prestasiList.length} Kejuaraan
                </span>
              </h3>
              {!isReadOnly && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPrestasiList(list => [
                    ...list,
                    { tingkatan: '', nama_kejuaraan: '', nomor_pertandingan: '', predikat_juara: '', tanggal_prestasi: '', bukti_foto: null }
                  ])}
                >
                  <Plus size={14} /> Tambah Kejuaraan
                </button>
              )}
            </div>

            {/* Info banner ketika ada lebih dari 1 kejuaraan */}
            {prestasiList.length > 1 && (
              <div style={{
                padding: 'var(--sp-3) var(--sp-4)',
                background: 'var(--clr-info-bg)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 'var(--r-md)',
                marginBottom: 'var(--sp-4)',
                fontSize: '0.82rem',
                color: 'var(--clr-info)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Trophy size={14} />
                <span>
                  Nilai yang digunakan untuk skoring = <strong>nilai kejuaraan tertinggi</strong>{' '}
                  dari {prestasiList.length} kejuaraan yang terdaftar.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {prestasiList.map((p, idx) => {
                const opt      = prestasiOptions.find(o => o.tingkatan === p.tingkatan)
                const nilaiOpt = parseFloat(String(opt?.nilai ?? 0)) || 0
                const isTop    = prestasiList.length > 1 && nilaiOpt > 0 && nilaiOpt === nilaiPrestasiVal

                return (
                  <div key={idx} style={{
                    border: `1px solid ${isTop ? 'rgba(249,168,37,0.5)' : 'var(--clr-border)'}`,
                    borderRadius: 'var(--r-md)',
                    background: isTop ? 'rgba(249,168,37,0.05)' : 'var(--clr-bg-3)',
                    padding: 'var(--sp-4)',
                  }}>
                    {/* Entry header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isTop ? '#f9a825' : 'var(--clr-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isTop ? '🏆' : '🎖️'} Kejuaraan #{idx + 1}
                        {isTop && <span className="badge" style={{ background: 'rgba(249,168,37,0.15)', color: '#f9a825', fontSize: '0.68rem' }}>Nilai Tertinggi</span>}
                      </span>
                      {!isReadOnly && prestasiList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPrestasiList(list => list.filter((_, i) => i !== idx))}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--r-sm)', padding: '3px 10px',
                            color: 'var(--clr-danger)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem',
                          }}
                        >
                          <X size={12} /> Hapus
                        </button>
                      )}
                    </div>

                    {/* Nama Kejuaraan — tampil di atas Tingkatan, hilang jika "Tidak Ada Prestasi" */}
                    {p.tingkatan !== 'Tidak Ada Prestasi' && (
                      <div className="form-group">
                        <label className="form-label">Nama Kejuaraan</label>
                        <input className="form-control" placeholder="Contoh: POPDA 2025" disabled={isReadOnly}
                          value={p.nama_kejuaraan}
                          onChange={e => setPrestasiList(list => list.map((item, i) =>
                            i === idx ? { ...item, nama_kejuaraan: e.target.value } : item
                          ))} />
                      </div>
                    )}

                    {/* Tingkatan — selalu tampil */}
                    <div className="form-group">
                      <label className="form-label">Tingkatan Kejuaraan <span className="required">*</span></label>
                      <select className="form-control" value={p.tingkatan} disabled={isReadOnly} required
                        onChange={e => setPrestasiList(list => list.map((item, i) =>
                          i === idx ? { ...item, tingkatan: e.target.value, nama_kejuaraan: e.target.value === 'Tidak Ada Prestasi' ? '' : item.nama_kejuaraan, nomor_pertandingan: e.target.value === 'Tidak Ada Prestasi' ? '' : item.nomor_pertandingan } : item
                        ))}
                      >
                        <option value="">-- Pilih Tingkatan --</option>
                        {prestasiOptions.map(po => (
                          <option key={po.id} value={po.tingkatan}>
                            {po.tingkatan} (Nilai: {po.nilai})
                          </option>
                        ))}
                      </select>
                      {p.tingkatan && opt && (
                        <div style={{
                          marginTop: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)',
                          background: isTop ? 'rgba(249,168,37,0.12)' : 'var(--clr-accent-bg)',
                          borderRadius: 'var(--r-sm)', fontSize: '0.8rem',
                          color: isTop ? '#f9a825' : 'var(--clr-accent)',
                        }}>
                          {isTop ? '⭐ Digunakan untuk skoring: ' : '✓ Nilai: '}
                          <strong>{opt.nilai}</strong>
                        </div>
                      )}
                    </div>

                    {/* Nomor Pertandingan — tampil di bawah Tingkatan, jika bukan "Tidak Ada Prestasi" */}
                    {p.tingkatan && p.tingkatan !== 'Tidak Ada Prestasi' && (
                      <div className="form-group">
                        <label className="form-label">Nomor Pertandingan / Spesialisasi</label>
                        <input className="form-control" placeholder="Contoh: Striker, Tunggal Putra, dll" disabled={isReadOnly}
                          value={p.nomor_pertandingan}
                          onChange={e => setPrestasiList(list => list.map((item, i) =>
                            i === idx ? { ...item, nomor_pertandingan: e.target.value } : item
                          ))} />
                      </div>
                    )}

                    {/* Detail kejuaraan & bukti — tampil jika bukan Tidak Ada Prestasi */}
                    {p.tingkatan && p.tingkatan !== 'Tidak Ada Prestasi' && (
                      <>
                        <div className="form-row">
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Tanggal Pelaksanaan</label>
                            <input
                              type="date"
                              className="form-control"
                              disabled={isReadOnly}
                              value={p.tanggal_prestasi}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={e => setPrestasiList(list => list.map((item, i) =>
                                i === idx ? { ...item, tanggal_prestasi: e.target.value } : item
                              ))}
                            />
                            {p.tanggal_prestasi && (
                              <div style={{
                                marginTop: 4, fontSize: '0.75rem',
                                color: 'var(--clr-text-3)',
                              }}>
                                📅 {new Date(p.tanggal_prestasi + 'T00:00:00').toLocaleDateString('id-ID', {
                                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Predikat / Juara</label>
                            <input className="form-control" placeholder="Contoh: Juara 1" disabled={isReadOnly}
                              value={p.predikat_juara}
                              onChange={e => setPrestasiList(list => list.map((item, i) =>
                                i === idx ? { ...item, predikat_juara: e.target.value } : item
                              ))} />
                          </div>
                        </div>

                        {/* Bukti Sertifikat */}
                        <div className="form-group">
                          <label className="form-label">Bukti Sertifikat / Foto</label>

                          {/* Preview file baru yang dipilih */}
                          {p.bukti_foto && (
                            <div style={{ position: 'relative', marginBottom: 'var(--sp-3)', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--clr-success)', background: 'var(--clr-bg-3)' }}>
                              {p.bukti_foto.type.startsWith('image/') ? (
                                <img src={URL.createObjectURL(p.bukti_foto)} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block' }} />
                              ) : (
                                <div style={{ padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: '2rem' }}>📄</span>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.bukti_foto.name}</div>
                                </div>
                              )}
                              <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(34,197,94,0.9)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)' }}>Baru dipilih</div>
                              <button type="button"
                                onClick={() => setPrestasiList(list => list.map((item, i) => i === idx ? { ...item, bukti_foto: null } : item))}
                                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                              ><X size={14} /></button>
                            </div>
                          )}

                          {/* Preview file yang sudah tersimpan */}
                          {!p.bukti_foto && p.existing_bukti_foto && (
                            <div style={{ marginBottom: 'var(--sp-3)', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--clr-border-2)', background: 'var(--clr-bg-3)' }}>
                              {p.existing_bukti_foto.match(/\.(jpg|jpeg|png)$/i) ? (
                                <a href={`/api/${p.existing_bukti_foto}`} target="_blank" rel="noopener noreferrer">
                                  <img src={`/api/${p.existing_bukti_foto}`} alt="Bukti" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block' }} />
                                </a>
                              ) : (
                                <a href={`/api/${p.existing_bukti_foto}`} target="_blank" rel="noopener noreferrer" style={{ padding: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--clr-text)' }}>
                                  <span style={{ fontSize: '2rem' }}>📄</span>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Bukti PDF tersimpan</div>
                                </a>
                              )}
                              <div style={{ padding: 'var(--sp-2) var(--sp-3)', borderTop: '1px solid var(--clr-border)', fontSize: '0.75rem', color: 'var(--clr-text-3)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>📎 Bukti tersimpan di server</span>
                                <span style={{ color: 'var(--clr-success)' }}>✓ Aktif</span>
                              </div>
                            </div>
                          )}

                          {/* Drop zone */}
                          <div
                            style={{ border: '2px dashed var(--clr-border)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', textAlign: 'center', cursor: isReadOnly ? 'not-allowed' : 'pointer', background: p.bukti_foto ? 'var(--clr-success-bg)' : 'var(--clr-bg-3)' }}
                            onClick={() => !isReadOnly && document.getElementById(`bukti-input-${idx}`)?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault()
                              const f = e.dataTransfer.files[0]
                              if (!isReadOnly && f) setPrestasiList(list => list.map((item, i) => i === idx ? { ...item, bukti_foto: f } : item))
                            }}
                          >
                            <Upload size={20} style={{ margin: '0 auto 6px', color: 'var(--clr-text-4)' }} />
                            <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-3)' }}>
                              {p.existing_bukti_foto && !p.bukti_foto ? 'Klik untuk ganti file bukti' : 'Drag & drop atau klik untuk pilih file'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-4)', marginTop: 3 }}>JPG, PNG, PDF – Maks. 2 MB</div>
                          </div>
                          <input
                            id={`bukti-input-${idx}`}
                            type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) setPrestasiList(list => list.map((item, i) => i === idx ? { ...item, bukti_foto: f } : item))
                              e.target.value = ''
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── SECTION 3: Kehadiran Per Bulan ── */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardCheck size={18} style={{ color: 'var(--clr-success)' }} />
                Kehadiran Latihan
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginLeft: 4 }}>
                  {kehadiranBulanan.length} Bulan
                </span>
              </h3>
              {!isReadOnly && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setKehadiranBulanan(prev => [
                    ...prev,
                    { bulan: new Date().getMonth() + 1, tahun: currentYear, total_sesi: '', total_hadir: '' }
                  ])}
                >
                  <Plus size={14} /> Tambah Bulan
                </button>
              )}
            </div>

            {/* Tabel per bulan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {kehadiranBulanan.map((kb, idx) => {
                const sesi  = parseInt(kb.total_sesi)  || 0
                const hadir = parseInt(kb.total_hadir) || 0
                const pct   = sesi > 0 ? Math.round((hadir / sesi) * 100) : 0
                const isErr = hadir > sesi && sesi > 0
                return (
                  <div key={idx} style={{
                    background: isErr ? 'rgba(239,68,68,0.04)' : 'var(--clr-bg-3)',
                    border: `1px solid ${isErr ? 'rgba(239,68,68,0.35)' : 'var(--clr-border)'}`,
                    borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)',
                  }}>
                    {/* Row header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--clr-text-2)' }}>
                        📅 {BULAN_NAMES[kb.bulan]} {kb.tahun}
                        {sesi > 0 && (
                          <span style={{
                            marginLeft: 8, fontSize: '0.72rem', fontWeight: 600,
                            color: pct >= 75 ? 'var(--clr-success)' : 'var(--clr-warning)',
                          }}>{pct}%</span>
                        )}
                      </span>
                      {!isReadOnly && kehadiranBulanan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setKehadiranBulanan(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--r-sm)', padding: '2px 8px',
                            color: 'var(--clr-danger)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem',
                          }}
                        >
                          <X size={11} /> Hapus
                        </button>
                      )}
                    </div>

                    {/* Input row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 1fr', gap: 'var(--sp-3)' }}>
                      {/* Bulan */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Bulan</label>
                        <select
                          className="form-control"
                          disabled={isReadOnly}
                          value={kb.bulan}
                          onChange={e => setKehadiranBulanan(prev => prev.map((item, i) =>
                            i === idx ? { ...item, bulan: Number(e.target.value) } : item
                          ))}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{BULAN_NAMES[m]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tahun */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Tahun</label>
                        <input
                          type="number" className="form-control" min="2020" max="2099"
                          disabled={isReadOnly}
                          value={kb.tahun}
                          onChange={e => setKehadiranBulanan(prev => prev.map((item, i) =>
                            i === idx ? { ...item, tahun: Number(e.target.value) } : item
                          ))}
                        />
                      </div>

                      {/* Total Sesi */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Total Sesi <span className="required">*</span></label>
                        <input
                          type="number" className="form-control" min="0" placeholder="Contoh: 10"
                          disabled={isReadOnly}
                          value={kb.total_sesi}
                          onChange={e => setKehadiranBulanan(prev => prev.map((item, i) =>
                            i === idx ? { ...item, total_sesi: e.target.value } : item
                          ))}
                        />
                      </div>

                      {/* Hadir */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Hadir <span className="required">*</span></label>
                        <input
                          type="number" className="form-control" min="0" placeholder="Contoh: 8"
                          disabled={isReadOnly}
                          value={kb.total_hadir}
                          style={{ borderColor: isErr ? 'var(--clr-danger)' : undefined }}
                          onChange={e => setKehadiranBulanan(prev => prev.map((item, i) =>
                            i === idx ? { ...item, total_hadir: e.target.value } : item
                          ))}
                        />
                      </div>
                    </div>

                    {/* Progress bar per bulan */}
                    {sesi > 0 && (
                      <div style={{ marginTop: 'var(--sp-2)' }}>
                        <div className="progress-bar-wrapper">
                          <div
                            className={`progress-bar ${pct >= 75 ? 'ok' : pct >= 50 ? 'warning' : 'danger'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        {isErr && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--clr-danger)', marginTop: 4 }}>
                            ⚠ Hadir ({hadir}) melebihi sesi ({sesi})!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Total Agregat */}
            {totalPertemuan > 0 && (
              <div style={{
                marginTop: 'var(--sp-3)',
                padding: 'var(--sp-4)', background: 'var(--clr-primary-bg)',
                borderRadius: 'var(--r-md)', border: '1px solid rgba(17,85,168,0.2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: '0.85rem' }}>
                  <strong>Total Kehadiran (semua bulan)</strong>
                  <strong style={{ color: persenHadir >= 75 ? 'var(--clr-success)' : 'var(--clr-warning)' }}>
                    {persenHadir.toFixed(1)}%
                  </strong>
                </div>
                <div className="progress-bar-wrapper">
                  <div className={`progress-bar ${persenHadir >= 75 ? 'ok' : persenHadir >= 50 ? 'warning' : 'danger'}`}
                    style={{ width: `${persenHadir}%` }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 6, display: 'flex', gap: 16 }}>
                  <span>📊 <strong>{totalHadir}</strong> hadir dari <strong>{totalPertemuan}</strong> total sesi</span>
                  <span>📅 <strong>{kehadiranBulanan.length}</strong> bulan latihan</span>
                </div>
              </div>
            )}
          </div>

          {/* Catatan */}
          <div className="card">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catatan Guru (Opsional)</label>
              <textarea className="form-control" rows={3} disabled={isReadOnly}
                placeholder="Catatan tambahan mengenai perkembangan siswa..."
                value={catatan} onChange={e => setCatatan(e.target.value)} />
            </div>
          </div>

          {/* Status & Submit */}
          {!isReadOnly && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status Penilaian</label>
                  <select className="form-control" value={statusPenilaian}
                    onChange={e => setStatusPenilaian(e.target.value as 'draft' | 'final')}>
                    <option value="draft">📝 Draft (bisa diedit lagi)</option>
                    <option value="final">✅ Final (tidak bisa diubah)</option>
                  </select>
                  <div className="form-help">
                    {statusPenilaian === 'final'
                      ? '⚠️ Setelah Final, hanya Admin yang dapat mengubah.'
                      : 'Simpan sebagai draft untuk dilengkapi nanti.'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                    {saving ? <><span className="spinner" /> Menyimpan...</> : <><Save size={16} /> Simpan Penilaian</>}
                  </button>
                </div>
              </div>

              {/* Pesan error simpan */}
              {saveError && (
                <div style={{
                  marginTop: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)',
                  borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--clr-danger-bg)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--clr-danger)', fontSize: '0.875rem',
                }}>
                  <AlertCircle size={16} />
                  {saveError}
                </div>
              )}
            </div>
          )}
        </form>

        {/* ── Right: Live Preview (Desktop only) ── */}
        <div className="form-nilai-right" style={{ position: 'sticky', top: 'calc(var(--header-h) + 16px)' }}>
          {/* Estimasi Nilai Akhir — dengan background image */}
          <div style={{
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(11,45,107,0.25)',
            border: '1.5px solid rgba(17,85,168,0.25)',
          }}>
            {/* Background image */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/score-analytics-bg.jpg)',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            {/* Overlay - Lebih transparan agar gambar terlihat */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, rgba(11,45,107,0.80) 0%, rgba(11,45,107,0.60) 100%)',
            }} />
            {/* Top red accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: 'linear-gradient(90deg, #c1272d, #1155a8, #c1272d)',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, padding: 'var(--sp-5)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(30,110,200,0.25)',
                  border: '1.5px solid rgba(30,110,200,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Eye size={15} style={{ color: '#93c5fd' }} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Estimasi Nilai Akhir</h3>
              </div>

              {/* Big Score */}
              <div style={{ textAlign: 'center', padding: 'var(--sp-4) 0' }}>
                {/* Ring decoration */}
                <div style={{
                  width: 110, height: 110, borderRadius: '50%', margin: '0 auto var(--sp-3)',
                  border: `4px solid ${PREDIKAT_COLOR[estimasiPredikat] || '#93c5fd'}50`,
                  boxShadow: `0 0 32px ${PREDIKAT_COLOR[estimasiPredikat] || '#93c5fd'}30`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle, ${PREDIKAT_COLOR[estimasiPredikat] || '#3b82f6'}12 0%, transparent 70%)`,
                }}>
                  <div style={{
                    fontSize: '2.6rem', fontWeight: 900, lineHeight: 1,
                    color: PREDIKAT_COLOR[estimasiPredikat] || '#ffffff',
                    fontFamily: 'var(--font-heading)',
                    textShadow: `0 0 24px ${PREDIKAT_COLOR[estimasiPredikat]}60`,
                  }}>
                    {estimasi.toFixed(1)}
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: PREDIKAT_COLOR[estimasiPredikat] || '#93c5fd' }}>
                  {estimasiPredikat}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  *estimasi berdasarkan bobot {bobot.keterampilan}/{bobot.prestasi}/{bobot.kehadiran}
                </div>
              </div>

              {/* Breakdown bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {[
                  { label: 'Keterampilan', value: nilaiKetTotal,   color: '#60a5fa', pct: bobot.keterampilan },
                  { label: `Prestasi${prestasiList.length > 1 ? ` (×${prestasiList.length})` : ''}`, value: nilaiPrestasiVal, color: '#f87171', pct: bobot.prestasi },
                  { label: 'Kehadiran',    value: nilaiKehadiranEstimasi, color: '#4ade80', pct: bobot.kehadiran },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 'var(--r-md)',
                    padding: 'var(--sp-3)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>{item.label} ({item.pct}%)</span>
                      <strong style={{ color: item.color }}>
                        {item.value.toFixed(2)}
                      </strong>
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--r-full)',
                      height: 6, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 'var(--r-full)',
                        background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                        width: `${Math.min(100, item.value)}%`,
                        transition: 'width 0.4s ease',
                        boxShadow: `0 0 8px ${item.color}60`,
                      }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                      Kontribusi: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{(item.value * item.pct / 100).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Predikat reference */}
              <div style={{ marginTop: 'var(--sp-4)', borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 'var(--sp-4)' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginBottom: 'var(--sp-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TABEL PREDIKAT</div>
              {[
                  ['A (Istimewa)', '≥ 90', '#f9a825'],
                  ['B (Baik)',     '80–89', '#22c55e'],
                  ['C (Cukup)',    '70–79', '#60a5fa'],
                  ['D (Kurang)',   '60–69', '#fbbf24'],
                  ['E (Kurang)',   '< 60',  '#f87171'],
                ].map(([p, r, c]) => (
                  <div key={p} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '4px 6px', fontSize: '0.73rem',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: estimasiPredikat === p ? `${c}20` : 'transparent',
                    borderRadius: 4,
                  }}>
                    <span style={{ color: estimasiPredikat === p ? c : 'rgba(255,255,255,0.55)', fontWeight: estimasiPredikat === p ? 700 : 400 }}>
                      {estimasiPredikat === p ? '▶ ' : ''}{p}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </Layout>

    {/* ── Sticky Bottom Bar (Mobile Only) — di luar Layout agar position:fixed tidak diblokir ── */}
    <div className="sticky-estimasi-bar">
      {/* Score section */}
      <div className="sticky-estimasi-score">
        <div
          className="sticky-estimasi-number"
          style={{ color: PREDIKAT_COLOR[estimasiPredikat] || '#93c5fd' }}
        >
          {estimasi.toFixed(1)}
        </div>
      </div>

      {/* Breakdown mini */}
      <div className="sticky-estimasi-breakdown">
        <div className="sticky-estimasi-item">
          <span className="sticky-estimasi-item-label">Keterampilan</span>
          <span className="sticky-estimasi-item-value" style={{ color: '#60a5fa' }}>
            {nilaiKetTotal.toFixed(1)}
          </span>
        </div>
        <div className="sticky-estimasi-divider" />
        <div className="sticky-estimasi-item">
          <span className="sticky-estimasi-item-label">Prestasi</span>
          <span className="sticky-estimasi-item-value" style={{ color: '#f87171' }}>
            {nilaiPrestasiVal.toFixed(1)}
          </span>
        </div>
        <div className="sticky-estimasi-divider" />
        <div className="sticky-estimasi-item">
          <span className="sticky-estimasi-item-label">Kehadiran</span>
          <span className="sticky-estimasi-item-value" style={{ color: '#4ade80' }}>
            {nilaiKehadiranEstimasi.toFixed(1)}
          </span>
        </div>
      </div>
    </div>

    {/* ── Success Popup Modal (overlay seluruh halaman) ── */}
    {successResult && (
      <SuccessModal
        result={successResult}
        onGo={() => navigate(`/guru/kelas/${kelasBack}?ta=${taId}`)}
      />
    )}
    </>
  )
}
