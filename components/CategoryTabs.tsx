'use client'

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ty-caption whitespace-nowrap border-b-2 pb-1 transition ${active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}
    >
      {children}
    </button>
  )
}

export function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: string[]
  active: string | null
  onSelect: (category: string | null) => void
}) {
  return (
    <div className="border-b border-hairline">
      <nav className="mx-auto flex max-w-[1120px] gap-6 overflow-x-auto px-6 pt-4">
        <Tab active={!active} onClick={() => onSelect(null)}>🔥 인기</Tab>
        {categories.map(c => (
          <Tab key={c} active={active === c} onClick={() => onSelect(c)}>{c}</Tab>
        ))}
      </nav>
    </div>
  )
}
