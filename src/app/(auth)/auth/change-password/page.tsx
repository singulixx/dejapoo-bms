import { Suspense } from "react";
import ChangePasswordClient from "./ChangePasswordClient";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ChangePasswordClient />
    </Suspense>
  );
}
