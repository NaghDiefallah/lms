"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Scale, Eye, EyeOff, UserPlus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firmName: z.string().optional(),
  inviteCode: z.string().optional(),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((d) => !!(d.inviteCode?.trim() || d.firmName?.trim()), {
  message: "Provide a firm name or an invite code",
  path: ["firmName"],
})

type FormInput = z.infer<typeof schema>

export default function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", firmName: "", inviteCode: "" },
  })

  async function onSubmit(values: FormInput) {
    setError(null)
    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        firmName: values.firmName?.trim() || undefined,
        inviteCode: values.inviteCode?.trim() || undefined,
      })
      router.push("/dashboard")
    } catch (e: any) {
      setError(e?.message ?? "Failed to create account. The email may already be registered.")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between border-r border-border bg-card p-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-primary p-2">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">LMS</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="space-y-6">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight">
            Join your firm&apos;s<br />
            <span className="text-primary">legal workspace.</span>
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Manage cases and clients in one place",
              "Track invoices and retainers",
              "Collaborate with your team",
              "Keep a full audit trail on activities",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} Lawfirm Management System (LMS)</div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-8">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute right-6 top-6 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Moon className="h-4 w-4" />}
        </button>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Scale className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LMS</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
              <p className="mt-1 text-muted-foreground">Enter your details to get started.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@lms.law" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="firmName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firm Name</FormLabel>
                    <FormControl>
                      <Input placeholder="LMS Law LLP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="inviteCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite Code (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="inv_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repeat password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full gap-2" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating account…" : <><UserPlus className="h-4 w-4" />Create Account</>}
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
