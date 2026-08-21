import React from "react";

interface Props {
  title: string;
  /** One line saying what this screen is for, or the current state of it. */
  description?: React.ReactNode;
  /** Buttons. Wrap to their own row on narrow screens rather than squashing. */
  actions?: React.ReactNode;
}

/**
 * The header every screen starts with.
 *
 * Was copy-pasted across five pages with slightly different spacing and
 * heading sizes each time, which is how visual hierarchy drifts.
 */
export const PageHeader: React.FC<Props> = ({title, description, actions}) => (
  <header className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <h1 className="t-display">{title}</h1>
      {description && <p className="t-body mt-1 max-w-prose">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);
