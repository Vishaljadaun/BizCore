import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { fieldClass, panel, primary, muted } from '../operations/ui';
import { errorText } from '../operations/errors';

export const passwordHint = 'Use at least 12 characters, including uppercase, lowercase, a number and a symbol. Maximum 72 UTF-8 bytes.';
export default function AccountSecurityPage() {
  const user = useAuthStore(s => s.user); const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <div className="mx-auto max-w-2xl space-y-6"><div><h1 className="text-2xl font-bold">Account Security</h1><p className={muted}>Manage your password and company sign-in details.</p></div>
    <div className={panel}><p className="font-semibold">{user?.companyName}</p><p className={muted}>Company code: <strong className="select-all">{user?.companyCode || 'Sign in again to load your company code'}</strong></p><p className={muted}>{user?.email}</p></div>
    <form className={panel + ' space-y-4'} onSubmit={async e => { e.preventDefault(); setError(''); if (newPassword !== confirm) { setError('Passwords do not match.'); return; } setBusy(true); try { await api.post('/auth/change-password', { currentPassword, newPassword }); useAuthStore.getState().logout('Password changed. Sign in with your new password.'); navigate('/login', { replace: true }); } catch (err) { setError(errorText(err)); } finally { setBusy(false); } }}>
      <h2 className="text-lg font-semibold">Change password</h2>
      {user?.mustChangePassword && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your administrator reset your password. Choose your own password before continuing.</p>}
      <p className={muted}>{passwordHint} Changing your password signs you out on every device.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <label className="block text-sm">Current password<input className={fieldClass + ' mt-1'} type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
      <label className="block text-sm">New password<input className={fieldClass + ' mt-1'} type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e => setNew(e.target.value)} /></label>
      <label className="block text-sm">Confirm new password<input className={fieldClass + ' mt-1'} type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      <button className={primary} disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
    </form></div>;
}
