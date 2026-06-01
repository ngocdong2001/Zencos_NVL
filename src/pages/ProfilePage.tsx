import { useRef, useState } from 'react'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Toast } from 'primereact/toast'
import { Divider } from 'primereact/divider'
import { Tag } from 'primereact/tag'
import { useAuth } from '../contexts/AuthContext'
import { changePasswordApi, updateProfileApi } from '../lib/authApi'
import { USER_ROLES } from '../lib/usersApi'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const toast = useRef<Toast>(null)

  /* ── profile form ── */
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  /* ── password form ── */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const roleLabel = USER_ROLES.find((r) => r.value === user?.role)?.label ?? user?.role ?? ''

  /* ── save profile ── */
  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Họ tên không được để trống.' })
      return
    }
    if (!trimmedEmail) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Email không được để trống.' })
      return
    }

    const changed: { fullName?: string; email?: string } = {}
    if (trimmedName !== user?.fullName) changed.fullName = trimmedName
    if (trimmedEmail !== user?.email) changed.email = trimmedEmail

    if (Object.keys(changed).length === 0) {
      toast.current?.show({ severity: 'info', summary: 'Không có thay đổi', detail: 'Thông tin chưa thay đổi.' })
      return
    }

    setSavingProfile(true)
    try {
      const updated = await updateProfileApi(changed)
      setUser({ id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role })
      setFullName(updated.fullName)
      setEmail(updated.email)
      toast.current?.show({ severity: 'success', summary: 'Đã lưu', detail: 'Thông tin tài khoản đã được cập nhật.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật thông tin.'
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: msg })
    } finally {
      setSavingProfile(false)
    }
  }

  /* ── change password ── */
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.current?.show({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập mật khẩu hiện tại.' })
      return
    }
    if (newPassword.length < 8) {
      toast.current?.show({ severity: 'warn', summary: 'Mật khẩu yếu', detail: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.current?.show({ severity: 'warn', summary: 'Không khớp', detail: 'Mật khẩu xác nhận không khớp.' })
      return
    }

    setSavingPassword(true)
    try {
      await changePasswordApi(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.current?.show({ severity: 'success', summary: 'Thành công', detail: 'Mật khẩu đã được đổi.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đổi mật khẩu.'
      toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: msg })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="profile-page">
      <Toast ref={toast} position="top-right" />

      <div className="profile-page__inner">
        {/* ── Header ── */}
        <div className="profile-page__header">
          <div className="profile-page__avatar">
            <i className="pi pi-user" />
          </div>
          <div className="profile-page__header-info">
            <h2 className="profile-page__name">{user?.fullName ?? '—'}</h2>
            <div className="profile-page__meta">
              <span className="profile-page__email">{user?.email}</span>
              <Tag value={roleLabel} severity="info" className="profile-page__role-tag" />
            </div>
          </div>
        </div>

        <div className="profile-page__sections">
          {/* ── Section: Thông tin cá nhân ── */}
          <section className="profile-page__section">
            <h3 className="profile-page__section-title">
              <i className="pi pi-id-card" />
              Thông tin cá nhân
            </h3>
            <Divider className="profile-page__divider" />

            <div className="profile-page__form-grid">
              <div className="profile-page__field">
                <label htmlFor="pp-fullname" className="profile-page__label">Họ và tên</label>
                <InputText
                  id="pp-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="profile-page__input"
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="pp-email" className="profile-page__label">Email</label>
                <InputText
                  id="pp-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email..."
                  className="profile-page__input"
                />
              </div>

              <div className="profile-page__field profile-page__field--readonly">
                <label className="profile-page__label">Vai trò</label>
                <InputText value={roleLabel} readOnly className="profile-page__input profile-page__input--readonly" />
              </div>
            </div>

            <div className="profile-page__actions">
              <Button
                label="Lưu thông tin"
                icon="pi pi-save"
                loading={savingProfile}
                onClick={() => { void handleSaveProfile() }}
              />
            </div>
          </section>

          {/* ── Section: Đổi mật khẩu ── */}
          <section className="profile-page__section">
            <h3 className="profile-page__section-title">
              <i className="pi pi-lock" />
              Đổi mật khẩu
            </h3>
            <Divider className="profile-page__divider" />

            <div className="profile-page__form-grid">
              <div className="profile-page__field">
                <label htmlFor="pp-cur-pw" className="profile-page__label">Mật khẩu hiện tại</label>
                <Password
                  inputId="pp-cur-pw"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  feedback={false}
                  toggleMask
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="profile-page__password"
                  inputClassName="profile-page__input"
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="pp-new-pw" className="profile-page__label">Mật khẩu mới</label>
                <Password
                  inputId="pp-new-pw"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  toggleMask
                  placeholder="Ít nhất 8 ký tự..."
                  className="profile-page__password"
                  inputClassName="profile-page__input"
                  promptLabel="Nhập mật khẩu mới"
                  weakLabel="Yếu"
                  mediumLabel="Trung bình"
                  strongLabel="Mạnh"
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="pp-confirm-pw" className="profile-page__label">Xác nhận mật khẩu mới</label>
                <Password
                  inputId="pp-confirm-pw"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  feedback={false}
                  toggleMask
                  placeholder="Nhập lại mật khẩu mới..."
                  className="profile-page__password"
                  inputClassName="profile-page__input"
                />
              </div>
            </div>

            <div className="profile-page__actions">
              <Button
                label="Đổi mật khẩu"
                icon="pi pi-key"
                severity="warning"
                loading={savingPassword}
                onClick={() => { void handleChangePassword() }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
