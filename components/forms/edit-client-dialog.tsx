"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NaInput } from "@/components/ui/na-input"
import { FileUpload } from "@/components/ui/file-upload"
import { trpc } from "@/lib/trpc"
import { ClientUpdateSchema, type ClientUpdateInput } from "@/lib/schemas/clients"

interface Client {
  $id: string; name: string; email: string
  phone?: string; passportNumber?: string; status: boolean; clientSince?: string
  passportFileId?: string; contractFileId?: string
}

interface EditClientDialogProps {
  client: Client | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const utils = trpc.useUtils()

  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated")
      utils.clients.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<ClientUpdateInput>({
    resolver: zodResolver(ClientUpdateSchema),
    defaultValues: { id: "", name: "", email: "", phone: "", passportNumber: "", status: true, clientSince: "" },
  })
  const watchedPassportFileId = useWatch({ control: form.control, name: "passportFileId" })
  const watchedContractFileId = useWatch({ control: form.control, name: "contractFileId" })

  useEffect(() => {
    if (client) {
      form.reset({
        id: client.$id,
        name: client.name,
        email: client.email,
        phone: client.phone ?? "",
        passportNumber: client.passportNumber ?? "",
        status: client.status,
        clientSince: client.clientSince ? client.clientSince.split("T")[0] : "",
        passportFileId: client.passportFileId ?? "",
        contractFileId: client.contractFileId ?? "",
      })
    }
  }, [client, form])

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Client — {client.$id}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email / Username</FormLabel>
                <FormControl>
                  <NaInput value={field.value ?? ""} onChange={field.onChange} placeholder="john.doe" />
                </FormControl>
                <FormDescription className="text-xs">Username or N/A</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

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
                <FormLabel>Passport Number</FormLabel>
                <FormControl><Input placeholder="e.g. A12345678" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* File uploads */}
            <div className="grid grid-cols-2 gap-4">
              <FileUpload
                label="Passport"
                fileId={watchedPassportFileId || null}
                accept="image/*,.pdf"
                onUpload={(id) => form.setValue("passportFileId", id)}
                onRemove={() => form.setValue("passportFileId", "")}
              />
              <FileUpload
                label="Contract"
                fileId={watchedContractFileId || null}
                accept="image/*,.pdf"
                onUpload={(id) => form.setValue("contractFileId", id)}
                onRemove={() => form.setValue("contractFileId", "")}
              />
            </div>

            <FormField control={form.control} name="clientSince" render={({ field }) => (
              <FormItem>
                <FormLabel>Client Since</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="mb-0">Active Client</FormLabel>
                <FormControl>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
