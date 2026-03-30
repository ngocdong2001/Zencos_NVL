import type { DashboardStats } from './types'

type StatsGridProps = {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="zen-stats-grid">
      <article>
        <p>Total workflow stages</p>
        <h3>{stats.workflowCount}</h3>
        <span>Doc tu system design</span>
      </article>
      <article>
        <p>Dev-ready modules</p>
        <h3>{stats.moduleCount}</h3>
        <span>Map man hinh / API / DB</span>
      </article>
      <article>
        <p>Hard gates</p>
        <h3>{stats.hardBlocks}</h3>
        <span>QC, QA, IPC, packaging controls</span>
      </article>
      <article>
        <p>Trace nodes</p>
        <h3>{stats.traceNodes}</h3>
        <span>Ready for recall investigation</span>
      </article>
    </section>
  )
}