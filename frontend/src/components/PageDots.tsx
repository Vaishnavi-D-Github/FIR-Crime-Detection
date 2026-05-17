export function PageDots({ active, total = 3 }: { active: number; total?: number }) {
  return (
    <div className="page-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`page-dot ${i + 1 === active ? 'active' : ''}`} />
      ))}
    </div>
  )
}
