import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, X, ChevronLeft, ChevronRight, Search, MapPin,
  Phone, Mail, Facebook, Instagram, Youtube, ExternalLink,
  Trophy, Users, Target, Star, Flame, Zap, Shield, Wind,
  Dumbbell, AlertCircle, RefreshCw, ChevronDown, Medal, Images, Eye
} from 'lucide-react'

/* ────────────────────────── TYPES ────────────────────────── */

interface CaborSiswa {
  nama: string
  kelas: string
  jenis_kelamin: string
}

interface CaborItem {
  id: number
  nama: string
  kode: string
  deskripsi: string
  jumlah_siswa: number
  jumlah_kriteria: number
  nama_pelatih: string
  jumlah_penilaian: number
  siswa_list?: CaborSiswa[]
  profil_pelatih?: {
    id: number
    cabang_olahraga_id: number
    nama: string
    foto: string | null
    no_telepon: string | null
    keterangan: string | null
  }[]
}

interface PrestasiItem {
  penilaian_id: number
  nama_kejuaraan: string
  tingkatan: string
  peringkat: string
  bulan: number | null
  nilai_prestasi: number
  bukti_foto: string | null
}

interface KlasemenItem {
  siswa_id: number
  nama_siswa: string
  nis: string
  kelas: string
  jenis_kelamin: string
  cabang_id: number
  nama_cabang: string
  kode_cabang: string
  keterampilan: number
  prestasi: number
  kehadiran: number
  total_skor: number
  predikat: string
  status_penilaian: string
  persen_hadir: number
  tahun_ajaran: string
  semester: number
  prestasi_tingkatan: string
  prestasi_list: PrestasiItem[]
  jumlah_prestasi: number
  rank: number
  nama_pelatih: string | null
}

interface LandingStats {
  total_siswa: number
  total_cabor: number
  total_pelatih: number
  total_berprestasi: number
}

interface LandingData {
  tahun_ajaran: { id: number; nama: string; semester: number } | null
  cabor: CaborItem[]
  klasemen: KlasemenItem[]
  stats: LandingStats
}

/* ────────────────────────── CONSTANTS ──────────────────────── */

const NAV_LINKS = [
  { id: 'beranda',  label: 'Beranda'  },
  { id: 'cabor',    label: 'Cabor'    },
  { id: 'klasemen', label: 'Klasemen' },
  { id: 'galeri',   label: 'Galeri'   },
  { id: 'lokasi',   label: 'Lokasi'   },
]

const HERO_SLIDES = [
  {
    bg: '/login-bg.jpg',
    headline: 'Cetak Juara Dunia',
    headline2: 'Tanpa Lupakan Akademik',
    sub: 'SMA Negeri Khusus Keberbakatan Olahraga Sulawesi Selatan — tempat di mana prestasi atletik dan keunggulan akademik berjalan beriringan.',
    cta: 'Lihat Cabang Olahraga',
    ctaTarget: 'cabor',
  },
  {
    bg: '/score-analytics-bg.jpg',
    headline: 'Sistem Penilaian',
    headline2: 'Terukur & Transparan',
    sub: 'Setiap perkembangan siswa dicatat secara digital — dari keterampilan teknis hingga prestasi kompetisi nasional dan internasional.',
    cta: 'Masuk Portal',
    ctaTarget: 'login',
  },
  {
    bg: '/dashboard-hero.jpg',
    headline: 'Bergabunglah',
    headline2: 'Bersama Juara Kami',
    sub: 'Siswa berbakat dari seluruh Sulawesi Selatan telah membuktikan diri di pentas nasional dan internasional.',
    cta: 'Lihat Klasemen',
    ctaTarget: 'klasemen',
  },
]

const CABOR_OPTIONS_STATIC = ['Semua']

// Warna & ikon berdasarkan kode/nama cabor
const CABOR_COLOR_MAP: Record<string, string> = {
  'sb':  '#c1272d', 'FUT': '#c1272d', 'sepak': '#c1272d',
  'ren': '#0369a1', 'REN': '#0369a1', 'renang': '#0369a1',
  'atl': '#d97706', 'ATL': '#d97706', 'atletik': '#d97706',
  'bu':  '#16a34a', 'BT':  '#16a34a', 'bulu': '#16a34a', 'bulutangkis': '#16a34a',
  'pan': '#7c3aed', 'PAN': '#7c3aed', 'panahan': '#7c3aed',
  'vol': '#0891b2', 'VOL': '#0891b2', 'voli': '#0891b2',
  'tae': '#be185d', 'TAE': '#be185d', 'taekwondo': '#be185d',
  'gu':  '#0b2d6b', 'GUL': '#0b2d6b', 'gulat': '#0b2d6b',
  'tir': '#b45309', 'MEN': '#b45309', 'tinju': '#b45309',
}

function getCaborColor(cabor: CaborItem): string {
  const kode = cabor.kode?.toLowerCase() ?? ''
  const nama = cabor.nama?.toLowerCase() ?? ''
  for (const [key, color] of Object.entries(CABOR_COLOR_MAP)) {
    if (kode.includes(key.toLowerCase()) || nama.startsWith(key.toLowerCase())) return color
  }
  // Hash dari nama untuk warna konsisten
  let hash = 0
  for (const ch of cabor.nama) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  const PALETTE = ['#c1272d','#0369a1','#d97706','#16a34a','#7c3aed','#0891b2','#be185d','#0b2d6b']
  return PALETTE[Math.abs(hash) % PALETTE.length]
}



function CaborIcon({ cabor }: { cabor: CaborItem }) {
  const [imgError, setImgError] = useState(false)
  const n = cabor.nama.toLowerCase()

  if (!imgError) {
    const filename = n.replace(/\s+/g, '-');
    const imgPath = `/logo-cabor/${filename}.png`;
    return (
      <img 
        src={imgPath} 
        alt={cabor.nama} 
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} 
        onError={() => setImgError(true)} 
      />
    )
  }

  if (n.includes('sepak') || n.includes('futsal')) return <Flame size={34} />
  if (n.includes('renang')) return <Wind size={34} />
  if (n.includes('atletik')) return <Zap size={34} />
  if (n.includes('bulu') || n.includes('badminton')) return <Shield size={34} />
  if (n.includes('panahan')) return <Target size={34} />
  if (n.includes('voli')) return <Star size={34} />
  return <Dumbbell size={34} />
}

const PAGE_SIZE = 10

const AVATAR_COLORS = ['#c1272d','#1155a8','#d97706','#16a34a','#7c3aed','#0891b2','#be185d','#0b2d6b']
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
const avatarInit  = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const getPredikatBadgeStyle = (predikat: string | null | undefined) => {
  const p = predikat ? predikat.trim().toUpperCase() : '';
  let bg = '#fee2e2'; 
  let text = '#991b1b'; 
  let border = '#fecaca';
  let label = predikat || '-';

  if (p.startsWith('A')) {
    bg = '#dcfce7'; 
    text = '#166534'; 
    border = '#bbf7d0';
  } else if (p.startsWith('B')) {
    bg = '#dbeafe'; 
    text = '#1e40af'; 
    border = '#bfdbfe';
  } else if (p.startsWith('C')) {
    bg = '#fef3c7'; 
    text = '#92400e'; 
    border = '#fde68a';
  } else if (p.startsWith('D')) {
    bg = '#ffedd5'; 
    text = '#9a3412'; 
    border = '#fed7aa';
  }

  return { bg, text, border, label };
}

/* ────────────────────────── HELPERS ─────────────────────── */

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/* ════════════════════════════════════════════════════════════
   SKELETON LOADER
   ════════════════════════════════════════════════════════════ */
function Skeleton({ w = '100%', h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #e8eef8 25%, #f5f8ff 50%, #e8eef8 75%)',
      backgroundSize: '200% 100%',
      animation: 'lpSkeletonShimmer 1.5s infinite',
    }} />
  )
}

/* ════════════════════════════════════════════════════════════
   CUSTOM HOOKS
   ════════════════════════════════════════════════════════════ */
function useScrollAnimation(dependencies: any[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-animate-show');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const hiddenElements = document.querySelectorAll('.lp-animate-hidden');
    hiddenElements.forEach(el => observer.observe(el));

    return () => {
      hiddenElements.forEach(el => observer.unobserve(el));
      observer.disconnect();
    };
  }, dependencies);
}


/* ════════════════════════════════════════════════════════════
   CABOR COVERFLOW
   ════════════════════════════════════════════════════════════ */
