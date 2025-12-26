import { Suspense } from "react";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-slate-500">Loading…</div>
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
