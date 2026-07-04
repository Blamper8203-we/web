import React from "react";

import { AppIcon, AppIconName } from "./AppIcon";
import "./EmptyState.css";

interface EmptyStateProps {
  icon: AppIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {


  return (
    <div className="empty-state-container" style={style}>
      <div className="empty-state-icon">
        <AppIcon name={icon} size={48} />
      </div>
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-description">{description}</p>
      {onAction && actionLabel && (
        <button className="empty-state-action accent-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
