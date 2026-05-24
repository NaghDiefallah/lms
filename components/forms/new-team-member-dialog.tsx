"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Eye, EyeOff } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import { PersonnelCreateSchema, type PersonnelCreateInput } from "@/lib/schemas/personnel"

const ROLES = ["CEO", "Partner", "Senior Attorney", "Attorney", "Law Student"] as const

export function NewTeamMemberDialog() {
  const [open, setOpen] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const utils = trpc.useUtils()

  const create = trpc.personnel.create.useMutation({
    onSuccess: () => {
      toast.success("Team member added and account created")
      utils.personnel.list.invalidate()
      setOpen(false)
      form.reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const form = useForm<PersonnelCreateInput>({
    resolver: zodResolver(PersonnelCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      contact: "",
      licensed: false,
      startDate: new Date().toISOString().split("T")[0],
      role: "Attorney",
      passportNumber: "",
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Team Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">

            {/* Identity */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="contact" render={({ field }) => (
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

            <FormField control={form.control} name="licensed" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="mb-0">Bar Licensed</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <Separator />

            {/* Auth account section */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Login Account</p>
              <p className="text-xs text-muted-foreground">
                Creates an LMS account so this team member can sign in.
              </p>
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane@lms.law" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="8+ characters"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  The team member uses this to sign in for the first time.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Add & Create Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
