import { apiFetch } from './api'

export const USER_ROLES = [
  { value: 'admin',               label: 'Quản trị viên' },
  { value: 'ceo',                 label: 'CEO / Giám đốc' },
  { value: 'warehouse_manager',   label: 'Quản lý kho' },
  { value: 'kho',                 label: 'Kho' },
  { value: 'warehouse_staff',     label: 'Nhân viên kho' },
  { value: 'production_planning', label: 'Kế hoạch sản xuất' },
  { value: 'production_staff',    label: 'Sản xuất' },
  { value: 'rd_manager',          label: 'Trưởng phòng R&D' },
  { value: 'rd_staff',            label: 'Nhân viên R&D' },
  { value: 'mua_hang',            label: 'Mua hàng' },
  { value: 'purchasing',          label: 'Purchasing (cũ)' },
  { value: 'qa',                  label: 'QA' },
  { value: 'qc',                  label: 'QC' },
  { value: 'sale',                label: 'Sale' },
  { value: 'accounting',          label: 'Kế toán' },
  { value: 'viewer',              label: 'Xem báo cáo' },
] as const

export type UserRow = {
  id: string
  email: string
  fullName: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateUserPayload = {
  email: string
  password: string
  fullName: string
  role: string
  isActive?: boolean
}

export type UpdateUserPayload = {
  email?: string
  fullName?: string
  role?: string
  isActive?: boolean
}

export function fetchUsers(): Promise<UserRow[]> {
  return apiFetch<UserRow[]>('/api/users')
}

export function createUser(payload: CreateUserPayload): Promise<UserRow> {
  return apiFetch<UserRow>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<UserRow> {
  return apiFetch<UserRow>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function adminResetPassword(id: string, newPassword: string): Promise<void> {
  return apiFetch(`/api/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  })
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch(`/api/users/${id}`, { method: 'DELETE' })
}
