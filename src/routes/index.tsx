import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const session = useDB((d) => d.session);
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: session ? "/dashboard" : "/login", replace: true });
  }, [session, navigate]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
    </div>
  );
}
