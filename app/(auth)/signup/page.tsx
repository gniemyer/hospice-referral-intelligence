"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create organization and add user as admin member
    if (organization.trim()) {
      try {
        const res = await fetch("/api/org/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organization_name: organization }),
        });
        if (!res.ok) {
          const data = await res.json();
          console.warn("Org setup warning:", data.error);
        }
      } catch (err) {
        console.warn("Org setup failed:", err);
      }
    }

    router.push("/dashboard");
  }

  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">HRI</h1>
        <p className="mt-1 text-sm text-gray-500">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Sunrise Hospice"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-button px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-gradient-button-hover disabled:opacity-50 transition-all"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
