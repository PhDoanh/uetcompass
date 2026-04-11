import { useState } from 'react';
import accountApi from '../../services/account.api';
import { isPasswordPolicyValid } from './accountSettings.validation';

export default function AccountPasswordSection({ token }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setStatus('');
    setError('');

    if (!isPasswordPolicyValid(newPassword)) {
      setError('New password is invalid');
      return;
    }

    try {
      const result = await accountApi.changePassword(token, { currentPassword, newPassword });
      setStatus(result?.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err?.message || 'Failed to change password');
    }
  }

  return (
    <section>
      <h3>Change Password</h3>
      <form onSubmit={onSubmit}>
        <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <button type="submit">Change Password</button>
      </form>
      {error ? <p>{error}</p> : null}
      {status ? <p>{status}</p> : null}
    </section>
  );
}
