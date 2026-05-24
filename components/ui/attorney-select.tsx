"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"

const ATTORNEY_ROLES = ["CEO", "Partner", "Senior Attorney", "Attorney"]

interface AttorneySelectProps {
  value: string
  onChange: (name: string) => void
  placeholder?: string
}

export function AttorneySelect({ value, onChange, placeholder = "Select attorney…" }: AttorneySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const { data } = trpc.personnel.list.useQuery({ limit: 500 }, { enabled: open })
  const attorneys = ((data?.documents ?? []) as Array<{ $id: string; name: string; role: string; licensed: boolean }>)
    .filter(p => ATTORNEY_ROLES.includes(p.role))
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
          {value ? (
            <span className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search attorney…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No attorneys found.</CommandEmpty>
            <CommandGroup>
              {attorneys.map(a => (
                <CommandItem key={a.$id} value={a.name} onSelect={() => { onChange(a.name); setOpen(false); setSearch("") }}>
                  <Check className={cn("mr-2 h-4 w-4", value === a.name ? "opacity-100" : "opacity-0")} />
                  <div>
                    <p className="text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role} · {a.$id}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
