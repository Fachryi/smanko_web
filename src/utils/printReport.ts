// ============================================================
// src/utils/printReport.ts
// Cetak/Export PDF raport nilai siswa individual (tanpa library eksternal)
// Menggunakan browser print window dengan CSS print layout
// ============================================================


export interface StudentReportData {
  siswa: {
    nama: string; nisn: string; nis: string; kelas: string
    jenis_kelamin: string; nama_cabang: string; kode_cabang: string
  }
  penilaian: {
    nilai_keterampilan: number; nilai_prestasi: number
    nilai_kehadiran: number; nilai_akhir: number
    predikat: string; catatan: string; status: string
    keterampilan: Array<{ nama_kriteria: string; bobot: number; nilai_mentah: number; nilai_berbobot?: number }>
    prestasi_list?: Array<{ tingkatan: string; nama_kejuaraan: string; nomor_pertandingan?: string; peringkat: string; nilai: number }>
    prestasi?: { tingkatan: string; nama_kejuaraan: string; nomor_pertandingan?: string; peringkat: string; nilai: number }
    kehadiran?: { total_sesi: number; total_hadir: number; persentase: number; nilai: number }
  }
  tahunAjaran: string
  guruNama: string
  bobot?: { keterampilan: number; prestasi: number; kehadiran: number }
}

function predikatColor(predikat: string): string {
  const map: Record<string, string> = {
    'A (Istimewa)': '#b45309', 'B (Baik)': '#166534',
    'C (Cukup)': '#1e40af',   'D (Kurang)': '#92400e',
    'E (Sangat Kurang)': '#991b1b',
  }
  return map[predikat] || '#374151'
}

function predikatBg(predikat: string): string {
  const map: Record<string, string> = {
    'A (Istimewa)': '#fef3c7', 'B (Baik)': '#dcfce7',
    'C (Cukup)': '#dbeafe',   'D (Kurang)': '#fef9c3',
    'E (Sangat Kurang)': '#fee2e2',
  }
  return map[predikat] || '#f3f4f6'
}

