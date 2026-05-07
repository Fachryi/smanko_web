// ============================================================
// src/utils/printWakasekReport.ts
// Cetak laporan rekapitulasi lengkap untuk Wakasek Kesiswaan (semua siswa)
// ============================================================


export interface WakasekReportData {
  tahunAjaran: string
  overview: {
    total_siswa: number; total_dinilai: number
    rata_rata: number; tertinggi: number; terendah: number
  }
  allSiswa: Array<{
    nama: string; nisn: string; nis: string; kelas: string
    nama_cabang: string; jenis_kelamin: string
    nilai_keterampilan: number; nilai_prestasi: number
    nilai_kehadiran: number; nilai_akhir: number
    predikat: string; status: string
    prestasi_tingkatan: string; persen_hadir: number
    nama_guru: string
  }>
  wakasekNama: string
}

function prColor(p: string): string {
  return {
    'A (Istimewa)': '#16a34a', 'B (Baik)': '#2563eb',
    'C (Cukup)': '#d97706', 'D (Kurang)': '#ea580c',
    'E (Sangat Kurang)': '#dc2626',
  }[p] || '#374151'
}

export async function printWakasekReport(d: WakasekReportData): Promise<void> {
  // Ambil data kepala sekolah dari API
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
  } catch { /* gunakan fallback default */ }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const pct   = d.overview.total_siswa > 0
    ? ((d.overview.total_dinilai / d.overview.total_siswa) * 100).toFixed(1) : '0'

  // Group by kelas
  const byKelas: Record<string, typeof d.allSiswa> = {}
  d.allSiswa.forEach(s => {
    if (!byKelas[s.kelas]) byKelas[s.kelas] = []
    byKelas[s.kelas].push(s)
  })

  const kelasBlocks = Object.entries(byKelas).map(([kelas, siswaList]) => {
    const avg = siswaList.length
      ? (siswaList.reduce((s, r) => s + parseFloat(String(r.nilai_akhir)), 0) / siswaList.length).toFixed(2)
      : '0'
    const rows = siswaList.map((s, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td><code>${s.nisn}</code></td>
        <td><code>${s.nis}</code></td>
        <td><strong>${s.nama}</strong></td>
        <td class="center">${s.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
        <td>${s.nama_cabang}</td>
        <td class="center">${parseFloat(String(s.nilai_keterampilan)).toFixed(2)}</td>
        <td class="center">${parseFloat(String(s.nilai_prestasi)).toFixed(2)}</td>
        <td class="center">${parseFloat(String(s.nilai_kehadiran)).toFixed(2)} <small>(${s.persen_hadir}%)</small></td>
        <td class="center bold" style="color:${prColor(s.predikat)}">${parseFloat(String(s.nilai_akhir)).toFixed(2)}</td>
        <td class="center" style="color:${prColor(s.predikat)};font-weight:700;font-size:9pt">${s.predikat}</td>
        <td class="center"><span style="background:${s.status==='final'?'#dcfce7':'#fef9c3'};color:${s.status==='final'?'#166534':'#92400e'};padding:2px 6px;border-radius:4px;font-size:8pt">${s.status === 'final' ? 'Final' : 'Draft'}</span></td>
      </tr>`).join('')
    return `
      <div class="kelas-section">
        <div class="kelas-header">
          <span>Kelas ${kelas}</span>
          <span>${siswaList.length} Siswa &nbsp;|&nbsp; Rata-rata: <strong>${avg}</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="center" style="width:36px">No</th>
              <th style="width:90px">NISN</th>
              <th style="width:80px">NIS</th>
              <th>Nama Siswa</th>
              <th class="center" style="width:36px">JK</th>
              <th>Cabang</th>
              <th class="center">Keterampilan</th>
              <th class="center">Prestasi</th>
              <th class="center">Kehadiran</th>
              <th class="center">Nilai Akhir</th>
              <th class="center">Predikat</th>
              <th class="center">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Rekapitulasi Nilai – SMANKO</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Times New Roman',serif; font-size:11pt; color:#111; background:#fff; padding:15mm 15mm 12mm; }

  .header { display:flex; align-items:center; gap:14px; border-bottom:3px double #1a1a2e; padding-bottom:10px; margin-bottom:12px; }
  .logo-box { width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0; }
  .logo-box img { width:100%; height:100%; object-fit:cover; }
  .school-info h1 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;color:#1a1a2e; }
  .school-info p { font-size:8.5pt;color:#444;margin-top:2px; }

  .doc-title { text-align:center;margin:12px 0 10px; }
  .doc-title h2 { font-size:13pt;font-weight:700;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a2e; }
  .doc-title .sub { font-size:9.5pt;color:#555;margin-top:3px; }

  .overview-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px; }
  .ov-box { border:1px solid #dee2e6;border-radius:6px;padding:8px 10px;text-align:center; }
  .ov-box .ov-label { font-size:8pt;color:#777;font-family:Arial,sans-serif; }
  .ov-box .ov-val { font-size:15pt;font-weight:700;color:#1a1a2e;font-family:Arial,sans-serif;line-height:1.1;margin-top:3px; }

  .kelas-section { margin-bottom:18px; page-break-inside:avoid; }
  .kelas-header { display:flex;justify-content:space-between;align-items:center;background:#1a1a2e;color:#fff;padding:6px 12px;border-radius:4px 4px 0 0;font-family:Arial,sans-serif;font-size:9.5pt;font-weight:700; }

  table { width:100%;border-collapse:collapse;font-size:9.5pt; }
  th { background:#2d3352;color:#fff;font-family:Arial,sans-serif;font-weight:600;font-size:8.5pt;padding:5px 6px;text-align:left; }
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

  @media print { body{padding:8mm 12mm 8mm;} @page{size:A4 landscape;margin:0;} .kelas-section{page-break-inside:avoid;} }
</style>
</head>
<body>
<div class="header">
  <div class="logo-box">
    <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
  </div>
  <div class="school-info">
    <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
    <p>Sulawesi Selatan &nbsp;|&nbsp; Program Unggulan Atlet Berprestasi &nbsp;|&nbsp; Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar</p>
  </div>
</div>

<div class="doc-title">
  <h2>Laporan Rekapitulasi Nilai Cabang Olahraga</h2>
  <div class="sub">Tahun Ajaran: ${d.tahunAjaran} &nbsp;|&nbsp; Tanggal Cetak: ${today}</div>
</div>

<div class="overview-grid">
  <div class="ov-box"><div class="ov-label">Total Siswa</div><div class="ov-val">${d.overview.total_siswa}</div></div>
  <div class="ov-box"><div class="ov-label">Sudah Dinilai (${pct}%)</div><div class="ov-val">${d.overview.total_dinilai}</div></div>
  <div class="ov-box"><div class="ov-label">Rata-rata Keseluruhan</div><div class="ov-val">${parseFloat(String(d.overview.rata_rata)).toFixed(2)}</div></div>
  <div class="ov-box"><div class="ov-label">Nilai Tertinggi</div><div class="ov-val">${parseFloat(String(d.overview.tertinggi)).toFixed(2)}</div></div>
</div>

${kelasBlocks}

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
  <span>Halaman ini dicetak dari sistem resmi. Dokumen ini valid.</span>
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

export interface WakasekPrestasiData {
  tahunAjaran: string
  prestasi: Array<{
    siswa_id: number; nama_siswa: string; nisn: string; nis: string; kelas: string
    nama_cabang: string; nama_kejuaraan: string; bulan: number | ''
    tingkatan: string; peringkat: string; nilai_prestasi: number
    tanggal_input: string; nama_guru: string
  }>
  wakasekNama: string
}

export async function printWakasekPrestasiReport(d: WakasekPrestasiData): Promise<void> {
  // Ambil data kepala sekolah dari API
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
  } catch { /* gunakan fallback default */ }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const BULAN_NAMES = ['', 'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

  const groups: any[] = []
  d.prestasi.forEach(p => {
    const ext = groups.find(g => g.siswa_id === p.siswa_id)
    if (ext) ext.achievements.push(p)
    else groups.push({ ...p, achievements: [p] })
  })

  const rows = groups.map((g, i) => {
    let html = ''
    g.achievements.forEach((ach: any, idx: number) => {
      const bulanStr = ach.bulan ? BULAN_NAMES[ach.bulan] : (BULAN_NAMES[new Date(ach.tanggal_input).getMonth() + 1] || '-')
      
      if (idx === 0) {
        html += `
        <tr>
          <td class="center" rowspan="${g.achievements.length}">${i + 1}</td>
          <td rowspan="${g.achievements.length}"><code>${g.nisn}</code></td>
          <td rowspan="${g.achievements.length}"><code>${g.nis}</code></td>
          <td rowspan="${g.achievements.length}"><strong>${g.nama_siswa}</strong></td>
          <td rowspan="${g.achievements.length}"><span style="font-size:8.5pt">${g.kelas}</span></td>
          <td rowspan="${g.achievements.length}"><span style="font-size:8.5pt">${g.nama_cabang}</span></td>
          <td>${ach.nama_kejuaraan || '-'}</td>
          <td class="center">${bulanStr}</td>
          <td class="center"><strong>${ach.tingkatan || '-'}</strong></td>
          <td class="center">${ach.peringkat || '-'}</td>
          <td class="center bold" style="color:#d97706">${Number(ach.nilai_prestasi).toFixed(0)}</td>
          <td class="center"><span style="font-size:8.5pt">${ach.nama_guru || '-'}</span></td>
        </tr>`
      } else {
        html += `
        <tr>
          <td>${ach.nama_kejuaraan || '-'}</td>
          <td class="center">${bulanStr}</td>
          <td class="center"><strong>${ach.tingkatan || '-'}</strong></td>
          <td class="center">${ach.peringkat || '-'}</td>
          <td class="center bold" style="color:#d97706">${Number(ach.nilai_prestasi).toFixed(0)}</td>
          <td class="center"><span style="font-size:8.5pt">${ach.nama_guru || '-'}</span></td>
        </tr>`
      }
    })
    return html
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Daftar Prestasi Siswa – SMANKO</title>
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
  td { padding:6px;border-bottom:1px solid #e9ecef; }
  tr:nth-child(even) td { background:#f8f9fa; }
  .center { text-align:center; }
  .bold   { font-weight:700; }

  .signature-row { display:flex; justify-content:space-between; padding:0 60px; margin-top:40px; page-break-inside:avoid; }
  .sig-box { text-align:center; }
  .sig-box .sig-label { font-size:9.5pt;font-weight:700;margin-bottom:54px;color:#333; }
  .sig-box .sig-line { border-top:1px solid #333;padding-top:4px; }
  .sig-box .sig-name { font-size:9.5pt;font-weight:700; }
  .sig-box .sig-nip  { font-size:8.5pt;color:#555; }

  .footer { margin-top:20px;border-top:1px solid #dee2e6;padding-top:8px;font-size:8pt;color:#888;display:flex;justify-content:space-between;page-break-inside:avoid; }

  @media print { body{padding:8mm 12mm 8mm;} @page{size:A4 landscape;margin:0;}  }
</style>
</head>
<body>
<div class="header">
  <div class="logo-box">
    <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
  </div>
  <div class="school-info">
    <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
    <p>Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar &nbsp;|&nbsp; Telp. 082293040925 - 0811428083 &nbsp;|&nbsp; Laman : http//www.smankosulsel.com</p>
  </div>
</div>

<div class="doc-title">
  <h2>Daftar Capaian Prestasi Olahraga Siswa</h2>
  <div class="sub">Tahun Ajaran: ${d.tahunAjaran} &nbsp;|&nbsp; Tanggal Cetak: ${today} &nbsp;|&nbsp; Total: ${d.prestasi.length} Prestasi</div>
</div>

<table>
  <thead>
    <tr>
      <th class="center" style="width:36px">No</th>
      <th style="width:90px">NISN</th>
      <th style="width:70px">NIS</th>
      <th>Nama Siswa</th>
      <th>Kelas</th>
      <th>Cabang</th>
      <th>Nama Kejuaraan</th>
      <th class="center">Bulan</th>
      <th class="center">Tingkatan</th>
      <th class="center">Juara</th>
      <th class="center">Nilai</th>
      <th class="center">Dinilai Oleh</th>
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
  <span>Halaman ini dicetak dari sistem resmi. Dokumen ini valid.</span>
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
