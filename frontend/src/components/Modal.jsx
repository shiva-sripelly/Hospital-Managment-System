import React from "react";
import { X } from "lucide-react";

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-65px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

