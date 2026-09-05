import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Every screen was drawing its own empty state by hand, which is how three
 * different ones end up on three screens. An empty state is a first-class
 * surface: it is the first thing a new reader sees.
 */
export const EmptyState = ({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) => (
  <div className="empty-state">
    <span className="empty-icon">
      <Icon name={icon} size={24} />
    </span>
    <div className="empty-copy">
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </div>
    {action}
  </div>
);
