import React from "react";
import type {LucideIcon} from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  /** Say what to do next, not just that nothing is here. */
  body: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({icon: Icon, title, body, action}) => (
  <div className="text-center border border-dashed border-amber-300 rounded-2xl py-16 px-6 bg-white/60">
    <Icon size={32} className="mx-auto text-amber-400 mb-3" />
    <p className="t-subtitle">{title}</p>
    <p className="t-body mt-1 max-w-sm mx-auto text-slate-500">{body}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
