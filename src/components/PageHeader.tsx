import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

interface Props {
  title: ReactNode;
  back?: boolean;
  actions?: ReactNode;
}

export function PageHeader({ title, back = false, actions }: Props) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
      )}
      <h1 className="page-title">{title}</h1>
      {actions !== undefined && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Loading() {
  return <p className="muted center">Loading…</p>;
}
