"use client";

import {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  firmId: string;
  firmName: string;
  role: string;
};

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    firmName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const SIGN_UP_TIMEOUT_MS = 120000;

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  signIn: async () => {}, signUp: async () => {}, signOut: async () => {},
});

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchMe(): Promise<AppUser | null> {
  const response = await fetchWithTimeout("/api/auth/me", { credentials: "include" });
  if (!response.ok) return null;
  const data = (await response.json()) as { user: AppUser | null };
  return data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await fetchWithTimeout("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Failed to sign in.");
    }

    const me = await fetchMe();
    setUser(me);
  }, []);

  const signUp = useCallback(async (input: {
    name: string;
    email: string;
    password: string;
    firmName?: string;
    inviteCode?: string;
  }) => {
    const response = await fetchWithTimeout(
      "/api/auth/sign-up",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      },
      SIGN_UP_TIMEOUT_MS,
    );

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      user?: AppUser;
    } | null;

    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to create account.");
    }

    if (payload?.user) {
      setUser(payload.user);
      return;
    }

    const me = await fetchMe();
    setUser(me);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
