"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NaInput } from "@/components/ui/na-input"
import { trpc } from "@/lib/trpc"
import { ClientCreateSchema, type ClientCreateInput } from "@/lib/schemas/clients"

export function NewClientDialog() {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const create = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client added")
      utils.clients.list.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<ClientCreateInput>({
    resolver: zodResolver(ClientCreateSchema),
    defaultValues: { name: "", email: "", phone: "", passportNumber: "", status: true },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Client</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email / Username</FormLabel>
                <FormControl>
                  <NaInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="john.doe"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Lowercase letters, numbers, _ or . - 2-32 chars, or N/A
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <NaInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="00-00-000"
                      mask={(raw) => {
                        let v = raw.replace(/\D/g, "")
                        if (v.length > 2) v = v.slice(0, 2) + "-" + v.slice(2)
                        if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5)
                        return v.slice(0, 9)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="passportNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Passport #</FormLabel>
                  <FormControl><Input placeholder="A12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="mb-0">Active Client</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
