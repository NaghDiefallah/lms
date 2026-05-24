"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"

const ATTORNEY_ROLES = ["CEO", "Partner", "Senior Attorney", "Attorney"]

interface AttorneyPickerProps {
  value: string[]
  onChange: (v: string[]) => void
}

export function AttorneyPicker({ value, onChange }: AttorneyPickerProps) {
  const [open, setOpen] = useState(false)

  const { data } = trpc.personnel.list.useQuery({ limit: 500 })
  const attorneys = ((data?.documents ?? []) as Array<{ $id: string; name: string; role: string; licensed: boolean }>)
    .filter((p) => p.licensed && ATTORNEY_ROLES.includes(p.role))

  function toggle(name: string) {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground">Select attorneys…</span>
            ) : (
              <span>{value.length} attorney{value.length !== 1 ? "s" : ""} selected</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search attorneys…" />
            <CommandList>
              <CommandEmpty>No licensed attorneys found.</CommandEmpty>
              <CommandGroup>
                {attorneys.map((a) => (
                  <CommandItem
                    key={a.$id}
                    onSelect={() => toggle(a.name)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(a.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
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

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1 text-xs">
              <User className="w-3 h-3" />
              {name}
              <button
                type="button"
                onClick={() => toggle(name)}
                className="ml-0.5 hover:text-destructive rounded-sm"
              >×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
