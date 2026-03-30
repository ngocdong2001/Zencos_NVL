import type { DomainCard, ModuleCard } from './types'

type ArchitectureSectionProps = {
  databaseDomains: DomainCard[]
  visibleModules: ModuleCard[]
}

export function ArchitectureSection({ databaseDomains, visibleModules }: ArchitectureSectionProps) {
  return (
    <section className="zen-grid zen-grid-secondary">
      <article className="zen-panel">
        <div className="zen-panel-head">
          <div>
            <p className="zen-eyebrow">Module build map</p>
            <h3>Frontend to API to DB</h3>
          </div>
          <span>{visibleModules.length} modules in stream</span>
        </div>

        <div className="zen-module-grid">
          {visibleModules.map((module) => (
            <article key={module.id} className="zen-module-card">
              <h4>{module.title}</h4>
              <p>{module.screens}</p>
              <dl>
                <div>
                  <dt>API</dt>
                  <dd>{module.api}</dd>
                </div>
                <div>
                  <dt>DB</dt>
                  <dd>{module.db}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </article>

      <article className="zen-panel">
        <div className="zen-panel-head">
          <div>
            <p className="zen-eyebrow">Database domains</p>
            <h3>Schema priorities</h3>
          </div>
          <span>Versioned, traceable, no hard delete</span>
        </div>

        <div className="zen-domain-list">
          {databaseDomains.map((domain) => (
            <article key={domain.title} className="zen-domain-card">
              <h4>{domain.title}</h4>
              <p>{domain.description}</p>
              <div className="zen-chip-row">
                {domain.tables.map((table) => (
                  <span key={table}>{table}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}