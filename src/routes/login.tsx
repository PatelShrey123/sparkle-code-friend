import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TransitOps" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@transitops.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] gradient-glow opacity-30" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] gradient-glow opacity-20" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] flex flex-col gap-8">
        <header className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-lg bg-primary-container/10 border border-primary-container/20">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_shipping
            </span>
          </div>
          <h1 className="font-display text-[32px] font-black tracking-tight">TransitOps</h1>
          <p className="text-on-surface-variant mt-2 uppercase tracking-widest text-[10px] font-bold">
            Smart Transport Operations Platform
          </p>
        </header>

        <section className="bg-surface-container border border-outline-variant p-6 rounded-lg shadow-2xl">
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                actions.login(email, password);
                navigate({ to: "/dashboard" });
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Email
                </label>
                <input
                  className="w-full h-10 px-3 border border-outline-variant rounded font-mono"
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
                <input
                  className="w-full h-10 px-3 border border-outline-variant rounded font-mono"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
          <p className="mt-1 font-mono text-[10px]">Demo credentials pre-filled.</p>
        </footer>
      </main>
    </div>
  );
}
