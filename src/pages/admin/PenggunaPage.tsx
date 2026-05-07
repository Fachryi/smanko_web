import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/apiClient'
import type { User, ApiResponse } from '../../types'
import { Search, Plus, Pencil, UserX, UserCheck, Shield, BookOpen, Eye, CheckCircle } from 'lucide-react'

type FormData = { nama:string; username:string; password:string; role:string; status:string }

const ROLE_LABELS: Record<string,string> = {
  admin: 'Administrator', guru_olahraga: 'Guru / Staff', wakasek: 'Wakasek Kesiswaan'
}
const ROLE_BADGE: Record<string,string> = {
  admin:'badge-danger', guru_olahraga:'badge-info', wakasek:'badge-accent'
}
const ROLE_ICON: Record<string,React.ReactNode> = {
  admin:<Shield size={11}/>, guru_olahraga:<BookOpen size={11}/>, wakasek:<Eye size={11}/>
}

export default function PenggunaPage() {
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('aktif')
  const [modal,   setModal]   = useState<'add'|'edit'|null>(null)
  const [confirm, setConfirm] = useState<{open:boolean;id:number;action:'toggle'|'delete'}>({open:false,id:0,action:'toggle'})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState<User|null>(null)
  const [form,    setForm]    = useState<FormData>({nama:'',username:'',password:'',role:'guru_olahraga',status:'aktif'})
  const [successInfo, setSuccessInfo] = useState<{open:boolean;nama:string;status:string}>({open:false,nama:'',status:''})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter)   params.set('role',   roleFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search)       params.set('search', search)
      const res = await api.get<ApiResponse<User[]>>(`/master/users.php?${params}`)
      setUsers(res.data ?? [])
    } catch { } finally { setLoading(false) }
  }, [roleFilter, statusFilter, search])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const openAdd = () => {
    setSelected(null)
    setForm({nama:'',username:'',password:'',role:'guru_olahraga', status:'aktif'})
    setError(''); setModal('add')
  }
  const openEdit = (u: User) => {
    setSelected(u)
    setForm({nama:u.nama,username:u.username,password:'',role:u.role,status:u.status ?? 'aktif'})
    setError(''); setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nama || !form.username) { setError('Nama dan username wajib diisi.'); return }
    if (modal === 'add' && !form.password) { setError('Password wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'add') {
        await api.post('/master/users.php', form)
      } else if (selected) {
        const payload: Partial<FormData> = {nama:form.nama,username:form.username,role:form.role,status:form.status}
        if (form.password) payload.password = form.password
        await api.put(`/master/users.php?id=${selected.id}`, payload)
      }
      setModal(null); load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const handleToggleStatus = async () => {
    const u = users.find(x => x.id === confirm.id)
    if (!u) return
    setSaving(true)
    const newStatus = u.status === 'aktif' ? 'nonaktif' : 'aktif'
    try {
      await api.put(`/master/users.php?id=${u.id}`, { status: newStatus })
      setConfirm(c => ({...c,open:false}))
      setSuccessInfo({open:true, nama:u.nama, status:newStatus})
      load()
    } catch { } finally { setSaving(false) }
  }

  const targetUser = users.find(x => x.id === confirm.id)

  return (
    <Layout title="Manajemen Pengguna">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Manajemen Pengguna</h1>
          <p>Kelola akun Admin, Guru / Staff, dan Wakasek Kesiswaan.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Tambah Pengguna</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16}/>
          <input className="search-input" placeholder="Cari nama atau username..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="admin">Administrator</option>
          <option value="guru_olahraga">Guru / Staff</option>
          <option value="wakasek">Wakasek Kesiswaan</option>
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>

      <div className="card" style={{padding:0}}>
        {loading ? (
          <div className="flex-center" style={{padding:60}}><div className="spinner spinner-lg"/></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{width:48}}>No</th>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">Tidak ada pengguna ditemukan.</td></tr>
                ) : users.map((u,i) => (
                  <tr key={u.id}>
                    <td style={{color:'var(--clr-text-3)'}}>{i+1}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:'50%',
                          background:'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontWeight:700,fontSize:'0.75rem',color:'#fff',flexShrink:0}}>
                          {u.nama?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <strong>{u.nama}</strong>
                      </div>
                    </td>
                    <td><code style={{fontSize:'0.82rem',color:'var(--clr-text-3)'}}>{u.username}</code></td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role]||'badge-neutral'}`}>
                        {ROLE_ICON[u.role]} {ROLE_LABELS[u.role]||u.role}
                      </span>
                    </td>
                    <td>
                      {u.status === 'aktif'
                        ? <span className="badge badge-success">● Aktif</span>
                        : <span className="badge badge-danger">● Nonaktif</span>}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)} title="Edit">
                          <Pencil size={15}/>
                        </button>
                        <button
                          className={`btn btn-sm ${u.status==='aktif'?'btn-danger':'btn-success'} btn-icon`}
                          title={u.status==='aktif'? 'Nonaktifkan':'Aktifkan'}
                          onClick={() => setConfirm({open:true,id:u.id,action:'toggle'})}>
                          {u.status==='aktif' ? <UserX size={15}/> : <UserCheck size={15}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal==='add'?'Tambah Pengguna':'Edit Pengguna'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving?<span className="spinner"/>:'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="login-error" style={{marginBottom:'var(--sp-4)'}}>{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nama Lengkap <span className="required">*</span></label>
            <input className="form-control" placeholder="Nama lengkap"
              value={form.nama} onChange={e => setForm(f=>({...f,nama:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input className="form-control" placeholder="Username unik"
              value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Password {modal==='add'&&<span className="required">*</span>}
            </label>
            <input className="form-control" type="password"
              placeholder={modal==='edit'?'Kosongkan jika tidak diubah':'Min. 6 karakter'}
              value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Role <span className="required">*</span></label>
            <select className="form-control" value={form.role}
              onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="guru_olahraga">Guru / Staff</option>
              <option value="wakasek">Wakasek Kesiswaan</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
        {modal==='edit' && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status}
              onChange={e => setForm(f => ({...f, status:e.target.value}))}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
        )}
      </Modal>

      {/* Confirm Toggle Status */}
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm(c=>({...c,open:false}))}
        onConfirm={handleToggleStatus}
        loading={saving}
        title={targetUser?.status==='aktif'?'Nonaktifkan Pengguna':'Aktifkan Pengguna'}
        message={`Yakin ingin ${targetUser?.status==='aktif'?'menonaktifkan':'mengaktifkan'} akun "${targetUser?.nama}"?`}
        confirmLabel={targetUser?.status==='aktif'?'Nonaktifkan':'Aktifkan'}
      />

      {/* Success Popup */}
      <Modal
        open={successInfo.open}
        onClose={() => setSuccessInfo(s=>({...s,open:false}))}
        title="Berhasil"
        footer={
          <button className="btn btn-primary" onClick={() => setSuccessInfo(s=>({...s,open:false}))}>
            OK
          </button>
        }
      >
        <div className="confirm-body">
          <div className="confirm-icon" style={{
            background: successInfo.status === 'aktif'
              ? 'rgba(34,197,94,0.12)'
              : 'rgba(239,68,68,0.12)',
            color: successInfo.status === 'aktif'
              ? 'var(--clr-success)'
              : 'var(--clr-danger)'
          }}>
            <CheckCircle size={28} />
          </div>
          <h3 style={{marginBottom:'var(--sp-2)'}}>
            {successInfo.status === 'aktif' ? 'Pengguna Diaktifkan' : 'Pengguna Dinonaktifkan'}
          </h3>
          <p>
            Akun <strong>{successInfo.nama}</strong> berhasil{' '}
            {successInfo.status === 'aktif' ? 'diaktifkan kembali.' : 'dinonaktifkan.'}
          </p>
        </div>
      </Modal>
    </Layout>
  )
}
