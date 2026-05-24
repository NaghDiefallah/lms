import { useState, useCallback } from "react"

export function useBulkSelect<T extends { $id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected(s => s.size === items.length ? new Set() : new Set(items.map(i => i.$id)))
  }, [items])

  const clear = useCallback(() => setSelected(new Set()), [])

  const allSelected = items.length > 0 && selected.size === items.length
  const someSelected = selected.size > 0 && selected.size < items.length

  return {
    selected,
    toggle,
    toggleAll,
    clear,
    count: selected.size,
    allSelected,
    someSelected,
    selectedIds: Array.from(selected),
  }
}
