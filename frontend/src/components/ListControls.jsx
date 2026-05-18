import React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function ListControls({
  search,
  setSearch,
  onSearch,
  page,
  onPrevious,
  onNext,
  hasNext,
  loading,
  placeholder = "Search"
}) {
  return (
    <form className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center" onSubmit={onSearch}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      <button className="btn-secondary" type="submit" disabled={loading}>
        Search
      </button>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 lg:justify-start">
        <button
          type="button"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPrevious}
          disabled={loading || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center text-sm font-bold text-slate-600">Page {page}</span>
        <button
          type="button"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onNext}
          disabled={loading || !hasNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
