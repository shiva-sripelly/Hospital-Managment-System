import React from "react";
import { Edit3, Trash2 } from "lucide-react";

export default function DataTable({ columns, data, emptyText, onEdit, onDelete, actions }) {
  const hasActions = Boolean(actions || onEdit || onDelete);

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 font-bold">
                  {column.label}
                </th>
              ))}
              {hasActions && <th className="px-5 py-3 text-right font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-brand-50/50">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {column.render ? column.render(row) : row[column.key] || "-"}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {actions ? actions(row) : null}
                        {!actions && onEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            aria-label="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        ) : null}
                        {!actions && onDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

