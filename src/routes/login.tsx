import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TransitOps" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [approvalState, setApprovalState] = useState<"pending" | "rejected" | null>(null);

  if (approvalState) {
    const rejected = approvalState === "rejected";
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] gradient-glow opacity-30" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] gradient-glow opacity-20" />
        </div>
        <main className="relative z-10 w-full max-w-[460px] bg-surface-container border border-outline-variant rounded-lg shadow-2xl p-8 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/20">
            <span className={`material-symbols-outlined text-[40px] ${rejected ? "text-error" : "text-primary"}`}>
              {rejected ? "block" : "hourglass_top"}
            </span>
          </div>
          <div>
            <h1 className="font-display text-[28px] font-bold">
              {rejected ? "Account rejected" : "Waiting for admin approval"}
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              {rejected
                ? "An admin rejected this account request. Please contact your fleet administrator."
                : "Your account exists, but an admin still needs to approve it before you can access TransitOps."}
            </p>
          </div>
          <button
            onClick={() => setApprovalState(null)}
            className="inline-flex h-11 w-full items-center justify-center rounded bg-primary-container text-on-primary-container font-bold hover:brightness-110"
          >
            Back to sign in
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] gradient-glow opacity-30" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] gradient-glow opacity-20" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] flex flex-col gap-8">
        <header className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-lg bg-primary-container/10 border border-primary-container/20">
            <Logo size={44} />
          </div>
          <h1 className="font-display text-[32px] font-black tracking-tight">TransitOps</h1>
          <p className="text-on-surface-variant mt-2 uppercase tracking-widest text-[10px] font-bold">
            Smart Transport Operations Platform
          </p>
        </header>

        <section className="bg-surface-container border border-outline-variant p-6 rounded-lg shadow-2xl">
          <form
            className="flex flex-col gap-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
              if (err) {
                setLoading(false);
                setError(err.message);
                return;
              }
              const userId = data.user?.id;
              if (userId) {
                const { data: profile, error: profileError } = await supabase
                  .from("profiles")
                  .select("status")
                  .eq("id", userId)
                  .maybeSingle();
                if (profileError) {
                  await supabase.auth.signOut();
                  setLoading(false);
                  setError(profileError.message);
                  return;
                }
                if (profile?.status !== "approved") {
                  await supabase.auth.signOut();
                  setLoading(false);
                  setApprovalState(profile?.status === "rejected" ? "rejected" : "pending");
                  return;
                }
              }
              setLoading(false);
              navigate({ to: "/dashboard" });
            }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Email
                </label>
                <input
                  className="w-full h-10 px-3 border border-outline-variant rounded font-mono bg-surface-container-lowest"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full h-10 pl-3 pr-10 border border-outline-variant rounded font-mono bg-surface-container-lowest"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-error text-sm border border-error/30 bg-error-container/10 p-3 rounded">
                {error}
              </div>
            )}

            <button
              className="w-full h-12 bg-primary-container hover:brightness-110 text-on-primary-container font-display text-[16px] font-semibold rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In to TransitOps"}
              <span className="material-symbols-outlined text-[20px]">login</span>
            </button>
          </form>
        </section>

        <p className="text-center text-sm text-on-surface-variant">
          New to TransitOps?{" "}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Create account
          </Link>
        </p>

        <footer className="text-center text-on-surface-variant/60 text-xs">
          <p>© 2026 TransitOps Global Systems.</p>
          <p className="mt-1 font-mono text-[10px]">New accounts require admin approval.</p>
        </footer>
      </main>
    </div>
  );
}
