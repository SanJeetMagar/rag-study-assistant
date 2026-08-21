import React from "react";
import {AlertCircle} from "lucide-react";

/**
 * Inline failure message.
 *
 * `role="alert"` means a screen reader announces it when it appears, which a
 * plain coloured <p> does not. Renders nothing when there is no message, so
 * callers can drop it in unconditionally.
 */
export const ErrorBanner: React.FC<{message?: string; className?: string}> = ({
  message,
  className = "",
}) => {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 t-body text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${className}`}
    >
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </p>
  );
};
