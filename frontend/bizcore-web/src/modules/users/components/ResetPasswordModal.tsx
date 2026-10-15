import { useState } from 'react';
import api from '../../../api/axiosClient';
import type { UserResponse } from '../../../types';
import { Dialog, fieldClass, primary, muted } from '../../operations/ui';
import { errorText } from '../../operations/errors';
import { passwordHint } from '../../auth/AccountSecurityPage';
export default function ResetPasswordModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const [adminPassword, setAdmin] = useState(''); const [temporaryPassword, setTemporary] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  return <Dialog title="Reset password" close={onClose} busy={busy}>{done ? <div className="space-y-4"><p role="status">Password reset for {user.email}.</p><p className={muted}>Share the temporary password privately. Their previous sessions are revoked and they must choose a new password after signing in. No email has been sent.</p><button className={primary} onClick={onClose}>Done</button></div> : <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await api.post(`/users/${user.id}/reset-password`, { adminPassword, temporaryPassword }); setAdmin(''); setTemporary(''); setDone(true); } catch (err) { setError(errorText(err)); } finally { setBusy(false); } }}>
    <p>Reset access for <strong>{user.fullName}</strong> ({user.email}).</p><p className={muted}>Verify the person's identity before giving them a temporary password. {passwordHint}</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <label className="block text-sm">Your admin password<input className={fieldClass + ' mt-1'} type="password" autoComplete="current-password" required value={adminPassword} onChange={e => setAdmin(e.target.value)} /></label>
    <label className="block text-sm">Temporary password<input className={fieldClass + ' mt-1'} type="password" autoComplete="new-password" required minLength={12} value={temporaryPassword} onChange={e => setTemporary(e.target.value)} /></label>
    <button className={primary} disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button>
  </form>}</Dialog>;
}