function CaborCoverflow({ caborList, onSelect }: { caborList: any[], onSelect: (c: any) => void }) {
  const [active, setActive] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!caborList || caborList.length <= 1) return;
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % caborList.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [caborList]);

  const prev = () => setActive(p => (p - 1 + caborList.length) % caborList.length);
  const next = () => setActive(p => (p + 1) % caborList.length);

  if (!caborList || caborList.length === 0) return null;

  return (
    <div className="lp-coverflow-container">
      <button onClick={prev} className="lp-coverflow-btn lp-coverflow-btn-prev" aria-label="Previous">
        <ChevronLeft size={22} />
      </button>
      <button onClick={next} className="lp-coverflow-btn lp-coverflow-btn-next" aria-label="Next">
        <ChevronRight size={22} />
      </button>
      {caborList.map((item, i) => {
        let diff = i - active;
        const half = Math.floor(caborList.length / 2);
        if (diff > half) diff -= caborList.length;
        if (diff < -half) diff += caborList.length;

        let positionClass = 'hidden';
        if (diff === 0) positionClass = 'active';
        else if (diff === -1) positionClass = 'prev-1';
        else if (diff === 1) positionClass = 'next-1';
        else if (diff === -2) positionClass = 'prev-2';
        else if (diff === 2) positionClass = 'next-2';

        const imagePath = `/gambar-cabor/${item.nama.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        const hasImgError = imgErrors[item.nama];

        return (
          <div 
            key={i} 
            className={`lp-coverflow-card ${positionClass}`}
            onClick={() => {
              if (diff === 0) onSelect(item);
              else setActive(i);
            }}
          >
            <div className="lp-coverflow-img-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!hasImgError ? (
                <img 
                  src={imagePath} 
                  alt={item.nama} 
                  className="lp-coverflow-img"
                  onError={() => {
                    setImgErrors(prev => ({ ...prev, [item.nama]: true }));
                  }}
                />
              ) : (
                <div style={{ width: 64, height: 64, color: '#1155a8', opacity: 0.5 }}>
                  <CaborIcon cabor={item} />
                </div>
              )}
            </div>
            <div className="lp-coverflow-info">
              <div className="lp-coverflow-name">{item.nama}</div>
              <div className="lp-coverflow-pelatih">
                {item.profil_pelatih && item.profil_pelatih.length > 0 
                  ? `Pelatih: ${item.profil_pelatih[0].nama}` 
                  : 'Belum ada data pelatih'}
              </div>
              <div className="lp-coverflow-stats">
                <span className="lp-coverflow-badge">
                  <Users size={14} /> {item.jumlah_siswa || 0} Siswa
                </span>
                <span className="lp-coverflow-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <Star size={14} /> {item.profil_pelatih?.length || 0} Pelatih
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COUNTUP ANIMATION
   ════════════════════════════════════════════════════════════ */
function CountUp({ value, suffix = '', duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    const startVal = prevRef.current
    const diff = value - startVal
    if (diff === 0) return
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(startVal + diff * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return <>{display}{suffix}</>
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()

  /* ── Data fetching ── */
  const [data, setData]       = useState<LandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [selectedCaborDetail, setSelectedCaborDetail] = useState<CaborItem | null>(null)
  
  const [modalSearch, setModalSearch] = useState('')
  const [modalClassFilter, setModalClassFilter] = useState('Semua')

  useEffect(() => {
    if (selectedCaborDetail) {
      setModalSearch('')
      setModalClassFilter('Semua')
    }
  }, [selectedCaborDetail])

  const modalClasses = selectedCaborDetail 
    ? ['Semua', ...Array.from(new Set(selectedCaborDetail.siswa_list?.map(s => s.kelas) || []))].sort((a, b) => {
        if (a === 'Semua') return -1;
        if (b === 'Semua') return 1;
        return a.localeCompare(b);
      })
    : ['Semua'];
    
  const filteredSiswaList = selectedCaborDetail
    ? (selectedCaborDetail.siswa_list || []).filter(s => {
        const matchSearch = s.nama.toLowerCase().includes(modalSearch.toLowerCase())
        const matchClass = modalClassFilter === 'Semua' || s.kelas === modalClassFilter
        return matchSearch && matchClass
      })
    : [];

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/public/landing.php')
      const json = await res.json()
      if (json.status !== 'success') throw new Error(json.message ?? 'Gagal memuat data')
      setData(json.data as LandingData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  /* ── Navbar ── */
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [activeSection, setActiveSection] = useState('beranda')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const sections = ['beranda','cabor','klasemen','galeri','lokasi']
      for (const sid of [...sections].reverse()) {
        const el = document.getElementById(sid)
        if (el && window.scrollY >= el.offsetTop - 80) { setActiveSection(sid); break }
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Hero Carousel ── */
  const [slide, setSlide]         = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goSlide = (idx: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setSlide(idx); setAnimating(false) }, 400)
  }
  const nextSlide = () => goSlide((slide + 1) % HERO_SLIDES.length)
  const prevSlide = () => goSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)

  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  })

  /* ── Klasemen state ── */
  const [search, setSearch]           = useState('')
  const [caborFilter, setCaborFilter] = useState('Semua')
  const [page, setPage]               = useState(1)
  const [selectedSiswaDetail, setSelectedSiswaDetail] = useState<KlasemenItem | null>(null)

  /* ── Riwayat Modal state ── */
  const [riwayatOpen, setRiwayatOpen] = useState(false)
  const [riwayatData, setRiwayatData] = useState<any>(null)
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  const openRiwayat = async (siswaId: number) => {
    setRiwayatOpen(true)
    setLoadingRiwayat(true)
    setRiwayatData(null)
    try {
      const res = await fetch(`/api/public/riwayat.php?siswa_id=${siswaId}`)
      const json = await res.json()
      if (json.status === 'success') {
        setRiwayatData(json.data)
      }
    } catch { } finally { setLoadingRiwayat(false) }
  }

  /* ── Certificate preview ── */
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null)

  /* ── Galeri state ── */
  const [galeriFilter, setGaleriFilter] = useState('Semua')
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null)
  const [galeriPage, setGaleriPage]     = useState(1)
  const PAGE_GALERI = 6

  useScrollAnimation([data, page, galeriPage, search, caborFilter, galeriFilter])

  const GALERI_ITEMS = [
    // ── Sepak Bola ─────────────────────────────────────────────────────────
    { src: '/gal-sepakbola-intl.png', cabang: 'Sepak Bola', tingkat: 'Internasional',    tahun: '2024',
      kejuaraan: 'ASEAN Schools Football Championship 2024',
      deskripsi: 'Tim SMANKO meraih medali emas pada kejuaraan sepak bola pelajar tingkat ASEAN di Kuala Lumpur, mengalahkan tim dari 8 negara peserta.' },
    { src: '/sepakbola_nasional.jpg', cabang: 'Sepak Bola', tingkat: 'Nasional',         tahun: '2024',
      kejuaraan: 'Popnas Sepak Bola 2024',
      deskripsi: 'SMANKO meraih juara 2 pada Pekan Olahraga Pelajar Nasional cabang sepak bola yang diselenggarakan di Bandung, Jawa Barat.' },
    { src: '/sepakbola_provinsi.jpg', cabang: 'Sepak Bola', tingkat: 'Provinsi',         tahun: '2024',
      kejuaraan: 'Porprov Sulsel Pelajar 2024',
      deskripsi: 'Tim sepak bola SMANKO menjuarai Pekan Olahraga Provinsi Sulawesi Selatan kategori pelajar dengan skor telak di babak final.' },
    { src: '/sepakbola_kota.jpg', cabang: 'Sepak Bola', tingkat: 'Kabupaten/Kota',  tahun: '2024',
      kejuaraan: 'Liga Pelajar Kota Makassar 2024',
      deskripsi: 'SMANKO keluar sebagai juara Liga Pelajar Kota Makassar setelah melalui babak penyisihan melawan 16 sekolah dari seluruh wilayah kota.' },
    { src: '/sepakbola_kecamatan.jpg', cabang: 'Sepak Bola', tingkat: 'Kecamatan',        tahun: '2024',
      kejuaraan: 'Turnamen Sepak Bola Kecamatan Biringkanaya 2024',
      deskripsi: 'Tim sepak bola SMANKO menjadi juara pada turnamen antar pelajar tingkat kecamatan Biringkanaya dengan rekor tak terkalahkan.' },
    { src: '/sepakbola_pelajar.jpg', cabang: 'Sepak Bola', tingkat: 'Pelajar/Sekolah',  tahun: '2024',
      kejuaraan: 'Turnamen Internal Antar Angkatan 2024',
      deskripsi: 'Kompetisi rutin antar angkatan SMANKO yang menjadi seleksi awal pembentukan tim inti untuk mengikuti kejuaraan tingkat kecamatan hingga nasional.' },
    // ── Bulu Tangkis ───────────────────────────────────────────────────────
    { src: '/gal-badminton-nas.png',  cabang: 'Bulu Tangkis', tingkat: 'Internasional',   tahun: '2023',
      kejuaraan: 'BATC Youth International 2023',
      deskripsi: 'Atlet bulu tangkis SMANKO mewakili Indonesia pada Badminton Asia Team Championship Youth 2023 dan berhasil mencapai babak semifinal.' },
    { src: '/bulutangkis_nasional.jpg',  cabang: 'Bulu Tangkis', tingkat: 'Nasional',         tahun: '2024',
      kejuaraan: 'O2SN Bulu Tangkis Nasional 2024',
      deskripsi: 'Atlet bulu tangkis SMANKO meraih juara pertama tunggal putra pada Olimpiade Olahraga Siswa Nasional (O2SN) di Jakarta.' },
    { src: '/badminton_provinsi.jpg',  cabang: 'Bulu Tangkis', tingkat: 'Provinsi',         tahun: '2024',
      kejuaraan: 'O2SN Bulu Tangkis Provinsi Sulsel 2024',
      deskripsi: 'SMANKO berhasil meloloskan 3 atlet ke O2SN Nasional setelah meraih juara umum pada seleksi O2SN tingkat Provinsi Sulawesi Selatan.' },
    { src: '/badminton_kota.jpg',  cabang: 'Bulu Tangkis', tingkat: 'Kabupaten/Kota',  tahun: '2024',
      kejuaraan: 'Kejuaraan Bulu Tangkis Kota Makassar 2024',
      deskripsi: 'Tim bulu tangkis SMANKO meraih 4 emas dari 6 nomor yang dipertandingkan pada kejuaraan kota Makassar antar pelajar.' },
    { src: '/badminton_kecamatan.jpg',  cabang: 'Bulu Tangkis', tingkat: 'Kecamatan',        tahun: '2024',
      kejuaraan: 'Turnamen Bulu Tangkis Kec. Biringkanaya 2024',
      deskripsi: 'Atlet bulu tangkis SMANKO mendominasi turnamen kecamatan dengan meraih seluruh gelar juara di semua kategori yang diperlombakan.' },
    { src: '/badminton_pelajar.jpg',  cabang: 'Bulu Tangkis', tingkat: 'Pelajar/Sekolah',  tahun: '2024',
      kejuaraan: 'Turnamen Bulu Tangkis Antar SMA Se-Makassar 2024',
      deskripsi: 'SMANKO berhasil menjuarai turnamen bulu tangkis yang melibatkan 24 SMA dari wilayah Makassar Raya.' },
    // ── Karate ─────────────────────────────────────────────────────────────
    { src: '/gal-karate-intl.png',    cabang: 'Karate', tingkat: 'Internasional',          tahun: '2023',
      kejuaraan: 'WKF Youth World Championship 2023',
      deskripsi: 'Atlet karate SMANKO mewakili Indonesia di WKF Youth World Championship dan meraih medali perunggu pada nomor kata perorangan.' },
    { src: '/gal-karate-nas.png',     cabang: 'Karate', tingkat: 'Nasional',               tahun: '2024',
      kejuaraan: 'Kejurnas Karate Pelajar 2024',
      deskripsi: 'Dua atlet karate SMANKO meraih emas pada nomor kata dan kumite, membuktikan dominasi Sulawesi Selatan di pentas nasional.' },
    { src: '/gal-karate-nas.png',     cabang: 'Karate', tingkat: 'Provinsi',               tahun: '2024',
      kejuaraan: 'Kejurda Karate Sulsel 2024',
      deskripsi: 'SMANKO meraih juara umum pada Kejuaraan Daerah Karate Sulawesi Selatan dengan total 6 medali emas.' },
    { src: '/gal-karate-nas.png',     cabang: 'Karate', tingkat: 'Kabupaten/Kota',         tahun: '2024',
      kejuaraan: 'Kejuaraan Karate Kota Makassar 2024',
      deskripsi: 'Tim karate SMANKO meraih podium di 8 dari 10 nomor yang dipertandingkan pada kejuaraan kota Makassar.' },
    { src: '/gal-karate-nas.png',     cabang: 'Karate', tingkat: 'Kecamatan',              tahun: '2024',
      kejuaraan: 'Open Tournament Karate Kec. Biringkanaya 2024',
      deskripsi: 'Atlet karate SMANKO menyapu bersih gelar juara pada open tournament karate tingkat kecamatan.' },
    { src: '/gal-karate-nas.png',     cabang: 'Karate', tingkat: 'Pelajar/Sekolah',        tahun: '2024',
      kejuaraan: 'Kompetisi Karate Antar SMA 2024',
      deskripsi: 'SMANKO menjuarai kompetisi karate antar SMA se-Makassar dengan meraih posisi pertama di kategori kata beregu dan kumite.' },
    // ── Pencak Silat ───────────────────────────────────────────────────────
    { src: '/gal-silat-nas.png',      cabang: 'Pencak Silat', tingkat: 'Internasional',    tahun: '2023',
      kejuaraan: 'SEA Games Youth Pencak Silat 2023',
      deskripsi: 'Atlet pencak silat SMANKO mewakili Indonesia pada SEA Games Youth dan berhasil meraih medali perak pada nomor tanding putri.' },
    { src: '/gal-silat-nas.png',      cabang: 'Pencak Silat', tingkat: 'Nasional',         tahun: '2023',
      kejuaraan: 'Popnas Pencak Silat 2023',
      deskripsi: 'Atlet pencak silat SMANKO meraih emas pada Popnas cabang pencak silat nomor tanding putri kategori D.' },
    { src: '/gal-silat-prov.png',     cabang: 'Pencak Silat', tingkat: 'Provinsi',         tahun: '2024',
      kejuaraan: 'Kejuaraan Provinsi Sulsel 2024',
      deskripsi: 'Tim pencak silat SMANKO meraih juara umum dengan 5 emas, 3 perak, dan 2 perunggu.' },
    { src: '/gal-silat-prov.png',     cabang: 'Pencak Silat', tingkat: 'Kabupaten/Kota',  tahun: '2024',
      kejuaraan: 'Kejuaraan Silat Kota Makassar 2024',
      deskripsi: 'SMANKO mendominasi kejuaraan pencak silat kota Makassar dengan meraih 7 medali emas dari 12 nomor pertandingan.' },
    { src: '/gal-silat-prov.png',     cabang: 'Pencak Silat', tingkat: 'Kecamatan',        tahun: '2024',
      kejuaraan: 'Open Tournament Silat Kec. Biringkanaya 2024',
      deskripsi: 'Atlet pencak silat SMANKO mengikuti turnamen terbuka kecamatan sebagai ajang pemanasan dan berhasil meraih seluruh gelar juara.' },
    { src: '/gal-silat-prov.png',     cabang: 'Pencak Silat', tingkat: 'Pelajar/Sekolah',  tahun: '2024',
      kejuaraan: 'Liga Silat Pelajar Makassar 2024',
      deskripsi: 'SMANKO menjuarai liga pencak silat pelajar antar sekolah di Makassar yang diikuti oleh 30 sekolah dari berbagai kecamatan.' },
  ]

  const GALERI_FILTER_OPTS = ['Semua', 'Sepak Bola', 'Bulu Tangkis', 'Karate', 'Pencak Silat']
  const filteredGaleri = galeriFilter === 'Semua' ? GALERI_ITEMS : GALERI_ITEMS.filter(g => g.cabang === galeriFilter)
  const totalGaleriPages = Math.max(1, Math.ceil(filteredGaleri.length / PAGE_GALERI))
  const paginatedGaleri  = filteredGaleri.slice((galeriPage - 1) * PAGE_GALERI, galeriPage * PAGE_GALERI)

  const TINGKAT_COLOR: Record<string, string> = {
    'Internasional':   '#7c3aed',
    'Nasional':        '#c1272d',
    'Provinsi':        '#d97706',
    'Kabupaten/Kota':  '#0369a1',
    'Kecamatan':       '#16a34a',
    'Pelajar/Sekolah': '#0891b2',
  }

  /* ── Pelatih spotlight slide ── */
  const allPelatih = useMemo(() => {
    if (!data?.cabor) return []
    const list: any[] = []
    data.cabor.forEach(c => {
      if (c.profil_pelatih) {
        c.profil_pelatih.forEach(p => {
          list.push({ ...p, cabang: c.nama })
        })
      }
    })
    return list
  }, [data?.cabor])

  const [pelatihSlide, setPelatihSlide] = useState(0)
  const [pelatihFade, setPelatihFade] = useState(true)

  useEffect(() => {
    if (allPelatih.length <= 1) return
    const timer = setInterval(() => {
      setPelatihFade(false)
      setTimeout(() => {
        setPelatihSlide(prev => (prev + 1) % allPelatih.length)
        setPelatihFade(true)
      }, 400)
    }, 2 * 60 * 1000)
    return () => clearInterval(timer)
  }, [allPelatih.length])

  const caborOptions = ['Semua', ...(data?.cabor.map(c => c.nama) ?? [])]

  const filtered = (data?.klasemen ?? []).filter(s => {
    const matchSearch = s.nama_siswa.toLowerCase().includes(search.toLowerCase())
    const matchCabor  = caborFilter === 'Semua' || s.nama_cabang === caborFilter
    return matchSearch && matchCabor
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1); setSelectedSiswaDetail(null) }, [search, caborFilter])

  /* ─── Stat numbers ─── */
  const stats = data?.stats
  const statCards = [
    { icon: <Users size={18}/>,   val: loading ? '—' : <CountUp value={stats?.total_siswa ?? 0} suffix="+" />,         label: 'Siswa Aktif'         },
    { icon: <Trophy size={18}/>,  val: loading ? '—' : <CountUp value={stats?.total_cabor ?? 0} />,                    label: 'Cabang Olahraga'     },
    { icon: <Star size={18}/>,    val: loading ? '—' : <CountUp value={stats?.total_berprestasi ?? 0} suffix="+" />,   label: 'Siswa Berprestasi'   },
    { icon: <Target size={18}/>,  val: loading ? '—' : <CountUp value={stats?.total_pelatih ?? 0} />,                  label: 'Pelatih Aktif'       },
  ]

  /* ─── RENDER ─── */
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', background: '#f8faff', overflowX: 'clip', width: '100%' }}>

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(11,45,107,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.25)' : 'none',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 68 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }}>
              <img src="/logo-smanko.jpg" alt="Logo SMANKO" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>SMANKO</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>Keberbakatan Olahraga Sul-Sel</div>
            </div>
          </div>

          {/* Nav Links – desktop */}
          <div className="lp-nav-links" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {NAV_LINKS.map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)} style={{
                background: 'none', border: 'none',
                color: activeSection === link.id ? '#fff' : 'rgba(255,255,255,0.72)',
                fontWeight: activeSection === link.id ? 700 : 500,
                fontSize: '0.88rem', padding: '8px 16px', borderRadius: 8,
                cursor: 'pointer', transition: 'all 0.2s',
                borderBottom: activeSection === link.id ? '2px solid #e84a4f' : '2px solid transparent',
              }}>
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA + hamburger */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/login')}
              id="lp-btn-login-nav"
              className="lp-nav-links"
              style={{
                background: 'linear-gradient(135deg, #c1272d 0%, #e84a4f 100%)',
                color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 20px', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,39,45,0.45)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <ExternalLink size={14} />
              Login Portal Sistem
            </button>

            <button
              id="lp-hamburger"
              className="lp-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 8 }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{
            background: 'rgba(11,45,107,0.98)', backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '16px 24px 20px',
          }}>
            {NAV_LINKS.map(link => (
              <button key={link.id} onClick={() => { scrollTo(link.id); setMobileOpen(false) }} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)',
                fontWeight: 600, fontSize: '0.92rem', padding: '12px 4px',
                cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                {link.label}
              </button>
            ))}
            <button onClick={() => navigate('/login')} style={{
              marginTop: 12, width: '100%',
              background: 'linear-gradient(135deg,#c1272d,#e84a4f)',
              color: '#fff', border: 'none', borderRadius: 9,
              padding: '11px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            }}>
              Login Portal Sistem
            </button>
          </div>
        )}
      </nav>

      {/* ══════════════════════ HERO CAROUSEL ══════════════════════ */}
      <section id="beranda" style={{ position: 'relative', height: '100vh', minHeight: 560, overflow: 'hidden' }}>
        {HERO_SLIDES.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${s.bg})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === slide ? (animating ? 0 : 1) : 0,
            transition: 'opacity 0.5s ease', zIndex: i === slide ? 1 : 0,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(11,45,107,0.55))' }} />

        {/* Floating Icons Animation
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
          <div style={{ position: 'absolute', top: '20%', left: '12%', fontSize: 45, opacity: 0.8, animation: 'float1 7s ease-in-out infinite' }}>⚽</div>
          <div style={{ position: 'absolute', top: '25%', right: '15%', fontSize: 50, opacity: 0.8, animation: 'float2 9s ease-in-out infinite' }}>🏀</div>
          <div style={{ position: 'absolute', bottom: '25%', left: '8%', fontSize: 40, opacity: 0.8, animation: 'float3 8s ease-in-out infinite' }}>🎯</div>
          <div style={{ position: 'absolute', bottom: '30%', right: '10%', fontSize: 45, opacity: 0.8, animation: 'float4 6s ease-in-out infinite' }}>🏸</div>
          <div style={{ position: 'absolute', top: '10%', left: '40%', fontSize: 35, opacity: 0.6, animation: 'float2 10s ease-in-out infinite' }}>🏐</div>
        </div> */}


        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px',
        }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(193,39,45,0.85)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 30, padding: '5px 16px', marginBottom: 24,
              color: '#fff', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em',
            }}>
              <Trophy size={13} className="lp-badge-icon" />
              SMANKO — Sulawesi Selatan
            </div>
            <h1 style={{
              fontSize: 'clamp(1.7rem, 6vw, 3.8rem)', fontWeight: 900, color: '#fff',
              lineHeight: 1.15, fontFamily: "'Bebas Neue',sans-serif",
              marginBottom: 10, textShadow: '0 2px 20px rgba(0,0,0,0.4)',
              wordWrap: 'break-word'
            }}>
              {HERO_SLIDES[slide].headline}<br />
              <span style={{ color: '#f9c74f' }}>{HERO_SLIDES[slide].headline2}</span>
            </h1>
            <p style={{
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.82)',
              lineHeight: 1.7, maxWidth: 600, margin: '0 auto 36px',
            }}>
              {HERO_SLIDES[slide].sub}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (HERO_SLIDES[slide].ctaTarget === 'login') navigate('/login')
                  else scrollTo(HERO_SLIDES[slide].ctaTarget)
                }}
                style={{
                  background: 'linear-gradient(135deg,#c1272d,#e84a4f)', color: '#fff',
                  border: 'none', borderRadius: 12, padding: '14px 32px',
                  fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(193,39,45,0.5)',
                }}
              >
                {HERO_SLIDES[slide].cta}
              </button>
              <button onClick={() => navigate('/login')} style={{
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12,
                padding: '14px 32px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
              }}>
                Login Portal →
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 4, display: 'flex', gap: 8 }}>
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} style={{
              width: i === slide ? 28 : 10, height: 10, borderRadius: 5, border: 'none',
              background: i === slide ? '#c1272d' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', transition: 'all 0.35s',
            }} />
          ))}
        </div>

        {/* Stats Bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4,
          background: 'rgba(11,45,107,0.92)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 24px',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
            {statCards.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#f9c74f',
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1, color: '#fff' }}>
                    {item.val}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.3, marginTop: 2 }}>
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CABOR & PELATIH ══════════════════════ */}
      <section id="cabor" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          {/* Section header */}
          <div className="lp-animate-hidden" style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(17,85,168,0.08)', border: '1px solid rgba(17,85,168,0.15)',
              borderRadius: 30, padding: '5px 16px', marginBottom: 16,
              color: '#1155a8', fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Target size={13} className="lp-badge-icon" />
              PROGRAM UNGGULAN
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0b2d6b',
              fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1.2, marginBottom: 12,
            }}>
              Cabang Olahraga &amp; Tim Pelatih
            </h2>
            <p style={{ color: '#6b7faa', fontSize: '1rem', maxWidth: 520, margin: '0 auto' }}>
              Dipandu oleh pelatih bersertifikat yang berdedikasi mencetak atlet berprestasi tinggi.
            </p>
          </div>

        <CaborCoverflow caborList={data?.cabor || []} onSelect={setSelectedCaborDetail} />
        </div>

        {/* MODAL DETAIL CABOR */}
        {selectedCaborDetail && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(11,45,107,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }} onClick={() => setSelectedCaborDetail(null)}>
            <div style={{
              background: '#fff', borderRadius: 24, width: '100%', maxWidth: 800,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              {/* Header Modal */}
              <div style={{
                padding: '24px 32px', borderBottom: '1px solid #edf1fb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(90deg, #f8faff, #fff)'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7faa', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Detail Cabang Olahraga
                  </div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0b2d6b', margin: 0 }}>
                    {selectedCaborDetail.nama}
                  </h3>
                </div>
                <button onClick={() => setSelectedCaborDetail(null)} style={{
                  background: 'rgba(17,85,168,0.06)', border: 'none', width: 36, height: 36,
                  borderRadius: '50%', color: '#3a4f80', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.2s'
                }}>
                  <X size={18} />
                </button>
              </div>

              {/* Content Modal */}
              <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                {/* Tim Pelatih */}
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a2744', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} style={{ color: '#1155a8' }} /> Tim Pelatih
                  </h4>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {(selectedCaborDetail.profil_pelatih || []).map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: 16, background: '#f8faff', borderRadius: 16,
                        border: '1px solid #dce6f7', flex: '1 1 300px'
                      }}>
                        <img src={p.foto || '/coach-male.png'} alt={p.nama} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                        <div>
                          <div style={{ fontWeight: 800, color: '#0b2d6b', fontSize: '1rem', marginBottom: 4 }}>{p.nama}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7faa', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {p.no_telepon && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📱 {p.no_telepon}</span>
                            )}
                            {p.keterangan && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12}/> {p.keterangan}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!(selectedCaborDetail.profil_pelatih?.length) && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7faa', fontStyle: 'italic', padding: 8 }}>
                        Belum ada data pelatih.
                      </div>
                    )}
                  </div>
                </div>

                {/* Daftar Siswa */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a2744', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={18} style={{ color: '#c1272d' }} /> Daftar Siswa ({filteredSiswaList.length})
                    </h4>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a0b0cc' }} />
                        <input
                          type="text"
                          placeholder="Cari nama..."
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          style={{
                            padding: '8px 12px 8px 30px', borderRadius: 8, border: '1.5px solid #dce6f7',
                            fontSize: '0.8rem', outline: 'none', width: 180, color: '#1a2744'
                          }}
                        />
                      </div>
                      <select
                        value={modalClassFilter}
                        onChange={e => setModalClassFilter(e.target.value)}
                        style={{
                          padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dce6f7',
                          fontSize: '0.8rem', outline: 'none', cursor: 'pointer', background: '#fff', color: '#1a2744'
                        }}
                      >
                        {modalClasses.map(c => <option key={c} value={c}>{c === 'Semua' ? 'Semua Kelas' : `${c}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {filteredSiswaList.length > 0 ? (
                    <div style={{ border: '1px solid #dce6f7', borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead style={{ background: '#f8faff', color: '#3a4f80', fontWeight: 700 }}>
                          <tr>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid #dce6f7', width: 50, textAlign: 'center' }}>No</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid #dce6f7' }}>Nama Siswa</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid #dce6f7', width: 100, textAlign: 'center' }}>Kelas</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid #dce6f7', width: 80, textAlign: 'center' }}>L/P</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSiswaList.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf1fb', background: i % 2 === 0 ? '#fff' : '#fafcff' }}>
                              <td style={{ padding: '12px 16px', color: '#6b7faa', textAlign: 'center' }}>{i + 1}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a2744' }}>{s.nama}</td>
                              <td style={{ padding: '12px 16px', color: '#3a4f80', textAlign: 'center' }}>
                                <span style={{ background: '#edf1fb', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>{s.kelas}</span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#6b7faa', textAlign: 'center', fontWeight: 600 }}>{s.jenis_kelamin}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center', background: '#f8faff', borderRadius: 12, color: '#a0b0cc', border: '1px dashed #dce6f7' }}>
                      {selectedCaborDetail.siswa_list?.length === 0 
                        ? 'Belum ada data siswa untuk cabang olahraga ini.' 
                        : 'Siswa tidak ditemukan.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════ KLASEMEN ══════════════════════ */}
      <section id="klasemen" style={{ padding: '80px 24px', background: '#f0f4ff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="lp-animate-hidden" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(193,39,45,0.08)', border: '1px solid rgba(193,39,45,0.18)',
              borderRadius: 30, padding: '5px 16px', marginBottom: 16,
              color: '#c1272d', fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Trophy size={13} className="lp-badge-icon" />
              PRESTASI SISWA
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0b2d6b',
              fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1.2, marginBottom: 12,
            }}>
              Papan Peringkat Prestasi Siswa
            </h2>
            <p style={{ color: '#6b7faa', fontSize: '1rem', maxWidth: 560, margin: '0 auto' }}>
              Peringkat dihitung dari data real sistem: Keterampilan (30%) + Prestasi (40%) + Kehadiran (30%).
              {data?.tahun_ajaran && (
                <span style={{ display: 'block', marginTop: 4, fontSize: '0.85rem', color: '#1155a8', fontWeight: 600 }}>
                  Tahun Ajaran {data.tahun_ajaran.nama} — Semester {data.tahun_ajaran.semester}
                </span>
              )}
            </p>
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <Skeleton h={40} w="60%" radius={10} />
                <Skeleton h={40} w="30%" radius={10} />
              </div>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #edf1fb' }}>
                  <Skeleton h={14} w={28} radius={4} />
                  <Skeleton h={14} w="30%" radius={4} />
                  <Skeleton h={14} w="15%" radius={4} />
                  <Skeleton h={14} w="10%" radius={4} />
                  <Skeleton h={14} w="12%" radius={4} />
                  <Skeleton h={14} w="10%" radius={4} />
                  <Skeleton h={14} w="10%" radius={4} />
                </div>
              ))}
            </div>
          ) : error ? null : (
            <>
              {/* Filter Bar */}
              <div className="lp-animate-hidden" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0b0cc', pointerEvents: 'none' }} />
                  <input
                    id="lp-search-siswa"
                    type="text"
                    placeholder="Cari Nama Siswa..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px 10px 38px',
                      background: '#fff', border: '1.5px solid #dce6f7',
                      borderRadius: 10, fontSize: '0.88rem', color: '#1a2744', outline: 'none',
                    }}
                  />
                </div>
                <select
                  id="lp-filter-cabor"
                  value={caborFilter}
                  onChange={e => setCaborFilter(e.target.value)}
                  style={{
                    padding: '10px 36px 10px 14px', background: '#fff',
                    border: '1.5px solid #dce6f7', borderRadius: 10,
                    fontSize: '0.88rem', color: '#1a2744', outline: 'none',
                    cursor: 'pointer', minWidth: 170, appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%231155a8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                  }}
                >
                  {(data?.klasemen.length ? caborOptions : CABOR_OPTIONS_STATIC).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Table */}
              <div className="lp-animate-hidden" style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #dce6f7', boxShadow: '0 4px 24px rgba(17,85,168,0.07)', overflow: 'hidden' }}>
                {data?.klasemen.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <Trophy size={40} style={{ margin: '0 auto 12px', color: '#dce6f7' }} />
                    <p style={{ color: '#a0b0cc', fontSize: '0.9rem' }}>
                      Belum ada data penilaian untuk tahun ajaran aktif.
                    </p>
                    <button onClick={() => navigate('/login')} style={{
                      marginTop: 12, background: '#1155a8', color: '#fff', border: 'none',
                      borderRadius: 9, padding: '10px 20px', fontWeight: 700, cursor: 'pointer',
                    }}>
                      Login untuk Input Nilai
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr>
                            {['#', 'Nama Siswa', 'Kelas', 'Cabor', 'Pelatih', 'Kehadiran', 'Keterampilan', 'Prestasi & Kejuaraan', 'Total Skor'].map(h => (
                              <th key={h} style={{
                                background: 'linear-gradient(90deg, #0b2d6b, #1155a8)',
                                color: 'rgba(255,255,255,0.9)', fontWeight: 700,
                                fontSize: '0.73rem', textTransform: 'uppercase',
                                letterSpacing: '0.05em', padding: '13px 14px',
                                textAlign: h === 'Nama Siswa' || h === 'Prestasi & Kejuaraan' || h === 'Pelatih' ? 'left' : 'center',
                                whiteSpace: 'nowrap',
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: '#a0b0cc', fontSize: '0.9rem' }}>
                              Tidak ada data sesuai filter.
                            </td></tr>
                          ) : paginated.map((s, idx) => {
                            const caborColor = getCaborColor({ nama: s.nama_cabang, kode: s.kode_cabang } as CaborItem)
                            const realPrestasi = (s.prestasi_list ?? []).filter(
                              p => !['Tidak Ada Prestasi', '', null].includes(p.tingkatan)
                            )
                            const TINGKATAN_COLOR: Record<string, string> = {
                              'Internasional': '#7c3aed',
                              'Nasional':      '#c1272d',
                              'Provinsi':      '#d97706',
                              'Kabupaten/Kota':'#0369a1',
                              'Pelajar/Sekolah':'#16a34a',
                            }
                            const rowBg = idx % 2 === 0 ? '#fff' : '#fafcff'
                            return (
                              <>
                                {/* Main Row */}
                                <tr
                                  key={`row-${s.siswa_id}`}
                                  onClick={() => setSelectedSiswaDetail(s)}
                                  style={{
                                    borderBottom: '1px solid #edf1fb',
                                    background: rowBg,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  {/* Rank */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center', width: 48 }}>
                                    {s.rank <= 3 ? (
                                      <div style={{
                                        width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: s.rank === 1 ? '#f9c74f' : s.rank === 2 ? '#b0bec5' : '#cd7f32',
                                        color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                                      }}>
                                        {s.rank}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#6b7faa', fontWeight: 600 }}>{s.rank}</span>
                                    )}
                                  </td>

                                  {/* Nama */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                      <div style={{
                                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                        background: avatarColor(s.nama_siswa),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 800, fontSize: '0.72rem',
                                        boxShadow: `0 2px 6px ${avatarColor(s.nama_siswa)}50`,
                                      }}>
                                        {avatarInit(s.nama_siswa)}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#1a2744', whiteSpace: 'nowrap' }}>{s.nama_siswa}</div>
                                        {s.nis && <div style={{ fontSize: '0.68rem', color: '#a0b0cc' }}>NIS: {s.nis}</div>}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Kelas */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <span style={{
                                      background: '#edf1fb',
                                      color: '#1155a8',
                                      border: '1px solid #cbdffe',
                                      padding: '3px 9px',
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      fontSize: '0.72rem',
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {s.kelas}
                                    </span>
                                  </td>

                                  {/* Cabor */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block', background: caborColor + '18',
                                      color: caborColor, border: `1px solid ${caborColor}30`,
                                      borderRadius: 20, padding: '3px 10px',
                                      fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                                    }}>
                                      {s.nama_cabang}
                                    </span>
                                  </td>

                                  {/* Pelatih */}
                                  <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                        background: 'rgba(17,85,168,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>
                                        <Users size={12} style={{ color: '#1155a8' }} />
                                      </div>
                                      <div style={{
                                        fontSize: '0.75rem', color: '#3a4f80', fontWeight: 600,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        maxWidth: 120,
                                      }}>
                                        {s.nama_pelatih ?? <span style={{ color: '#a0b0cc', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Kehadiran */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 600, color: s.persen_hadir >= 90 ? '#16a34a' : s.persen_hadir >= 75 ? '#d97706' : '#c1272d' }}>
                                      {s.persen_hadir}%
                                    </span>
                                  </td>

                                  {/* Keterampilan */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                      <div style={{ width: 44, height: 5, background: '#edf1fb', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${s.keterampilan}%`, height: '100%', background: '#1155a8', borderRadius: 3 }} />
                                      </div>
                                      <span style={{ fontWeight: 600, color: '#1a2744', fontSize: '0.82rem', minWidth: 28 }}>{s.keterampilan}</span>
                                    </div>
                                  </td>

                                  {/* Prestasi & Kejuaraan — preview + expand button */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ flex: 1 }}>
                                        {/* Nilai prestasi */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: realPrestasi.length > 0 ? 4 : 0 }}>
                                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0b2d6b' }}>{s.prestasi}</span>
                                          {s.prestasi_tingkatan !== '-' && (
                                            <span style={{
                                              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                                              borderRadius: 20, whiteSpace: 'nowrap',
                                              background: (TINGKATAN_COLOR[s.prestasi_tingkatan] ?? '#6b7faa') + '18',
                                              color: TINGKATAN_COLOR[s.prestasi_tingkatan] ?? '#6b7faa',
                                              border: `1px solid ${(TINGKATAN_COLOR[s.prestasi_tingkatan] ?? '#6b7faa')}30`,
                                            }}>
                                              ★ {s.prestasi_tingkatan}
                                            </span>
                                          )}
                                        </div>
                                        {/* Preview kejuaraan pertama */}
                                        {realPrestasi.length > 0 && (
                                          <div style={{ fontSize: '0.7rem', color: '#6b7faa', lineHeight: 1.4 }}>
                                            <span style={{ color: '#1155a8', fontWeight: 600 }}>🏆 {realPrestasi[0].nama_kejuaraan || realPrestasi[0].tingkatan}</span>
                                            {realPrestasi.length > 1 && (
                                              <span style={{ color: '#a0b0cc' }}> +{realPrestasi.length - 1} lainnya</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {/* Expand toggle */}
                                      {/* View detail icon */}
                                      <div style={{
                                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                        background: '#edf1fb',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s',
                                      }}>
                                        <ChevronRight size={14} style={{ color: '#1155a8' }} />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Total Skor */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <div style={{
                                      fontWeight: 800, fontSize: '1.05rem',
                                      color: '#0b2d6b',
                                      marginBottom: 4
                                    }}>
                                      {s.total_skor}
                                    </div>
                                    {s.predikat && (() => {
                                      const badge = getPredikatBadgeStyle(s.predikat);
                                      return (
                                        <span style={{
                                          background: badge.bg,
                                          color: badge.text,
                                          border: `1px solid ${badge.border}`,
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          fontWeight: 700,
                                          fontSize: '0.65rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          <span style={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            backgroundColor: badge.text,
                                            display: 'inline-block'
                                          }} />
                                          {badge.label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>

                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 20px', borderTop: '1px solid #edf1fb', flexWrap: 'wrap', gap: 10,
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#6b7faa' }}>
                        Menampilkan {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                          padding: '6px 13px', background: '#fff', border: '1.5px solid #dce6f7',
                          borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          color: page === 1 ? '#a0b0cc' : '#1155a8',
                        }}>← Prev</button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let p = i + 1
                          if (totalPages > 5) {
                            if (page <= 3) p = i + 1
                            else if (page >= totalPages - 2) p = totalPages - 4 + i
                            else p = page - 2 + i
                          }
                          return (
                            <button key={p} onClick={() => setPage(p)} style={{
                              width: 34, height: 34, borderRadius: 8,
                              border: `1.5px solid ${page === p ? '#1155a8' : '#dce6f7'}`,
                              background: page === p ? '#1155a8' : '#fff',
                              color: page === p ? '#fff' : '#6b7faa',
                              fontWeight: page === p ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                            }}>{p}</button>
                          )
                        })}

                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
                          padding: '6px 13px', background: '#fff', border: '1.5px solid #dce6f7',
                          borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                          color: page === totalPages ? '#a0b0cc' : '#1155a8',
                        }}>Next →</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* MODAL DETAIL SISWA */}
      {selectedSiswaDetail && (() => {
        const s = selectedSiswaDetail;
        const realPrestasi = (s.prestasi_list ?? []).filter(
          p => !['Tidak Ada Prestasi', '', null].includes(p.tingkatan)
        );
        const TINGKATAN_COLOR: Record<string, string> = {
          'Internasional': '#7c3aed',
          'Nasional':      '#c1272d',
          'Provinsi':      '#d97706',
          'Kabupaten/Kota':'#0369a1',
          'Pelajar/Sekolah':'#16a34a',
        };
        const BULAN = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
        const caborColor = getCaborColor({ nama: s.nama_cabang, kode: s.kode_cabang } as CaborItem);

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(11,45,107,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }} onClick={() => setSelectedSiswaDetail(null)}>
            <div style={{
              background: '#fff', borderRadius: 24, width: '100%', maxWidth: 800,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Header Modal */}
              <div style={{
                padding: '24px 32px', borderBottom: '1px solid #edf1fb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                background: 'linear-gradient(90deg, #f8faff, #fff)'
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: avatarColor(s.nama_siswa),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1.4rem',
                    boxShadow: `0 4px 12px ${avatarColor(s.nama_siswa)}40`,
                  }}>
                    {avatarInit(s.nama_siswa)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0b2d6b', margin: '0 0 4px' }}>
                      {s.nama_siswa}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#6b7faa', display: 'flex', gap: 12, alignItems: 'center' }}>
                      {s.nis && <span>NIS: {s.nis}</span>}
                      <span style={{ background: '#edf1fb', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#1155a8' }}>
                        Kelas {s.kelas}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => openRiwayat(s.siswa_id)} style={{
                    background: '#1155a8', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(17,85,168,0.2)', transition: 'all 0.2s'
                  }}>
                    🕒 Riwayat Nilai
                  </button>
                  <button onClick={() => setSelectedSiswaDetail(null)} style={{
                    background: 'rgba(17,85,168,0.06)', border: 'none', width: 36, height: 36,
                    borderRadius: '50%', color: '#3a4f80', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content Modal */}
              <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                
                {/* Info Utama */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
                  <div style={{
                    flex: 1, minWidth: 200, padding: 20, background: '#f8faff', borderRadius: 16,
                    border: '1px solid #dce6f7'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7faa', textTransform: 'uppercase', marginBottom: 12 }}>
                      Informasi Cabang Olahraga
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{
                        display: 'inline-block', background: caborColor + '18',
                        color: caborColor, border: `1px solid ${caborColor}30`,
                        borderRadius: 20, padding: '4px 12px', fontSize: '0.85rem', fontWeight: 700,
                      }}>
                        {s.nama_cabang}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} style={{ color: '#1155a8' }} />
                      <span style={{ fontSize: '0.9rem', color: '#1a2744', fontWeight: 600 }}>Pelatih: {s.nama_pelatih ?? 'Belum Ditugaskan'}</span>
                    </div>
                  </div>

                  <div style={{
                    flex: 1, minWidth: 200, padding: 20, background: '#fff', borderRadius: 16,
                    border: '1.5px solid #1155a8', boxShadow: '0 8px 24px rgba(17,85,168,0.08)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1155a8', textTransform: 'uppercase', marginBottom: 8 }}>
                      Total Skor Penilaian
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0b2d6b', lineHeight: 1 }}>
                      {s.total_skor}
                    </div>
                    {s.predikat && (() => {
                      const badge = getPredikatBadgeStyle(s.predikat);
                      return (
                        <span style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: '4px 14px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 8,
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: badge.text,
                            display: 'inline-block'
                          }} />
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Detail Nilai */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, background: '#fff', border: '1px solid #edf1fb', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7faa', marginBottom: 4 }}>Nilai Keterampilan (30%)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2744' }}>{s.keterampilan}</div>
                  </div>
                  <div style={{ flex: 1, background: '#fff', border: '1px solid #edf1fb', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7faa', marginBottom: 4 }}>Nilai Kehadiran (30%)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2744' }}>{s.persen_hadir}%</div>
                  </div>
                  <div style={{ flex: 1, background: '#fff', border: '1px solid #edf1fb', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7faa', marginBottom: 4 }}>Nilai Prestasi (40%)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2744' }}>{s.prestasi}</div>
                  </div>
                </div>

                {/* Riwayat Prestasi */}
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a2744', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Medal size={18} style={{ color: '#d97706' }} /> Riwayat Kejuaraan ({realPrestasi.length})
                  </h4>
                  
                  {realPrestasi.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {realPrestasi.map((p, pi) => {
                        const tc = TINGKATAN_COLOR[p.tingkatan] ?? '#6b7faa';
                        return (
                          <div key={pi} style={{
                            background: '#fff', border: `1px solid ${tc}30`, borderLeft: `4px solid ${tc}`,
                            borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)', position: 'relative'
                          }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                              background: tc + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.1rem',
                            }}>
                              {p.tingkatan === 'Internasional' ? '🌐' : p.tingkatan === 'Nasional' ? '🏆' : p.tingkatan === 'Provinsi' ? '🥈' : p.tingkatan === 'Kabupaten/Kota' ? '🥉' : '🎖️'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a2744', lineHeight: 1.3, marginBottom: 6 }}>
                                {p.nama_kejuaraan || '(Tanpa Nama Kejuaraan)'}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: tc + '18', color: tc, border: `1px solid ${tc}30` }}>
                                  {p.tingkatan}
                                </span>
                                {p.peringkat && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#f9c74f20', color: '#b45309', border: '1px solid #f9c74f50' }}>
                                    {p.peringkat}
                                  </span>
                                )}
                                {p.bulan && (
                                  <span style={{ fontSize: '0.7rem', color: '#6b7faa', fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                                    {BULAN[p.bulan] || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            {p.bukti_foto && (
                              <button
                                onClick={() => setCertificateUrl(`/api/${p.bukti_foto}`)}
                                title="Lihat Bukti Sertifikat"
                                style={{
                                  width: 34, height: 34, borderRadius: '50%',
                                  background: 'rgba(17,85,168,0.06)',
                                  color: '#1155a8',
                                  border: '1px solid rgba(17,85,168,0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#1155a8';
                                  e.currentTarget.style.color = '#fff';
                                  e.currentTarget.style.transform = 'scale(1.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(17,85,168,0.06)';
                                  e.currentTarget.style.color = '#1155a8';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Eye size={16} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center', background: '#f8faff', borderRadius: 12, color: '#a0b0cc', border: '1px dashed #dce6f7' }}>
                      Belum ada data kejuaraan/prestasi yang diikuti siswa.
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL RIWAYAT NILAI (PUBLIC) */}
      {riwayatOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setRiwayatOpen(false)}>
          <div style={{
            background: '#ffffff', border: '1px solid #dce6f7',
            borderRadius: 20, maxWidth: 800, width: '100%', maxHeight: '85vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(11,45,107,0.35)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #edf1fb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(90deg, #f8faff, #fff)',
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b2d6b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={20} style={{ color: '#f9c74f' }} /> Riwayat Nilai Siswa
                </h3>
                {riwayatData && (
                  <p style={{ fontSize: '0.85rem', color: '#6b7faa', marginTop: 4, marginBottom: 0 }}>
                    {riwayatData.siswa.nama} ({riwayatData.siswa.nis}) - <span style={{ fontWeight: 600 }}>{riwayatData.siswa.nama_cabang}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setRiwayatOpen(false)} style={{
                background: 'rgba(17,85,168,0.06)', border: 'none', color: '#3a4f80',
                cursor: 'pointer', width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
              }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ overflow: 'auto', flex: 1, padding: '24px' }}>
              {loadingRiwayat ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <div style={{ width: 40, height: 40, border: '4px solid #edf1fb', borderTopColor: '#1155a8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : !riwayatData || riwayatData.riwayat.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0b0cc', background: '#f8faff', borderRadius: 16, border: '1px dashed #dce6f7' }}>
                  <AlertCircle size={36} style={{ margin: '0 auto 12px', color: '#dce6f7' }} />
                  Belum ada riwayat nilai final untuk siswa ini.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #edf1fb' }}>
                  <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        {['Tahun Ajaran', 'Kelas', 'Keterampilan', 'Prestasi', 'Kehadiran', 'Nilai Akhir', 'Predikat'].map(h => (
                          <th key={h} style={{
                            background: '#f8faff', color: '#3a4f80', fontWeight: 700,
                            padding: '12px 16px', textAlign: h === 'Tahun Ajaran' ? 'left' : 'center',
                            borderBottom: '2px solid #edf1fb', whiteSpace: 'nowrap'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatData.riwayat.map((rw: any, i: number) => (
                        <tr key={rw.penilaian_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafcff', borderBottom: '1px solid #edf1fb' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1a2744', whiteSpace: 'nowrap' }}>
                            {rw.tahun_ajaran} <span style={{ color: '#a0b0cc', fontWeight: 500 }}>- Smt {rw.semester}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              background: '#edf1fb',
                              color: '#1155a8',
                              border: '1px solid #cbdffe',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {rw.kelas_saat_dinilai}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>{Number(rw.nilai_keterampilan).toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>{Number(rw.nilai_prestasi).toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>{Number(rw.nilai_kehadiran).toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#c1272d', fontSize: '1rem' }}>
                            {Number(rw.nilai_akhir).toFixed(2)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {(() => {
                              const badge = getPredikatBadgeStyle(rw.predikat);
                              return (
                                <span style={{
                                  background: badge.bg,
                                  color: badge.text,
                                  border: `1px solid ${badge.border}`,
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  whiteSpace: 'nowrap'
                                }}>
                                  <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: badge.text,
                                    display: 'inline-block'
                                  }} />
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SERTIFIKAT */}
      {certificateUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(11,45,107,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setCertificateUrl(null)}>
          <div style={{
            background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #edf1fb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(90deg, #f8faff, #fff)'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b2d6b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} style={{ color: '#1155a8' }} /> Bukti Sertifikat
              </h4>
              <button onClick={() => setCertificateUrl(null)} style={{
                background: 'rgba(17,85,168,0.06)', border: 'none', width: 36, height: 36,
                borderRadius: '50%', color: '#3a4f80', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.2s'
              }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24, overflow: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={certificateUrl} alt="Sertifikat" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ GALERI PRESTASI ══════════════════════ */}
      <section id="galeri" style={{ padding: '80px 24px', background: '#f0f4ff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          {/* Header */}
          <div className="lp-animate-hidden" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(193,39,45,0.08)', border: '1px solid rgba(193,39,45,0.18)',
              borderRadius: 30, padding: '5px 16px', marginBottom: 16,
              color: '#c1272d', fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Images size={13} className="lp-badge-icon" />
              GALERI PRESTASI
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0b2d6b',
              fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1.2, marginBottom: 12,
            }}>
              Momen Kejuaraan &amp; Prestasi
            </h2>
            <p style={{ color: '#6b7faa', fontSize: '1rem', maxWidth: 520, margin: '0 auto' }}>
              Rekam jejak gemilang SMANKO di pentas nasional dan internasional.
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            {GALERI_FILTER_OPTS.map(opt => (
              <button
                key={opt}
                onClick={() => { setGaleriFilter(opt); setGaleriPage(1) }}
                className={`lp-filter-pill${galeriFilter === opt ? ' active' : ''}`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="lp-animate-hidden" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 20,
            marginBottom: 32,
          }}>
            {paginatedGaleri.map((item, i) => (
              <div
                key={(galeriPage - 1) * PAGE_GALERI + i}
                className="lp-galeri-card"
                onClick={() => setLightboxIdx(GALERI_ITEMS.indexOf(item))}
                style={{
                  borderRadius: 16, overflow: 'hidden',
                  background: '#fff',
                  border: '1.5px solid #dce6f7',
                  boxShadow: '0 4px 16px rgba(17,85,168,0.07)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  position: 'relative',
                }}
              >
                {/* Photo */}
                <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={item.src}
                    alt={item.kejuaraan}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                    className="lp-galeri-img"
                  />
                  {/* Overlay */}
                  <div className="lp-galeri-overlay" style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(11,45,107,0.75) 0%, transparent 55%)',
                    opacity: 0, transition: 'opacity 0.3s',
                    display: 'flex', alignItems: 'flex-end',
                    padding: '14px 16px',
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Lihat Detail</span>
                  </div>
                  {/* Tingkat badge */}
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: TINGKAT_COLOR[item.tingkat] ?? '#6b7faa',
                    color: '#fff', borderRadius: 20,
                    padding: '3px 11px', fontSize: '0.68rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}>
                    ★ {item.tingkat}
                  </div>
                </div>

                {/* Caption */}
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.82rem', color: '#0b2d6b',
                    fontFamily: "'Poppins',sans-serif",
                    marginBottom: 4, lineHeight: 1.3,
                  }}>
                    {item.kejuaraan}
                  </div>
                  <div style={{
                    fontSize: '0.72rem', color: '#6b7faa', lineHeight: 1.55,
                    marginBottom: 10,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.deskripsi}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: 'rgba(17,85,168,0.08)', color: '#1155a8',
                      borderRadius: 10, padding: '2px 10px',
                      fontSize: '0.68rem', fontWeight: 600,
                    }}>
                      {item.cabang}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#a0b0cc' }}>{item.tahun}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalGaleriPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', borderRadius: 14, border: '1.5px solid #dce6f7',
              padding: '12px 20px', boxShadow: '0 2px 12px rgba(17,85,168,0.06)',
            }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7faa' }}>
                Menampilkan {(galeriPage - 1) * PAGE_GALERI + 1}–{Math.min(galeriPage * PAGE_GALERI, filteredGaleri.length)} dari {filteredGaleri.length} foto
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setGaleriPage(p => Math.max(1, p - 1))}
                  disabled={galeriPage === 1}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: '#fff', border: '1.5px solid #dce6f7',
                    fontSize: '0.8rem', fontWeight: 600,
                    cursor: galeriPage === 1 ? 'not-allowed' : 'pointer',
                    color: galeriPage === 1 ? '#a0b0cc' : '#1155a8',
                  }}
                >← Prev</button>

                {Array.from({ length: totalGaleriPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setGaleriPage(p)}
                    style={{
                      width: 34, height: 34, borderRadius: 8,
                      border: `1.5px solid ${galeriPage === p ? '#1155a8' : '#dce6f7'}`,
                      background: galeriPage === p ? '#1155a8' : '#fff',
                      color: galeriPage === p ? '#fff' : '#6b7faa',
                      fontWeight: galeriPage === p ? 700 : 500,
                      fontSize: '0.82rem', cursor: 'pointer',
                    }}
                  >{p}</button>
                ))}

                <button
                  onClick={() => setGaleriPage(p => Math.min(totalGaleriPages, p + 1))}
                  disabled={galeriPage === totalGaleriPages}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: '#fff', border: '1.5px solid #dce6f7',
                    fontSize: '0.8rem', fontWeight: 600,
                    cursor: galeriPage === totalGaleriPages ? 'not-allowed' : 'pointer',
                    color: galeriPage === totalGaleriPages ? '#a0b0cc' : '#1155a8',
                  }}
                >Next →</button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(7,18,47,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          {/* Prev */}
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(prev => ((prev! - 1 + GALERI_ITEMS.length) % GALERI_ITEMS.length)) }}
            style={{
              position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50%', width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', zIndex: 10,
            }}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Image card */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, overflow: 'hidden',
              maxWidth: 720, width: '100%',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              animation: 'lbFadeIn 0.25s ease',
            }}
          >
            <img
              src={GALERI_ITEMS[lightboxIdx].src}
              alt={GALERI_ITEMS[lightboxIdx].kejuaraan}
              style={{ width: '100%', maxHeight: '60vh', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '18px 22px 22px' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                marginBottom: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Nama kejuaraan */}
                  <div style={{
                    fontWeight: 800, fontSize: '1.05rem', color: '#0b2d6b',
                    fontFamily: "'Poppins',sans-serif", marginBottom: 8,
                    lineHeight: 1.3,
                  }}>
                    {GALERI_ITEMS[lightboxIdx].kejuaraan}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: (TINGKAT_COLOR[GALERI_ITEMS[lightboxIdx].tingkat] ?? '#6b7faa') + '18',
                      color: TINGKAT_COLOR[GALERI_ITEMS[lightboxIdx].tingkat] ?? '#6b7faa',
                      border: `1px solid ${(TINGKAT_COLOR[GALERI_ITEMS[lightboxIdx].tingkat] ?? '#6b7faa')}30`,
                      borderRadius: 20, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      ★ {GALERI_ITEMS[lightboxIdx].tingkat}
                    </span>
                    <span style={{
                      background: 'rgba(17,85,168,0.08)', color: '#1155a8',
                      borderRadius: 20, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 600,
                    }}>
                      {GALERI_ITEMS[lightboxIdx].cabang}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#a0b0cc', alignSelf: 'center' }}>
                      {GALERI_ITEMS[lightboxIdx].tahun}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setLightboxIdx(null)}
                  style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
                    background: '#fee2e2', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c1272d',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {/* Deskripsi */}
              <div style={{
                fontSize: '0.82rem', color: '#3a4f80', lineHeight: 1.7,
                background: '#f5f8ff', borderRadius: 10, padding: '10px 14px',
                marginBottom: 10,
                border: '1px solid #edf1fb',
              }}>
                {GALERI_ITEMS[lightboxIdx].deskripsi}
              </div>
              {/* Counter */}
              <div style={{ fontSize: '0.75rem', color: '#a0b0cc', textAlign: 'right' }}>
                {lightboxIdx + 1} / {GALERI_ITEMS.length}
              </div>
            </div>
          </div>

          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(prev => ((prev! + 1) % GALERI_ITEMS.length)) }}
            style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50%', width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', zIndex: 10,
            }}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {/* ══════════════════════ LOKASI ══════════════════════ */}
      <section id="lokasi" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="lp-animate-hidden" style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(17,85,168,0.08)', border: '1px solid rgba(17,85,168,0.15)',
              borderRadius: 30, padding: '5px 16px', marginBottom: 16,
              color: '#1155a8', fontSize: '0.78rem', fontWeight: 700,
            }}>
              <MapPin size={13} className="lp-badge-icon" />
              TEMUKAN KAMI
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0b2d6b',
              fontFamily: "'Bebas Neue',sans-serif", lineHeight: 1.2,
            }}>
              Lokasi Sekolah
            </h2>
          </div>

          <div className="lp-animate-hidden" style={{ display: 'grid', gap: 36, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,360px),1fr))', alignItems: 'start' }}>
            {/* Info */}
            <div>
              <div style={{ background: '#f0f4ff', borderRadius: 16, border: '1.5px solid #dce6f7', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1155a8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0b2d6b', fontSize: '0.95rem', marginBottom: 4 }}>Alamat Lengkap</div>
                    <p style={{ fontSize: '0.88rem', color: '#3a4f80', lineHeight: 1.7, margin: 0 }}>
                      Jl. Pajjaiang, Sudiang Raya,<br />
                      Kec. Biringkanaya, Kota Makassar,<br />
                      Sulawesi Selatan 90552
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: <Phone size={16}/>, label: 'TELEPON', val: '(0411) 555-1234' },
                    { icon: <Mail size={16}/>,  label: 'EMAIL',   val: 'info@smanko.sch.id' },
                  ].map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1155a820', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1155a8' }}>
                        {c.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7faa', fontWeight: 600 }}>{c.label}</div>
                        <div style={{ fontSize: '0.88rem', color: '#1a2744', fontWeight: 600 }}>{c.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Map */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #dce6f7', boxShadow: '0 8px 32px rgba(17,85,168,0.10)', height: 420 }}>
              <iframe
                title="Lokasi SMANKO Sulawesi Selatan"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2921.289002692275!2d119.52710500416966!3d-5.103660458796101!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dbefb7422f2ddeb%3A0x70964948f504e0ba!2sSMP%2FSMA%20Negeri%20Khusus%20Keberbakatan%20Olahraga%20Sulawesi%20Selatan!5e0!3m2!1sid!2sid!4v1777043818116!5m2!1sid!2sid"
                width="100%" height="100%" style={{ border: 0, display: 'block' }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer style={{ background: 'linear-gradient(180deg, #0b2d6b 0%, #071a47 100%)', color: '#fff', padding: '60px 24px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="lp-animate-hidden" style={{
            display: 'grid', gap: 40,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            paddingBottom: 48, borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* Col 1 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)' }}>
                  <img src="/logo-smanko.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>SMANKO</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Sulawesi Selatan</div>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: 18 }}>
                SMA Negeri Khusus Keberbakatan Olahraga Provinsi Sulawesi Selatan — mencetak atlet berprestasi tinggi yang juga unggul secara akademik.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ icon: <Facebook size={16}/>, label: 'Facebook' },{ icon: <Instagram size={16}/>, label: 'Instagram' },{ icon: <Youtube size={16}/>, label: 'YouTube' }].map(s => (
                  <a key={s.label} href="#" aria-label={s.label} className="lp-social-btn">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 18, letterSpacing: '0.04em' }}>Tautan Cepat</div>
              {['Beranda','Cabang Olahraga','Papan Klasemen','Galeri Prestasi','Lokasi Sekolah','Login Portal'].map(l => (
                <div key={l}>
                  <a href="#" className="lp-footer-link" onClick={e => {
                    e.preventDefault()
                    if (l === 'Login Portal') navigate('/login')
                    else if (l === 'Papan Klasemen') scrollTo('klasemen')
                    else if (l === 'Cabang Olahraga') scrollTo('cabor')
                    else if (l === 'Galeri Prestasi') scrollTo('galeri')
                    else if (l === 'Lokasi Sekolah') scrollTo('lokasi')
                    else scrollTo('beranda')
                  }}>
                    <ChevronRight size={12} />
                    {l}
                  </a>
                </div>
              ))}
            </div>

            {/* Col 3 */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 18, letterSpacing: '0.04em' }}>Kontak &amp; Alamat</div>
              {[
                { icon: <MapPin size={14}/>, text: 'Jl. Pajjaiang, Sudiang Raya, Makassar, Sul-Sel 90552' },
                { icon: <Phone size={14}/>,  text: '(0411) 555-1234' },
                { icon: <Mail size={14}/>,   text: 'info@smanko.sch.id' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: '#f9c74f', marginTop: 2, flexShrink: 0 }}>{c.icon}</span>
                  <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{c.text}</span>
                </div>
              ))}
              <button onClick={() => navigate('/login')} style={{
                marginTop: 8, width: '100%',
                background: 'linear-gradient(135deg,#c1272d,#e84a4f)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '11px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <ExternalLink size={14} />
                Login Portal Sistem
              </button>
            </div>
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
            © 2026 SMA Negeri Khusus Keberbakatan Olahraga Sulawesi Selatan. Hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* Semua styling dipindah ke index.css — PREMIUM DESIGN UPGRADE */}
    </div>
  )
}
