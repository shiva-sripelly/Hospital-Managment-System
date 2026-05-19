import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function FormField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  as = "input",
  options = [],
  required = false,
  placeholder,
  min,
  max
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;
  const commonProps = {
    id: name,
    name,
    value: value ?? "",
    onChange,
    required,
    placeholder,
    inputMode: type === "tel" ? "numeric" : undefined,
    pattern: type === "tel" ? "[0-9]*" : undefined,
    className: `field ${type === "password" ? "pr-10" : ""} ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`
  };

  return (
    <label className="space-y-1.5" htmlFor={name}>
      <span className="label">{label}</span>
      {as === "select" ? (
        <select {...commonProps}>
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : as === "textarea" ? (
        <textarea {...commonProps} rows={3} />
      ) : type === "password" ? (
        <div className="relative">
          <input {...commonProps} type={inputType} min={min} max={max} />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <input {...commonProps} type={inputType} min={min} max={max} />
      )}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

