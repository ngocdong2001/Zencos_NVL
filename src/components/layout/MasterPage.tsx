import type { ReactNode } from 'react'

type MasterPageProps = {
  sidebar: ReactNode
  header: ReactNode
  children: ReactNode
  footerText?: string
}

export function MasterPage({ sidebar, header, children, footerText }: MasterPageProps) {
  return (
    <div className="catalog-app-shell">
      {sidebar}

      <div className="catalog-main-shell">
        {header}
        <main className="catalog-main">{children}</main>
        {footerText ? <footer className="catalog-footer">{footerText}</footer> : null}
      </div>
    </div>
  )
}
