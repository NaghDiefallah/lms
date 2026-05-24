"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AttorneyPicker } from "@/components/ui/attorney-picker"
import { MultiClientPicker } from "@/components/ui/multi-client-picker"
import { trpc } from "@/lib/trpc"
import { CaseUpdateSchema, type CaseUpdateInput } from "@/lib/schemas/cases"
import { useRole } from "@/hooks/use-role"

interface CaseDoc {
  $id: string; clientId: string; clientName: string; description: string
  notes?: string; refNumber?: string; startDate: string; endDate?: string
  status: string; currentStatus?: string; assignedAttorneys?: string[]
  clientIds?: string[]; clientNames?: string[]
}

interface EditCaseDialogProps {
  caseDoc: CaseDoc | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function EditCaseDialog({ caseDoc, open, onOpenChange }: EditCaseDialogProps) {
  const utils = trpc.useUtils()
  const role = useRole()
  const isCEO = role === "CEO"

  const update = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("Case updated")
      utils.cases.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<CaseUpdateInput>({
    resolver: zodResolver(CaseUpdateSchema),
    defaultValues: { id: "", clientIds: [], clientNames: [], description: "", notes: "", refNumber: "", startDate: "", endDate: "", status: "pending", currentStatus: "", assignedAttorneys: [] },
  })
  const watchedClientIds = useWatch({ control: form.control, name: "clientIds" }) ?? []
  const watchedClientNames = useWatch({ control: form.control, name: "clientNames" }) ?? []

  useEffect(() => {
    if (caseDoc) {
      form.reset({
        id: caseDoc.$id,
        clientIds: caseDoc.clientIds ?? [caseDoc.clientId],
        clientNames: caseDoc.clientNames ?? [caseDoc.clientName],
        description: caseDoc.description,
        notes: caseDoc.notes ?? "",
        refNumber: caseDoc.refNumber ?? "",
        startDate: caseDoc.startDate?.split("T")[0] ?? "",
        endDate: caseDoc.endDate?.split("T")[0] ?? "",
        status: caseDoc.status as "pending" | "in_progress" | "completed",
        currentStatus: caseDoc.currentStatus ?? "",
        assignedAttorneys: caseDoc.assignedAttorneys ?? [],
      })
    }
  }, [caseDoc, form])

  if (!caseDoc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Case — {caseDoc.$id}</DialogTitle>
          <DialogDescription className="sr-only">Edit case details</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-4">
            {isCEO && (
              <FormField control={form.control} name="refNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number <span className="text-xs text-muted-foreground">(CEO only)</span></FormLabel>
                  <FormControl><Input placeholder={caseDoc.$id} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormItem>
              <FormLabel>Clients</FormLabel>
              <MultiClientPicker
                clientIds={watchedClientIds}
                clientNames={watchedClientNames}
                onChange={(ids, names) => { form.setValue("clientIds", ids); form.setValue("clientNames", names) }}
              />
            </FormItem>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentStatus" render={({ field }) => (
                <FormItem><FormLabel>Current Status</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="assignedAttorneys" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Attorneys</FormLabel>
                <AttorneyPicker value={field.value ?? []} onChange={field.onChange} />
                <FormMessage />
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
