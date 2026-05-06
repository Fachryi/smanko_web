// ============================================================
// Types – SMANKO
// ============================================================

export type Role = 'admin' | 'guru_olahraga' | 'wakasek'

export interface User {
  id: number
  nama: string
  username: string
  role: Role
  status?: 'aktif' | 'nonaktif'
  created_at?: string
}

export interface AuthState {
  user: User | null
  token: string | null
}

export interface TahunAjaran {
  id: number
  nama: string
  semester: 1 | 2
  status: 'aktif' | 'tutup'
  created_at?: string
}

export interface ProfilPelatih {
  id: number
  cabang_olahraga_id: number
  nama: string
  foto: string | null
  no_telepon: string | null
  keterangan: string | null
}

export interface CabangOlahraga {
  id: number
  nama: string
  kode: string
  deskripsi?: string
  jumlah_siswa?: number
  jumlah_kriteria?: number
  created_at?: string
  nama_pelatih?: string
  siswa_list?: {nama:string, kelas:string, jenis_kelamin:string}[]
  profil_pelatih?: ProfilPelatih[]
}

export interface KriteriaKeterampilan {
  id: number
  cabang_olahraga_id: number
  nama_cabang?: string
  nama: string
  bobot: number
  urutan: number
  created_at?: string
}

export interface Siswa {
  id: number
  nisn: string
  nis: string
  nama: string
  kelas: string
  jenis_kelamin: 'L' | 'P'
  cabang_olahraga_id: number
  pelatih_id?: number | null
  nama_cabang?: string
  kode_cabang?: string
  nama_pelatih?: string
  status: 'aktif' | 'nonaktif'
  created_at?: string
}

export interface GuruKelas {
  id: number
  user_id: number
  nama_guru?: string
  username?: string
  kelas: string
  tahun_ajaran_id: number
  tahun_ajaran?: string
  semester?: number
}

export interface SettingPrestasi {
  id: number
  tingkatan: string
  nilai: number
  urutan: number
}

export interface SettingKehadiran {
  id: number
  kategori: string
  nilai_min: number
  nilai_max: number
  nilai_konversi: number
  urutan: number
}

export interface SettingBobotUtama {
  id: number
  bobot_keterampilan: number
  bobot_prestasi: number
  bobot_kehadiran: number
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message: string
  data?: T
}
