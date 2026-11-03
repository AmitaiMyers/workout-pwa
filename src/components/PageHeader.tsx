import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { assert } from '../domain/assert';

interface Props {
  title: ReactNode;
  /** Back button that returns to the previous screen. */
  back?: boolean;
  /** Back button to a fixed route; use where history may be empty (e.g. the app was reopened on this screen). */
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, back = false, backTo, actions }: Props) {
  assert(!(back && backTo !== undefined), 'PageHeader takes either `back` or `backTo`, not both');
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
      )}
      {backTo !== undefined && (
        <Link to={backTo} className="icon-button" aria-label="Back">
          ‹
        </Link>
      )}
      <h1 className="page-title">{title}</h1>
      {actions !== undefined && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Loading() {
  return <p className="muted center">Loading…</p>;
}