export async function printStudentReport(d: StudentReportData): Promise<void> {
  // Fetch data dinamis: kepala sekolah + pendamping cabor (paralel)
  let ksNama    = 'A. Syamsualam, S.Pd., M.Si.'
  let ksNip     = '198012202009041001'
  let pdNama    = ''
  let pdNip     = ''

  try {
    const token   = localStorage.getItem('smanko_token')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Cari cabang_olahraga_id dari kode cabang (via siswa.kode_cabang)
    // API pendamping menggunakan cabang_id, kita perlu id dari data siswa
    // Karena StudentReportData tidak expose cabang_id, kita fetch by kode via siswa
    const [resKS, resPD] = await Promise.allSettled([
      fetch('/api/settings/sekolah.php', { headers }).then(r => r.json()),
      // Fetch semua, lalu filter by kode_cabang di frontend
      fetch('/api/master/pendamping_cabor.php', { headers }).then(r => r.json()),
    ])

    if (resKS.status === 'fulfilled') {
      const j = resKS.value
      if (j?.data?.kepala_sekolah_nama) ksNama = j.data.kepala_sekolah_nama
      if (j?.data?.kepala_sekolah_nip)  ksNip  = j.data.kepala_sekolah_nip
    }

    if (resPD.status === 'fulfilled') {
      const j = resPD.value
      const list: Array<{nama: string; nip: string; nama_cabang?: string; is_utama: number}> = j?.data ?? []
      // 1. Filter pendamping yang cabornya sama
      const forCabor = list.filter(p =>
        (p.nama_cabang ?? '').toLowerCase() === d.siswa.nama_cabang.toLowerCase()
      )
      // 2. Ambil yang is_utama === 1, jika tidak ada, ambil yang pertama
      const match = forCabor.find(p => p.is_utama === 1) || forCabor[0]
      if (match) { pdNama = match.nama; pdNip = match.nip }
    }
  } catch { /* gunakan fallback default */ }

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  /* ── Keterampilan rows ── */
  const kriteriaRows = d.penilaian.keterampilan.map(k => {
    const berbobot = ((parseFloat(String(k.nilai_mentah)) || 0) * (parseFloat(String(k.bobot)) || 0) / 100).toFixed(2)
    return `
      <tr>
        <td>${k.nama_kriteria}</td>
        <td class="center">${k.bobot}%</td>
        <td class="center">${parseFloat(String(k.nilai_mentah)).toFixed(2)}</td>
        <td class="center bold">${berbobot}</td>
      </tr>`
  }).join('')

  /* ── Prestasi rows ── */
  const semuaPrestasi: Array<{ tingkatan: string; nama_kejuaraan: string; nomor_pertandingan?: string; peringkat: string; nilai: number }> =
    d.penilaian.prestasi_list?.length
      ? d.penilaian.prestasi_list
      : d.penilaian.prestasi ? [d.penilaian.prestasi] : []

  const nilaiTertinggi = semuaPrestasi.length > 0
    ? Math.max(...semuaPrestasi.map(p => parseFloat(String(p.nilai)) || 0))
    : 0

  const prestasiRows = semuaPrestasi.length > 0
    ? semuaPrestasi.map((p, i) => {
        const nilaiP = parseFloat(String(p.nilai)) || 0
        const isTop  = semuaPrestasi.length > 1 && nilaiP === nilaiTertinggi
        const nomor  = p.nomor_pertandingan || '-'
        return `
          <tr style="${isTop ? 'background:#fef3c7;' : ''}">
            <td class="center">${i + 1}</td>
            <td>${p.nama_kejuaraan || '<span style="color:#999">-</span>'}</td>
            <td class="center" style="font-size:8pt">${nomor}</td>
            <td class="center">${p.tingkatan}${isTop ? ' <span style="color:#b45309;font-size:7pt">★</span>' : ''}</td>
            <td class="center">${p.peringkat || '-'}</td>
            <td class="center bold" style="color:${isTop ? '#b45309' : '#1a1a2e'}">${nilaiP.toFixed(0)}</td>
          </tr>`
      }).join('')
    : `<tr><td colspan="6" class="center" style="color:#999;font-style:italic">Tidak Ada Prestasi</td></tr>`

  /* ── Kehadiran ── */
  const kehadiran = d.penilaian.kehadiran
  const bw        = d.bobot ?? { keterampilan: 50, prestasi: 30, kehadiran: 20 }

  const nilaiAkhir   = parseFloat(String(d.penilaian.nilai_akhir)).toFixed(2)
  const clr          = predikatColor(d.penilaian.predikat)
  const bg           = predikatBg(d.penilaian.predikat)

  const nilaiKet    = parseFloat(String(d.penilaian.nilai_keterampilan)) || 0
  const nilaiPrest  = parseFloat(String(d.penilaian.nilai_prestasi))    || 0
  const nilaiHadir  = parseFloat(String(d.penilaian.nilai_kehadiran))   || 0
  const kontribKet    = nilaiKet   * bw.keterampilan / 100
  const kontribPrest  = nilaiPrest * bw.prestasi     / 100
  const kontribHadir  = nilaiHadir * bw.kehadiran    / 100

  const statusLabel = d.penilaian.status === 'final'
    ? '<span style="color:#166534;font-weight:700">✓ FINAL</span>'
    : '<span style="color:#92400e">📝 DRAFT</span>'

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Raport Nilai – ${d.siswa.nama}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; }

  /* ─────────── SCREEN ─────────── */
  body {
    font-family: 'Times New Roman', serif;
    font-size: 10pt;
    color: #111;
    padding: 14mm 16mm 12mm;
  }

  /* ─────────── PRINT ─────────── */
  @media print {
    @page { size: A4; margin: 0; }

    body {
      padding: 0;
      /* Ruang untuk fixed header + konten */
      padding-top: 28mm;
      padding-left: 14mm;
      padding-right: 14mm;
      padding-bottom: 10mm;
      font-size: 9.5pt;
    }

    /* Kop surat muncul di setiap halaman saat print */
    .print-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #fff;
      padding: 6mm 14mm 4mm;
      z-index: 9999;
    }

    /* Sembunyikan kop normal (screen) saat print */
    .screen-header { display: none !important; }
  }

  @media screen {
    .print-header { display: none; }
  }

  /* ── Header (kop surat) ── */
  .kop {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 3px solid #1a1a2e;
    padding-bottom: 6px;
    margin-bottom: 0;
  }
  .logo-box {
    width: 50px; height: 50px;
    border-radius: 6px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .logo-box img { width: 100%; height: 100%; object-fit: cover; }
  .school-info h1 {
    font-size: 12pt; font-weight: 700;
    color: #1a1a2e; font-family: Arial, sans-serif;
  }
  .school-info p { font-size: 7.5pt; color: #444; margin-top: 1px; }

  /* ── Doc title ── */
  .doc-title {
    text-align: center;
    margin: 10px 0 8px;
    font-family: Arial, sans-serif;
  }
  .doc-title h2 {
    font-size: 12pt; font-weight: 700;
    text-transform: uppercase; color: #1a1a2e; letter-spacing: 0.5px;
  }
  .doc-title .ta { font-size: 8.5pt; color: #555; margin-top: 4px; }

  /* ── Info siswa ── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 16px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }
  .info-row { display: flex; gap: 6px; font-size: 8.5pt; align-items: baseline; }
  .info-label { color: #666; min-width: 100px; flex-shrink: 0; }
  .info-value { font-weight: 700; color: #111; }

  /* ── Section title ── */
  .section-title {
    font-family: Arial, sans-serif;
    font-size: 8.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px;
    color: #1a1a2e;
    border-left: 3px solid #e85d2f;
    padding-left: 7px;
    margin: 12px 0 5px;
  }

  /* ── Tabel ── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th {
    background: #1a1a2e; color: #fff;
    font-family: Arial, sans-serif;
    font-weight: 600; font-size: 7.5pt;
    padding: 4px 6px; text-align: left;
  }
  td { padding: 4px 6px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .center { text-align: center; }
  .bold   { font-weight: 700; }

  /* ── Nilai + kontribusi inline ── */
  .val-kontrib {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
  }
  .val-main { font-weight: 700; font-size: 10.5pt; color: #1a1a2e; }
  .badge {
    font-size: 7.5pt; font-weight: 600;
    padding: 1px 6px; border-radius: 10px;
  }
  .b-ket   { background:#dbeafe; color:#1d4ed8; }
  .b-prest { background:#fef3c7; color:#b45309; }
  .b-hadir { background:#dcfce7; color:#15803d; }

  /* ── Nilai akhir box ── */
  .final-row {
    display: flex; gap: 14px; align-items: stretch; margin: 12px 0 10px;
  }
  .formula-box {
    border: 2px solid ${clr}; background: ${bg}; border-radius: 8px;
    padding: 10px 14px; display: flex; flex-direction: column; justify-content: center;
    align-items: center; min-width: 230px;
  }
  .formula-box .f-title { font-size: 8pt; font-weight: 700; color: ${clr}; margin-bottom: 5px; }
  .formula-box .f-text { font-size: 7.5pt; color: ${clr}; line-height: 1.4; text-align: center; }

  .final-box {
    flex: 1;
    border: 2px solid ${clr};
    background: ${bg};
    border-radius: 8px;
    padding: 10px 14px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .final-score .lbl  { font-size: 8pt; color: ${clr}; font-weight: 600; font-family: Arial, sans-serif; }
  .final-score .num  { font-size: 24pt; font-weight: 900; color: ${clr}; line-height: 1.1; font-family: Arial, sans-serif; }
  .final-predikat    { text-align: right; font-family: Arial, sans-serif; }
  .final-predikat .ptxt { font-size: 13pt; font-weight: 700; color: ${clr}; }
  .final-predikat .pstatus { font-size: 8pt; margin-top: 3px; }

  /* ── Catatan ── */
  .notes-label { font-size: 8pt; color: #777; margin-bottom: 3px; font-family: Arial, sans-serif; }
  .notes-box {
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 7px 10px;
    min-height: 36px;
    font-size: 9pt;
    color: #333;
    background: #fafafa;
    margin-bottom: 14px;
  }

  /* ── Tanda Tangan 2×2 ── */
  .sig-wrap { page-break-inside: avoid; padding-top: 6px; }
  .sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 24px;
    margin-bottom: 0;
  }
  .sig-row + .sig-row { margin-top: 22px; }
  .sig-box { text-align: center; padding: 0 12px; }
  .sig-label {
    font-size: 8.5pt; font-weight: 600;
    color: #333; line-height: 1.6;
    margin-bottom: 64px;   /* ruang tanda tangan */
  }
  .sig-line { border-top: 1px solid #444; padding-top: 5px; margin-top: 0; }
  .sig-name { font-size: 8.5pt; font-weight: 700; color: #111; }
  .sig-nip  { font-size: 7.5pt; color: #666; margin-top: 1px; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 10px;
    border-top: 1px solid #dee2e6;
    padding-top: 4px;
    font-size: 6.5pt; color: #999;
    display: flex; justify-content: space-between;
  }
</style>
</head>
<body>

<!-- ── KOP SURAT: versi print (fixed, muncul tiap halaman) ── -->
<div class="print-header">
  <div class="kop">
    <div class="logo-box">
      <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
    </div>
    <div class="school-info">
      <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
      <p>Telp. 082293040925 - 0811428083 &nbsp;|&nbsp; KP. 90241</p>
      <p>Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar</p>
    </div>
  </div>
</div>

<!-- ── KOP SURAT: versi screen (aliran normal) ── -->
<div class="screen-header">
  <div class="kop">
    <div class="logo-box">
      <img src="${window.location.origin}/logo-smanko.jpg" alt="Logo" />
    </div>
    <div class="school-info">
      <h1>SMANKO – Sekolah Menengah Atas Khusus Keberbakatan Olahraga</h1>
      <p>Telp. 082293040925 - 0811428083 &nbsp;|&nbsp; KP. 90241</p>
      <p>Jl. Pajjaiang Komp. GOR Sudiang, Kelurahan Sudiang Raya, Kecamatan Biringkanaya, Kota Makassar</p>
    </div>
  </div>
</div>

<!-- ── JUDUL ── -->
<div class="doc-title">
  <h2>Laporan Penilaian Cabang Olahraga</h2>
  <div class="ta">Tahun Ajaran: ${d.tahunAjaran} &nbsp;|&nbsp; Status: ${statusLabel}</div>
</div>

<!-- ── INFO SISWA ── -->
<div class="info-grid">
  <div class="info-row"><span class="info-label">Nama Siswa</span><span class="info-value">${d.siswa.nama}</span></div>
  <div class="info-row"><span class="info-label">Kelas</span><span class="info-value">${d.siswa.kelas}</span></div>
  <div class="info-row"><span class="info-label">NISN</span><span class="info-value">${d.siswa.nisn}</span></div>
  <div class="info-row"><span class="info-label">NIS</span><span class="info-value">${d.siswa.nis}</span></div>
  <div class="info-row"><span class="info-label">Cabang Olahraga</span><span class="info-value">${d.siswa.nama_cabang}</span></div>
  <div class="info-row"><span class="info-label">Jenis Kelamin</span><span class="info-value">${d.siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>

</div>

<!-- ── 1. KETERAMPILAN ── -->
<div class="section-title">1. Penilaian Keterampilan (Bobot ${bw.keterampilan}%)</div>
<table>
  <thead>
    <tr>
      <th>Kriteria Penilaian</th>
      <th class="center" style="width:70px">Bobot</th>
      <th class="center" style="width:88px">Nilai Mentah</th>
      <th class="center" style="width:100px">Nilai Berbobot</th>
    </tr>
  </thead>
  <tbody>
    ${kriteriaRows || '<tr><td colspan="4" class="center" style="color:#999">Tidak ada data kriteria</td></tr>'}
    <tr style="background:#f1f5f9">
      <td colspan="3" style="text-align:right;font-weight:700;color:#1a1a2e;padding-right:10px">Total Nilai Keterampilan:</td>
      <td>
        <div class="val-kontrib">
          <span class="val-main">${nilaiKet.toFixed(2)}</span>
          <span class="badge b-ket" title="Kontribusi ke nilai akhir">${kontribKet.toFixed(2)}</span>
        </div>
      </td>
    </tr>
  </tbody>
</table>

<!-- ── 2. PRESTASI ── -->
<div class="section-title">2. Prestasi Olahraga (Bobot ${bw.prestasi}%)</div>
<table>
  <thead>
    <tr>
      <th class="center" style="width:28px">No</th>
      <th>Nama Kejuaraan</th>
      <th class="center" style="width:105px">Nomor / Spesialisasi</th>
      <th class="center" style="width:90px">Tingkatan</th>
      <th class="center" style="width:75px">Predikat</th>
      <th class="center" style="width:52px">Nilai</th>
    </tr>
  </thead>
  <tbody>
    ${prestasiRows}
    <tr style="background:#f1f5f9">
      <td colspan="5" style="text-align:right;font-weight:700;color:#1a1a2e;padding-right:10px">Nilai Prestasi yang Digunakan (MAX):</td>
      <td>
        <div class="val-kontrib">
          <span class="val-main">${nilaiPrest.toFixed(2)}</span>
          <span class="badge b-prest" title="Kontribusi ke nilai akhir">${kontribPrest.toFixed(2)}</span>
        </div>
      </td>
    </tr>
  </tbody>
</table>

<!-- ── 3. KEHADIRAN ── -->
<div class="section-title">3. Kehadiran Latihan (Bobot ${bw.kehadiran}%)</div>
<table>
  <thead>
    <tr>
      <th>Keterangan</th>
      <th class="center" style="width:108px">Total Pertemuan</th>
      <th class="center" style="width:90px">Jumlah Hadir</th>
      <th class="center" style="width:78px">Persentase</th>
      <th class="center" style="width:100px">Nilai</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Kehadiran latihan dalam satu semester</td>
      <td class="center">${kehadiran ? kehadiran.total_sesi + ' pertemuan' : '-'}</td>
      <td class="center">${kehadiran ? kehadiran.total_hadir + ' hadir' : '-'}</td>
      <td class="center">${kehadiran ? parseFloat(String(kehadiran.persentase)).toFixed(1) + '%' : '-'}</td>
      <td>
        <div class="val-kontrib">
          <span class="val-main">${nilaiHadir.toFixed(2)}</span>
          <span class="badge b-hadir" title="Kontribusi ke nilai akhir">${kontribHadir.toFixed(2)}</span>
        </div>
      </td>
    </tr>
  </tbody>
</table>

<!-- ── FORMULA & NILAI AKHIR ── -->
<div class="final-row">
  <div class="final-box">
    <div class="final-score">
      <div class="lbl">NILAI AKHIR</div>
      <div class="num">${nilaiAkhir}</div>
    </div>
    <div style="flex:1;margin:0 20px;border-top:1px dashed ${clr};opacity:0.6"></div>
    <div class="final-predikat">
      <div class="ptxt">${d.penilaian.predikat}</div>
      <div class="pstatus">${statusLabel}</div>
    </div>
  </div>
  <div class="formula-box">
    <div class="f-title">Formula Nilai Akhir</div>
    <div class="f-text">
      Ket*${bw.keterampilan}% + Prs*${bw.prestasi}% + Khd*${bw.kehadiran}%<br/>
      ${nilaiKet.toFixed(1)}*${Number(bw.keterampilan/100)} + ${nilaiPrest.toFixed(1)}*${Number(bw.prestasi/100)} + ${nilaiHadir.toFixed(1)}*${Number(bw.kehadiran/100)}
    </div>
  </div>
</div>

<!-- ── CATATAN ── -->
<div class="notes-label">Catatan Guru:</div>
<div class="notes-box">${d.penilaian.catatan || '<span style="color:#bbb;font-style:italic">Tidak ada catatan.</span>'}</div>

<!-- ── TANDA TANGAN 2 × 2 ── -->
<div class="sig-wrap">

  <!-- Baris 1: Kepala Sekolah | Guru / Staff -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">Mengetahui,<br>Kepala Sekolah</div>
      <div class="sig-line">
        <div class="sig-name">${ksNama}</div>
        <div class="sig-nip">NIP. ${ksNip}</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Makassar, ${today}<br>Pelatih Cabor</div>
      <div class="sig-line">
        <div class="sig-name">${d.guruNama}</div>
        <div class="sig-nip">&nbsp;</div>
      </div>
    </div>
  </div>

  <!-- Baris 2: Pendamping Cabor | Orang Tua / Wali Murid -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">Mengetahui,<br>Pendamping Cabor</div>
      <div class="sig-line">
        <div class="sig-name">${pdNama || '...................................'}</div>
        <div class="sig-nip">${pdNip ? 'NIP. ' + pdNip : 'NIP. ................................'}</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Mengetahui,<br>Orang Tua / Wali Murid</div>
      <div class="sig-line">
        <div class="sig-name">...................................</div>
        <div class="sig-nip">&nbsp;</div>
      </div>
    </div>
  </div>

</div><!-- /.sig-wrap -->

<!-- ── FOOTER ── -->
<div class="doc-footer">
  <span>SMANKO Sulawesi Selatan – Sistem Informasi Rekapitulasi Nilai Cabang Olahraga</span>
  <span>Dicetak: ${today} | Dokumen ini sah tanpa tanda tangan basah apabila dicetak dari sistem resmi</span>
</div>

<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=860,height=700,scrollbars=yes')
  if (!w) { alert('Popup diblokir browser. Izinkan popup dari situs ini untuk mencetak raport.'); return }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
