import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-amber-700 "
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-amber-400  pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border text-base text-amber-900 bg-amber-50   placeholder-zinc-400  transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 ${
            icon ? "pl-10" : "pl-3.5"
          } py-2.5 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-zinc-300  focus:border-rose-500"
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-sm font-medium text-red-500">{error}</span>
      ) : helperText ? (
        <span className="text-sm text-zinc-400 ">{helperText}</span>
      ) : null}
    </div>
  );
};
