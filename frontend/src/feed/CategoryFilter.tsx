interface Category {
  value: string
  label: string
  emoji: string
}

const CATEGORIES: Category[] = [
  { value: '', label: 'All', emoji: '📋' },
  { value: 'events', label: 'Events', emoji: '🎪' },
  { value: 'welfare', label: 'Welfare', emoji: '💚' },
  { value: 'content', label: 'Content', emoji: '📝' },
  { value: 'operations', label: 'Operations', emoji: '⚙️' },
  { value: 'labs', label: 'Labs', emoji: '🔬' },
]

// Categories without "All" option for post creation
export const categories = CATEGORIES.filter(c => c.value !== '')

interface CategoryFilterProps {
  selected: string
  onChange: (category: string) => void
}

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map(category => (
        <button
          key={category.value}
          onClick={() => onChange(category.value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
            [transition:background-color_200ms,color_200ms,box-shadow_200ms,border-color_200ms,transform_120ms] active:scale-[0.96]
            ${selected === category.value
              ? 'bg-forest-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-cream-200 border border-cream-300'
            }
          `}
        >
          <span>{category.emoji}</span>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  )
}

export const getCategoryInfo = (value: string): Category => {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[0]
}

export default CategoryFilter
