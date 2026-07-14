import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — TransitOps" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "dispatcher", terms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] gradient-glow opacity-30" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] gradient-glow opacity-20" />
      </div>

      <main className="relative z-10 w-full max-w-[1100px] flex flex-col md:flex-row shadow-2xl rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
        <div className="hidden md:flex md:w-5/12 bg-surface-container-low p-10 flex-col justify-between relative overflow-hidden border-r border-outline-variant">
          <div className="relative z-20">
            <div className="flex items-center gap-2 mb-8">
              <Logo size={36} showWordmark />
            </div>
            <div className="space-y-6">
              <h2 className="font-display text-[24px] font-semibold text-primary leading-tight">
                Empowering Fleet Excellence through Precision Data.
              </h2>
              <p className="text-sm text-on-surface-variant max-w-[320px]">
                Sign up to request access. An admin will review and assign your role.
              </p>
              <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">
                  Bootstrap Notice
                </p>
                <p className="text-xs text-on-surface-variant">
                  The <span className="text-primary">first person to sign up</span> automatically
                  becomes the admin. Everyone else waits for approval.
                </p>
              </div>
            </div>
          </div>
          <div
            className="absolute inset-0 z-10 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#E67E22 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        </div>

        <div className="w-full md:w-7/12 bg-surface p-8 md:p-12">
          <h3 className="font-display text-[24px] font-semibold mb-1">Create your account</h3>
          <p className="text-sm text-on-surface-variant mb-8">
            Start optimizing your transport operations today.
          </p>

          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (!form.terms) {
                setError("Please accept the Terms of Service.");
                return;
              }
              setLoading(true);
              const { error: err } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                  data: { name: form.name, role: form.role },
                  emailRedirectTo: window.location.origin,
                },
              });
              setLoading(false);
              if (err) {
                setError(err.message);
                return;
              }
              navigate({ to: "/dashboard" });
            }}
          >
            <Field label="Full Name" icon="person">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
                className="input"
              />
            </Field>
            <Field label="Email Address" icon="mail">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@company.com"
                className="input"
              />
            </Field>
            <Field label="Password" icon="lock">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                className="input"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary z-10"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </Field>
            <label className="flex items-start gap-3 py-2 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                className="mt-1"
              />
              <span>
                I agree to the <a className="text-primary hover:underline">Terms of Service</a> and{" "}
                <a className="text-primary hover:underline">Privacy Policy</a>.
              </span>
            </label>
            {error && (
              <div className="text-error text-sm border border-error/30 bg-error-container/10 p-3 rounded">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-container font-display text-[16px] font-semibold py-4 rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create Account"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <p className="text-center text-sm mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </main>

      <style>{`
        .input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid var(--color-outline-variant);
          border-radius: 8px;
          background-color: var(--color-surface-container-lowest);
          color: var(--color-on-surface);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none z-10">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
