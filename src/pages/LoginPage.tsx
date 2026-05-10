import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Message } from 'primereact/message'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/overview', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)',
      }}
    >
      <Card
        style={{
          width: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: '12px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e3a5f', letterSpacing: '-0.5px' }}>
            ZencosMS
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Hệ thống Quản lý Nguyên vật liệu
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="p-field" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Email
            </label>
            <InputText
              id="login-email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: '100%' }}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Mật khẩu
            </label>
            <Password
              inputId="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              inputStyle={{ width: '100%' }}
              style={{ width: '100%' }}
              feedback={false}
              toggleMask
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <Message severity="error" text={error} style={{ width: '100%' }} />
            </div>
          )}

          <Button
            type="submit"
            label={loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-sign-in'}
            style={{ width: '100%' }}
            disabled={loading || !email.trim() || !password}
          />
        </form>
      </Card>
    </div>
  )
}
