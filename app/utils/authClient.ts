"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
  token?: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

function storeAuthLocally(user: AuthUser, token?: string, justSignedUp?: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
  if (token) {
    localStorage.setItem("token", token);
  }
  if (justSignedUp) {
    localStorage.setItem("justSignedUp", "true");
  }
}

export async function signupAndOnboard(payload: SignupPayload): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || "Something went wrong" };
    }

    if (!data || !data.user || !data.user.name) {
      return { ok: false, error: "Invalid signup response" };
    }

    storeAuthLocally(data.user, data.token, true);

    // Smoothly move to dashboard with newSignup flag
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard?newSignup=true";
    }

    return { ok: true, user: data.user, token: data.token };
  } catch (_err: unknown) {
    return { ok: false, error: "Network error" };
  }
}

export async function loginAndBootstrap(payload: LoginPayload): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        res.status === 404
          ? "Server not found. Please make sure the backend server is running."
          : data.error || "Login failed";
      return { ok: false, error: message };
    }

    if (!data || !data.user || !data.user.name) {
      return { ok: false, error: "Invalid login response" };
    }

    storeAuthLocally(data.user, data.token, false);

    // After successful login, go to dashboard where data will be fetched
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }

    return { ok: true, user: data.user, token: data.token };
  } catch (_err: unknown) {
    return {
      ok: false,
      error: "Network error. Please check if the backend server is running.",
    };
  }
}

export function logoutClientSide() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("locked_folders_authenticated");
  // Data stays on the server; this just clears local auth
}
