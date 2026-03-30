type HeroSectionProps = {
  traceabilityChain: string[]
}

export function HeroSection({ traceabilityChain }: HeroSectionProps) {
  return (
    <section className="zen-hero">
      <div className="zen-hero-copy">
        <p className="zen-eyebrow">Workflow tong the ZenCos</p>
        <h2>Mot giao dien cho toan bo chuoi Sale → R&D → Production → Delivery → Batch Closure.</h2>
        <p className="zen-lead">
          Dashboard nay duoc thiet ke lai tu cac tai lieu markdown de nhan manh gate nghiep vu, module dev-ready va chuoi truy
          xuat LOT phuc vu GMP, thu hoi va kiem toan.
        </p>
        <div className="zen-hero-badges">
          <span>cGMP ASEAN</span>
          <span>LOT traceability</span>
          <span>Invoice soft-block</span>
          <span>Audit-ready batch record</span>
        </div>
      </div>

      <div className="zen-trace-card">
        <p className="zen-eyebrow">Traceability chain</p>
        <div className="zen-trace-flow">
          {traceabilityChain.map((node, index) => (
            <div key={node} className="zen-trace-node">
              <span>{node}</span>
              {index < traceabilityChain.length - 1 ? <i aria-hidden="true">→</i> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}