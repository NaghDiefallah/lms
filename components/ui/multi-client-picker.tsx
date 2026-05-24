"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/lib/trpc"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface MultiClientPickerProps {
  clientIds: string[]
  clientNames: string[]
  onChange: (ids: string[], names: string[]) => void
  placeholder?: string
}

export function MultiClientPicker({ clientIds, clientNames, onChange, placeholder = "Add client…" }: MultiClientPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data, isFetching } = trpc.clients.list.useQuery(
    { search: debouncedSearch || undefined, limit: 10 },
    { enabled: open },
  )
  const clients = (data?.documents ?? []) as Array<{ $id: string; name: string }>

  function add(id: string, name: string) {
    if (clientIds.includes(id)) return
    onChange([...clientIds, id], [...clientNames, name])
    setSearch("")
  }

  function remove(id: string) {
    const idx = clientIds.indexOf(id)
    if (idx === -1) return
    onChange(clientIds.filter((_, i) => i !== idx), clientNames.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {clientIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {clientIds.map((id, i) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
              <User className="w-3 h-3" />
              <span className="font-mono">{id}</span>
              <span className="text-muted-foreground">— {clientNames[i]}</span>
              <button type="button" onClick={() => remove(id)} className="ml-0.5 hover:text-destructive rounded-sm">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search by name or ID…" value={search} onValueChange={setSearch} />
            <CommandList>
              {isFetching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : clients.length === 0 ? (
                <CommandEmpty>No clients found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {clients.map((c) => {
                    const selected = clientIds.includes(c.$id)
                    return (
                      <CommandItem
                        key={c.$id}
                        value={c.$id}
                        onSelect={() => { if (!selected) { add(c.$id, c.name); setOpen(false) } }}
                        className={cn(selected && "opacity-50")}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-xs text-muted-foreground mr-2">{c.$id}</span>
                        <span>{c.name}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
