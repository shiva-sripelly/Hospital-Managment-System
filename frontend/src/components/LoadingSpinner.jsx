import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ label = "Loading" }) {
  return (
    <div className="flex min-h-36 items-center justify-center gap-3 text-sm font-semibold text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
      <span>{label}</span>
    </div>
  );
}

