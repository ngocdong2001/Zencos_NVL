import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import {
  createUser,
  deleteUser,
  fetchUsers,
  adminResetPassword,
  updateUser,
  USER_ROLES,
  type CreateUserPayload,
  type UserRow,
} from '../lib/usersApi'
import { useAuth } from '../contexts/AuthContext'

type DialogMode = 'create' | 'edit' | 'reset-password' | null

const EMPTY_FORM = {
  email: '',
  password: '',
  fullName: '',
  role: 'warehouse_staff',
  isActive: true,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserManagementPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const toast = useRef<Toast>(null)

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [newPassword, setNewPassword] = useState('')

  const canWrite  = hasPermission('users:write')
  const canDelete = hasPermission('users:delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUsers()
      setUsers(data)
    } catch (err: unknown) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: String(err) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
    setSelectedUser(null)
    setDialogMode('create')
  }

  function openEdit(user: UserRow) {
    setForm({
      email: user.email,
      password: '',
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    })
    setSelectedUser(user)
    setDialogMode('edit')
  }

  function openResetPassword(user: UserRow) {
    setNewPassword('')
    setSelectedUser(user)
    setDialogMode('reset-password')
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const payload: CreateUserPayload = {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          isActive: form.isActive,
        }
        await createUser(payload)
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tạo tài khoản' })
      } else if (dialogMode === 'edit' && selectedUser) {
        await updateUser(selectedUser.id, {
          email: form.email.trim() !== selectedUser.email ? form.email.trim() : undefined,
          fullName: form.fullName.trim(),
          role: form.role,
          isActive: form.isActive,
        })
        toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật tài khoản' })
      }
      setDialogMode(null)
      await load()
    } catch (err: unknown) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: String(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!selectedUser || !newPassword) return
    setSaving(true)
    try {
      await adminResetPassword(selectedUser.id, newPassword)
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Đã đặt lại mật khẩu' })
      setDialogMode(null)
    } catch (err: unknown) {
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: String(err) })
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(user: UserRow) {
    confirmDialog({
      message: `Xoá tài khoản "${user.fullName}" (${user.email})?`,
      header: 'Xác nhận xoá',
      icon: 'pi pi-trash',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Xoá',
      rejectLabel: 'Huỷ',
      accept: async () => {
        try {
          await deleteUser(user.id)
          toast.current?.show({ severity: 'success', summary: 'Đã xoá', detail: user.email })
          await load()
        } catch (err: unknown) {
          toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: String(err) })
        }
      },
    })
  }

  const roleLabelTemplate = (row: UserRow) => {
    const found = USER_ROLES.find((r) => r.value === row.role)
    return found?.label ?? row.role
  }

  const statusTemplate = (row: UserRow) => (
    <Tag value={row.isActive ? 'Hoạt động' : 'Khoá'} severity={row.isActive ? 'success' : 'danger'} />
  )

  const actionTemplate = (row: UserRow) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {canWrite && (
        <>
          <Button icon="pi pi-pencil" size="small" text onClick={() => openEdit(row)} tooltip="Chỉnh sửa" />
          <Button icon="pi pi-key"    size="small" text severity="warning" onClick={() => openResetPassword(row)} tooltip="Đặt lại mật khẩu" />
        </>
      )}
      {canDelete && (
        <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => confirmDelete(row)} tooltip="Xoá" />
      )}
    </div>
  )

  const isFormValid =
    dialogMode === 'create'
      ? form.email.trim() && form.password.length >= 8 && form.fullName.trim()
      : form.fullName.trim()

  return (
    <div style={{ padding: '1.5rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Quản lý người dùng</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            label="Phân quyền theo vai trò"
            icon="pi pi-shield"
            severity="secondary"
            outlined
            onClick={() => navigate('/admin/role-permissions')}
          />
          {canWrite && (
            <Button label="Tạo tài khoản" icon="pi pi-plus" onClick={openCreate} />
          )}
        </div>
      </div>

      <DataTable
        value={users}
        loading={loading}
        stripedRows
        showGridlines
        emptyMessage="Chưa có tài khoản nào"
        style={{ fontSize: '0.875rem' }}
      >
        <Column field="fullName" header="Họ tên" sortable />
        <Column field="email" header="Email" sortable />
        <Column header="Vai trò" body={roleLabelTemplate} sortable sortField="role" />
        <Column header="Trạng thái" body={statusTemplate} style={{ width: '120px', textAlign: 'center' }} />
        <Column
          header="Ngày tạo"
          field="createdAt"
          body={(row: UserRow) => new Date(row.createdAt).toLocaleDateString('vi-VN')}
          style={{ width: '120px' }}
        />
        <Column header="" body={actionTemplate} style={{ width: '130px' }} />
      </DataTable>

      {/* �"?�"? Create / Edit Dialog �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */}
      <Dialog
        visible={dialogMode === 'create' || dialogMode === 'edit'}
        header={dialogMode === 'create' ? 'Tạo tài khoản mới' : 'Chỉnh sửa tài khoản'}
        style={{ width: '480px' }}
        onHide={() => setDialogMode(null)}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Huỷ" text onClick={() => setDialogMode(null)} disabled={saving} />
            <Button label="Lưu" icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'} onClick={handleSave} disabled={saving || !isFormValid} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Họ tên *</label>
            <InputText value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Email *</label>
            <InputText type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} />
          </div>
          {dialogMode === 'create' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Mật khẩu * (tối thiểu 8 ký tự)</label>
              <Password
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                inputStyle={{ width: '100%' }}
                style={{ width: '100%' }}
                feedback={false}
                toggleMask
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Vai trò</label>
            <Dropdown
              value={form.role}
              options={USER_ROLES.map((r) => ({ label: r.label, value: r.value }))}
              onChange={(e) => setForm((f) => ({ ...f, role: e.value as string }))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <label htmlFor="isActive">Tài khoản đang hoạt động</label>
          </div>
        </div>
      </Dialog>

      {/* �"?�"? Reset Password Dialog �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */}
      <Dialog
        visible={dialogMode === 'reset-password'}
        header={`Đặt lại mật khẩu — ${selectedUser?.fullName ?? ''}`}
        style={{ width: '400px' }}
        onHide={() => setDialogMode(null)}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Huỷ" text onClick={() => setDialogMode(null)} disabled={saving} />
            <Button
              label="Đặt lại mật khẩu"
              icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
              severity="warning"
              onClick={handleResetPassword}
              disabled={saving || newPassword.length < 8}
            />
          </div>
        }
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Mật khẩu mới * (tối thiểu 8 ký tự)</label>
          <Password
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            inputStyle={{ width: '100%' }}
            style={{ width: '100%' }}
            feedback={false}
            toggleMask
          />
        </div>
      </Dialog>
    </div>
  )
}
