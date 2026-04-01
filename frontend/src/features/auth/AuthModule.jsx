import React from 'react';
import './auth.css';

export function AuthField({ id, label, children }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthShell({ title, description, isLoading, error, success, children }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1 className="auth-title">{title}</h1>
        {description ? <p className="auth-description">{description}</p> : null}
        {isLoading ? <p className="auth-status helper">Processing...</p> : null}
        {error ? <p className="auth-status error">{error}</p> : null}
        {success ? <p className="auth-status success">{success}</p> : null}
        {children}
      </section>
    </main>
  );
}

export default function AuthModule({ children }) {
  return <>{children}</>;
}
