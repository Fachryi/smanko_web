// ============================================================
// src/utils/printAlumniReport.ts
// Cetak laporan alumni untuk Wakasek Kesiswaan
// ============================================================

const PREDIKAT_COLOR: Record<string, string> = {
  'A (Istimewa)': '#16a34a', 'B (Baik)': '#2563eb',
  'C (Cukup)': '#d97706', 'D (Kurang)': '#ea580c',
  'E (Sangat Kurang)': '#dc2626',
}

const TINGKATAN_COLOR: Record<string, string> = {
  'Internasional': '#f9a825', 'Nasional': '#a855f7',
  'Provinsi': '#3b82f6', 'Kabupaten/Kota': '#22c55e',
  'Kecamatan': '#14b8a6', 'Pelajar/Sekolah': '#e85d2f',
}

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// ── List Report ──────────────────────────────────────────
export interface AlumniListReportData {
  alumni: Array<{
    siswa_id: number; nisn: string; nis: string; nama: string
    kelas_terakhir: string; jenis_kelamin: string
    nama_cabang: string; kode_cabang: string
    tahun_lulus: string; total_prestasi: number
    nilai_akhir_tertinggi: number | null
  }>
  wakasekNama: string
}

export async function printAlumniListReport(d: AlumniListReportData): Promise<void> {
  let ksNama = 'A. Syamsualam, S.Pd., M.Si.'
  let ksNip  = '198012202009041001'
  try {
    const token = localStorage.getItem('smanko_token')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/settings/sekolah.php', { headers })
    const json = await res.json()
    if (json?.data?.kepala_sekolah_nama) ksNama = json.data.kepala_sekolah_nama
    if (json?.data?.kepala_sekolah_nip)  ksNip  = json.data.kepala_sekolah_nip
  } catch { }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = d.alumni.map((a, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><code>${a.nisn}</code></td>
      <td><code>${a.nis}</code></td>
      <td><strong>${a.nama}</strong></td>
      <td class="center">${a.jenis_kelamin}</td>
      <td><span style="font-size:8.5pt">${a.kelas_terakhir}</span></td>
      <td>${a.nama_cabang}</td>
      <td class="center">${a.tahun_lulus || '-'}</td>
      <td class="center">${a.total_prestasi}</td>
      <td class="center bold">${a.nilai_akhir_tertinggi !== null ? Number(a.nilai_akhir_tertinggi).toFixed(2) : '-'}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Daftar Alumni – SMANKO</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Times New Roman',serif; font-size:11pt; color:#111; background:#fff; padding:15mm 15mm 12mm; }

  .header { display:flex; align-items:center; gap:14px; border-bottom:3px double #1a1a2e; padding-bottom:10px; margin-bottom:12px; }
  .logo-box { width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0; }
  .logo-box img { width:100%; height:100%; object-fit:cover; }
  .school-info h1 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;color:#1a1a2e; }
  .school-info p { font-size:8.5pt;color:#444;margin-top:2px; }

  .doc-title { text-align:center;margin:12px 0 16px; }
  .doc-title h2 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a2e; }
  .doc-title .sub { font-size:9.5pt;color:#555;margin-top:3px; }

  table { width:100%;border-collapse:collapse;font-size:9pt; }
  th { background:#2d3352;color:#fff;font-family:Arial,sans-serif;font-weight:600;font-size:8.5pt;padding:6px;text-align:left; }
  td { padding:5px 6px;border-bottom:1px solid #e9ecef; }
  tr:nth-child(even) td { background:#f8f9fa; }
  .center { text-align:center; }
  .bold   { font-weight:700; }

  .signature-row { display:flex; justify-content:space-between; padding:0 60px; margin-top:40px; }
  .sig-box { text-align:center; }
  .sig-box .sig-label { font-size:9.5pt;font-weight:700;margin-bottom:54px;color:#333; }
  .sig-box .sig-line { border-top:1px solid #333;padding-top:4px; }
  .sig-box .sig-name { font-size:9.5pt;font-weight:700; }
  .sig-box .sig-nip  { font-size:8.5pt;color:#555; }

  .footer { margin-top:16px;border-top:1px solid #dee2e6;padding-top:8px;font-size:8pt;color:#888;display:flex;justify-content:space-between; }

  @media print { body{padding:8mm 12mm 8mm;} @page{size:A4 landscape;margin:0;} }
</style>
</head>
<body>
<div class="header">
  <div class="logo-box">
    <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
  </div>
  <div class="school-info">
    <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
    <p>Sulawesi Selatan &nbsp;|&nbsp; Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar</p>
  </div>
</div>

<div class="doc-title">
  <h2>Daftar Alumni</h2>
  <div class="sub">Tanggal Cetak: ${today} &nbsp;|&nbsp; Total Alumni: ${d.alumni.length}</div>
</div>

<table>
  <thead>
    <tr>
      <th class="center" style="width:36px">No</th>
      <th style="width:90px">NISN</th>
      <th style="width:70px">NIS</th>
      <th>Nama Alumni</th>
      <th class="center" style="width:36px">JK</th>
      <th>Kelas Terakhir</th>
      <th>Cabang Olahraga</th>
      <th class="center">Tahun Lulus</th>
      <th class="center">Total Prestasi</th>
      <th class="center">Nilai Akhir</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="signature-row">
  <div class="sig-box">
    <div class="sig-label">Mengetahui,<br>Kepala Sekolah</div>
    <div class="sig-line"><div class="sig-name">${ksNama}</div><div class="sig-nip">NIP. ${ksNip}</div></div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Makassar, ${today}<br>Wakasek Kesiswaan</div>
    <div class="sig-line"><div class="sig-name">${d.wakasekNama}</div><div class="sig-nip">NIP. ...............................</div></div>
  </div>
</div>

<div class="footer">
  <span>SMANKO – Sistem Informasi Rekapitulasi Nilai Cabang Olahraga</span>
  <span>Dokumen ini dicetak dari sistem resmi.</span>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes')
  if (!w) { alert('Popup diblokir. Izinkan popup untuk mencetak laporan.'); return }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

// ── Detail Report ────────────────────────────────────────
export interface AlumniDetailReportData {
  siswa: {
    nisn: string; nis: string; nama: string
    kelas_terakhir: string; jenis_kelamin: string
    nama_cabang: string; kode_cabang: string
  }
  riwayat: Array<{
    tahun_ajaran: string; semester: number
    kelas_saat_dinilai: string
    nilai_keterampilan: number; nilai_prestasi: number
    nilai_kehadiran: number; nilai_akhir: number
    predikat: string; status: string; nama_guru: string
  }>
  prestasi: Array<{
    nama_kejuaraan: string; tingkatan: string
    peringkat: string; nilai_prestasi: number
    bulan: number; tahun_ajaran: string; semester: number
  }>
  wakasekNama: string
}

export async function printAlumniDetailReport(d: AlumniDetailReportData): Promise<void> {
  let ksNama = 'A. Syamsualam, S.Pd., M.Si.'
  let ksNip  = '198012202009041001'
  try {
    const token = localStorage.getItem('smanko_token')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/settings/sekolah.php', { headers })
    const json = await res.json()
    if (json?.data?.kepala_sekolah_nama) ksNama = json.data.kepala_sekolah_nama
    if (json?.data?.kepala_sekolah_nip)  ksNip  = json.data.kepala_sekolah_nip
  } catch { }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const riwayatRows = d.riwayat.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td class="center">${r.tahun_ajaran}</td>
      <td class="center">Semester ${r.semester}</td>
      <td class="center">${r.kelas_saat_dinilai}</td>
      <td class="center">${Number(r.nilai_keterampilan || 0).toFixed(2)}</td>
      <td class="center">${Number(r.nilai_prestasi || 0).toFixed(2)}</td>
      <td class="center">${Number(r.nilai_kehadiran || 0).toFixed(2)}</td>
      <td class="center bold" style="color:${PREDIKAT_COLOR[r.predikat] || '#111'}">${Number(r.nilai_akhir || 0).toFixed(2)}</td>
      <td class="center" style="color:${PREDIKAT_COLOR[r.predikat] || '#111'};font-weight:700;font-size:8.5pt">${r.predikat || '-'}</td>
      <td class="center"><span style="background:${r.status==='final'?'#dcfce7':'#fef9c3'};color:${r.status==='final'?'#166534':'#92400e'};padding:2px 6px;border-radius:4px;font-size:8pt">${r.status === 'final' ? 'Final' : 'Draft'}</span></td>
      <td>${r.nama_guru || '-'}</td>
    </tr>`).join('')

  const prestasiRows = d.prestasi.map((p, i) => {
    const bulanStr = p.bulan ? BULAN_NAMES[p.bulan] : '-'
    return `
    <tr>
      <td class="center">${i + 1}</td>
      <td class="center">${p.tahun_ajaran}</td>
      <td class="center">Semester ${p.semester}</td>
      <td><strong>${p.nama_kejuaraan || '-'}</strong></td>
      <td class="center" style="color:${TINGKATAN_COLOR[p.tingkatan] || '#6b7280'};font-weight:700;font-size:8.5pt">${p.tingkatan || '-'}</td>
      <td class="center" style="font-weight:600">${p.peringkat || '-'}</td>
      <td class="center bold" style="color:#d97706">${Number(p.nilai_prestasi || 0).toFixed(0)}</td>
      <td class="center">${bulanStr}</td>
    </tr>`
  }).join('')

  const rataKeterampilan = d.riwayat.length > 0
    ? (d.riwayat.reduce((s, r) => s + Number(r.nilai_keterampilan || 0), 0) / d.riwayat.length).toFixed(2) : '0.00'
  const rataPrestasi = d.riwayat.length > 0
    ? (d.riwayat.reduce((s, r) => s + Number(r.nilai_prestasi || 0), 0) / d.riwayat.length).toFixed(2) : '0.00'
  const rataKehadiran = d.riwayat.length > 0
    ? (d.riwayat.reduce((s, r) => s + Number(r.nilai_kehadiran || 0), 0) / d.riwayat.length).toFixed(2) : '0.00'
  const rataAkhir = d.riwayat.length > 0
    ? (d.riwayat.reduce((s, r) => s + Number(r.nilai_akhir || 0), 0) / d.riwayat.length).toFixed(2) : '0.00'

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Detail Alumni – ${d.siswa.nama}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Times New Roman',serif; font-size:11pt; color:#111; background:#fff; padding:15mm 15mm 12mm; }

  .header { display:flex; align-items:center; gap:14px; border-bottom:3px double #1a1a2e; padding-bottom:10px; margin-bottom:12px; }
  .logo-box { width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0; }
  .logo-box img { width:100%; height:100%; object-fit:cover; }
  .school-info h1 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;color:#1a1a2e; }
  .school-info p { font-size:8.5pt;color:#444;margin-top:2px; }

  .doc-title { text-align:center;margin:12px 0 8px; }
  .doc-title h2 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a2e; }
  .doc-title .sub { font-size:9.5pt;color:#555;margin-top:3px; }

  .info-box { background:#f8f9fa; border:1px solid #dee2e6; border-radius:6px; padding:10px 16px; margin-bottom:14px; display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:6px; }
  .info-item { font-size:9pt; }
  .info-item .label { font-size:7.5pt; color:#888; font-family:Arial,sans-serif; }
  .info-item .value { font-weight:700; font-size:10pt; }

  .section-title { font-family:Arial,sans-serif; font-size:9.5pt; font-weight:700; text-transform:uppercase; color:#1a1a2e; border-left:3px solid #e85d2f; padding-left:7px; margin:14px 0 6px; }

  table { width:100%;border-collapse:collapse;font-size:8.5pt; }
  th { background:#2d3352;color:#fff;font-family:Arial,sans-serif;font-weight:600;font-size:8pt;padding:5px 6px;text-align:left; }
  td { padding:4px 6px;border-bottom:1px solid #e9ecef; }
  tr:nth-child(even) td { background:#f8f9fa; }
  .center { text-align:center; }
  .bold   { font-weight:700; }

  .signature-row { display:flex; justify-content:space-between; padding:0 60px; margin-top:32px; page-break-inside:avoid; }
  .sig-box { text-align:center; }
  .sig-box .sig-label { font-size:9.5pt;font-weight:700;margin-bottom:54px;color:#333; }
  .sig-box .sig-line { border-top:1px solid #333;padding-top:4px; }
  .sig-box .sig-name { font-size:9.5pt;font-weight:700; }
  .sig-box .sig-nip  { font-size:8.5pt;color:#555; }

  .footer { margin-top:16px;border-top:1px solid #dee2e6;padding-top:8px;font-size:8pt;color:#888;display:flex;justify-content:space-between; }

  @media print { body{padding:8mm 12mm 8mm;} @page{size:A4 landscape;margin:0;} }
</style>
</head>
<body>
<div class="header">
  <div class="logo-box">
    <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
  </div>
  <div class="school-info">
    <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
    <p>Sulawesi Selatan &nbsp;|&nbsp; Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar</p>
  </div>
</div>

<div class="doc-title">
  <h2>Detail Alumni</h2>
  <div class="sub">Tanggal Cetak: ${today}</div>
</div>

<div class="info-box">
  <div class="info-item"><div class="label">NISN</div><div class="value">${d.siswa.nisn}</div></div>
  <div class="info-item"><div class="label">NIS</div><div class="value">${d.siswa.nis}</div></div>
  <div class="info-item"><div class="label">Nama Alumni</div><div class="value">${d.siswa.nama}</div></div>
  <div class="info-item"><div class="label">Jenis Kelamin</div><div class="value">${d.siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div></div>
  <div class="info-item"><div class="label">Cabang Olahraga</div><div class="value">${d.siswa.nama_cabang} (${d.siswa.kode_cabang})</div></div>
  <div class="info-item"><div class="label">Kelas Terakhir</div><div class="value">${d.siswa.kelas_terakhir}</div></div>
  <div class="info-item"><div class="label">Total Semester</div><div class="value">${d.riwayat.length} semester</div></div>
  <div class="info-item"><div class="label">Total Prestasi</div><div class="value">${d.prestasi.length} prestasi</div></div>
</div>

<div class="section-title">1. Riwayat Nilai per Semester</div>
<table>
  <thead>
    <tr>
      <th class="center" style="width:32px">No</th>
      <th class="center">Tahun Ajaran</th>
      <th class="center" style="width:80px">Semester</th>
      <th class="center" style="width:70px">Kelas</th>
      <th class="center">Keterampilan</th>
      <th class="center">Prestasi</th>
      <th class="center">Kehadiran</th>
      <th class="center">Nilai Akhir</th>
      <th class="center">Predikat</th>
      <th class="center">Status</th>
      <th>Guru Penilai</th>
    </tr>
  </thead>
  <tbody>
    ${riwayatRows || '<tr><td colspan="11" class="center" style="color:#999;font-style:italic">Tidak ada data penilaian.</td></tr>'}
    <tr style="background:#f1f5f9;font-weight:700">
      <td colspan="4" style="text-align:right;padding-right:10px">Rata-rata:</td>
      <td class="center">${rataKeterampilan}</td>
      <td class="center">${rataPrestasi}</td>
      <td class="center">${rataKehadiran}</td>
      <td class="center">${rataAkhir}</td>
      <td colspan="3"></td>
    </tr>
  </tbody>
</table>

<div class="section-title">2. Prestasi Selama Bersekolah</div>
<table>
  <thead>
    <tr>
      <th class="center" style="width:32px">No</th>
      <th class="center">Tahun Ajaran</th>
      <th class="center" style="width:80px">Semester</th>
      <th>Nama Kejuaraan</th>
      <th class="center">Tingkatan</th>
      <th class="center">Peringkat</th>
      <th class="center">Nilai</th>
      <th class="center">Bulan</th>
    </tr>
  </thead>
  <tbody>
    ${prestasiRows || '<tr><td colspan="8" class="center" style="color:#999;font-style:italic">Tidak ada data prestasi.</td></tr>'}
  </tbody>
</table>

<div class="signature-row">
  <div class="sig-box">
    <div class="sig-label">Mengetahui,<br>Kepala Sekolah</div>
    <div class="sig-line"><div class="sig-name">${ksNama}</div><div class="sig-nip">NIP. ${ksNip}</div></div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Makassar, ${today}<br>Wakasek Kesiswaan</div>
    <div class="sig-line"><div class="sig-name">${d.wakasekNama}</div><div class="sig-nip">NIP. ...............................</div></div>
  </div>
</div>

<div class="footer">
  <span>SMANKO – Sistem Informasi Rekapitulasi Nilai Cabang Olahraga</span>
  <span>Dokumen ini dicetak dari sistem resmi.</span>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes')
  if (!w) { alert('Popup diblokir. Izinkan popup untuk mencetak laporan.'); return }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
