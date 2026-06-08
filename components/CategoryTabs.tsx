'use client'

// 카테고리 → 이모지(탭을 시각적으로 풍부하게). 마켓 시드의 카테고리 문자열과 1:1.
const CAT_EMOJI: Record<string, string> = {
  급식: '🍱', 시험: '📝', 기숙사: '🏠', 동아리: '🎸', 행사: '🎉', 학사일정: '📅',
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`ty-caption-strong shrink-0 whitespace-nowrap rounded-full px-3.5 py-2.5 transition active:scale-95 ${
        active ? 'bg-ink text-canvas' : 'bg-pearl text-muted hover:text-ink'
      }`}
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
      <nav className="no-scrollbar mx-auto flex max-w-[1120px] gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        <Tab active={!active} onClick={() => onSelect(null)}>🔥 인기</Tab>
        {categories.map(c => (
          <Tab key={c} active={active === c} onClick={() => onSelect(c)}>
            {CAT_EMOJI[c] ? `${CAT_EMOJI[c]} ${c}` : c}
          </Tab>
        ))}
      </nav>
    </div>
  )
}
