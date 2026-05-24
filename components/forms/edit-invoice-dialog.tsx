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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ClientPicker } from "@/components/ui/client-picker"
import { AttorneySelect } from "@/components/ui/attorney-select"
import { trpc } from "@/lib/trpc"
import { TransactionUpdateSchema, type TransactionUpdateInput } from "@/lib/schemas/ledger"

interface TxDoc {
  $id: string; clientId: string; clientName: string; date: string
  amount: number; attorney: string; method: string; status: string; type: string
}

interface EditInvoiceDialogProps {
  transaction: TxDoc | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function EditInvoiceDialog({ transaction: tx, open, onOpenChange }: EditInvoiceDialogProps) {
  const utils = trpc.useUtils()
  const update = trpc.ledger.update.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated")
      utils.ledger.list.invalidate()
      utils.ledger.summary.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<TransactionUpdateInput>({
    resolver: zodResolver(TransactionUpdateSchema) as any,
    defaultValues: { id: "", clientId: "", clientName: "", date: "", amount: 0, attorney: "", method: "wire", status: "pending", type: "income" },
  })
  const watchedClientId = useWatch({ control: form.control, name: "clientId" }) ?? ""
  const watchedClientName = useWatch({ control: form.control, name: "clientName" }) ?? ""

  useEffect(() => {
    if (tx) {
      form.reset({
        id: tx.$id,
        clientId: tx.clientId,
        clientName: tx.clientName,
        date: tx.date?.split("T")[0] ?? "",
        amount: tx.amount,
        attorney: tx.attorney,
        method: tx.method as "cash" | "wire" | "check",
        status: tx.status as "pending" | "completed",
        type: tx.type as "retainer" | "income" | "expense" | "fee",
      })
    }
  }, [tx, form])

  if (!tx) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Edit Invoice — {tx.$id}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-4">
            <FormItem>
              <FormLabel>Client</FormLabel>
              <ClientPicker
                value={watchedClientId}
                clientName={watchedClientName}
                onChange={(id, name) => { form.setValue("clientId", id); form.setValue("clientName", name) }}
              />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="retainer">Retainer</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="fee">Fee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="method" render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="wire">Wire</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="attorney" render={({ field }) => (
              <FormItem>
                <FormLabel>Attorney</FormLabel>
                <AttorneySelect value={field.value ?? ""} onChange={field.onChange} />
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
