type PlaceholderPageProps = { title?: string }

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        color: 'var(--text-muted)',
      }}
    >
      <span style={{ fontSize: 48 }}>🚧</span>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title ?? 'Đang xây dựng'}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>Module này chưa được triển khai.</p>
    </div>
  )
}
