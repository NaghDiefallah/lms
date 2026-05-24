"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { trpc } from "@/lib/trpc"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface ClientPickerProps {
  value: string        // clientId
  clientName: string
  onChange: (clientId: string, clientName: string) => void
  placeholder?: string
}

export function ClientPicker({ value, clientName, onChange, placeholder = "Search client…" }: ClientPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data, isFetching } = trpc.clients.list.useQuery(
    { search: debouncedSearch || undefined, limit: 10 },
    { enabled: open },
  )

  const clients = (data?.documents ?? []) as Array<{ $id: string; name: string }>

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9"
        >
          {value ? (
            <span className="truncate">{value} — {clientName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or ID…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <CommandEmpty>No clients found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {clients.map((c) => (
                  <CommandItem
                    key={c.$id}
                    value={c.$id}
                    onSelect={() => {
                      onChange(c.$id, c.name)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.$id ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground mr-2">{c.$id}</span>
                    <span>{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
