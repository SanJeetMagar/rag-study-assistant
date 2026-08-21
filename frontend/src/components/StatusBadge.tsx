import React from "react";
import {AlertCircle, CheckCircle2, Clock, Loader2} from "lucide-react";
import type {DocumentStatus} from "../types";

/**
 * Ingestion state, mirroring `Document.Status` on the server.
 *
 * The labels describe what is happening to the reader rather than naming the
 * internal state — "Reading it" beats "Processing" for someone waiting.
 */
const STYLES: Record<
  DocumentStatus,
  {label: string; className: string; icon: React.ReactNode}
> = {
  pending: {
    label: "Queued",
    className: "bg-zinc-100 text-zinc-600",
    icon: <Clock size={13} />,
  },
  processing: {
    label: "Reading it",
    className: "bg-amber-100 text-amber-800",
    icon: <Loader2 size={13} className="animate-spin" />,
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 size={13} />,
  },
  error: {
    label: "Failed",
    className: "bg-red-100 text-red-700",
    icon: <AlertCircle size={13} />,
  },
};

export const StatusBadge: React.FC<{status: DocumentStatus}> = ({status}) => {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${style.className}`}
    >
      {style.icon}
      {style.label}
    </span>
  );
};
