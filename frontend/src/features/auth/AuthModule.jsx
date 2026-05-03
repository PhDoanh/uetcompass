import React from 'react';
import './auth.css';

export function AuthField({ id, label, children, action }) {
  return (
    <div className="auth-field">
      {action ? (
        <div className="auth-field-row">
          <label htmlFor={id} className="auth-label">
            {label}
          </label>
          {action}
        </div>
      ) : (
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export function AuthTabs({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="auth-tabs" role="tablist" aria-label="Authentication sections">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={item.active ? 'auth-tab active' : 'auth-tab'}
          role="tab"
          aria-selected={Boolean(item.active)}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function AuthShell({
  title,
  description,
  isLoading,
  error,
  success,
  children,
  icon,
  tabs,
  footerNote,
  footerSecondary,
  footerTertiary,
  footerLinks,
  backLink,
}) {
  const normalizedFooterLinks = Array.isArray(footerLinks) ? footerLinks : [];

  return (
    <main className="auth-shell">
      <section className="auth-card">
        {backLink ? (
          <a href={backLink.href} className="auth-back-link">
            <span aria-hidden="true">&larr;</span>
            <span>{backLink.label}</span>
          </a>
        ) : null}

        <header className="auth-header">
          {icon ? <div className="auth-brand-icon">{icon}</div> : null}
          <h1 className="auth-title">{title}</h1>
          {description ? <p className="auth-description">{description}</p> : null}
        </header>

        <AuthTabs items={tabs} />

        <div className="auth-content">{children}</div>

        <footer className="auth-footer">
          {footerNote ? <p className="auth-footer-line">{footerNote}</p> : null}
          {footerSecondary ? <p className="auth-footer-line">{footerSecondary}</p> : null}
          {footerTertiary ? <p className="auth-footer-line">{footerTertiary}</p> : null}
          {normalizedFooterLinks.length > 0 ? (
            <div className="auth-footer-links">
              {normalizedFooterLinks.map((link) => (
                <a key={link.href + link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </footer>
      </section>
    </main>
  );
}

export default function AuthModule({ children }) {
  return <>{children}</>;
}
