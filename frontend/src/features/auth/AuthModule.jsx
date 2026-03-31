import React from 'react';

export function AuthShell({ title, description, isLoading, error, success, children }) {
  return (
    <main style={{ maxWidth: 460, margin: '48px auto', padding: 16 }}>
      <h1>{title}</h1>
      {description ? <p style={{ color: '#475467' }}>{description}</p> : null}
      {isLoading ? <p>Processing...</p> : null}
      {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
      {success ? <p style={{ color: '#067647' }}>{success}</p> : null}
      {children}
    </main>
  );
}

export default function AuthModule({ children }) {
  return <>{children}</>;
}
