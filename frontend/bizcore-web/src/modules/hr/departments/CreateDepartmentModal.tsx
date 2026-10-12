import { useEffect, useState } from 'react';
import { hrApi } from '../../../api/hrApi';
import type { DepartmentResponse, EmployeeResponse } from '../../../types';
import { Dialog, fieldClass, primary, muted } from '../../operations/ui';
import { errorText } from '../../operations/errors';
export default function CreateDepartmentModal({ department, onClose, onSuccess }: { department?: DepartmentResponse; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(department?.name || ''); const [description, setDescription] = useState(department?.description || '');
  const [managerId, setManager] = useState(department?.managerId || ''); const [search, setSearch] = useState(''); const [people, setPeople] = useState<EmployeeResponse[]>([]);
  const [error, setError] = useState(''); const [lookupError, setLookupError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!department) return; let active = true; const timer = setTimeout(() => { hrApi.getEmployees({ search, isActive: true, pageSize: 100 }).then(data => { if (active) { setPeople(data.items); setLookupError(''); } }).catch(err => { if (active) setLookupError(errorText(err)); }); }, 200); return () => { active = false; clearTimeout(timer); }; }, [search, department]);
  return <Dialog title={department ? 'Edit Department' : 'Create Department'} close={onClose} busy={busy}><form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { if (department) await hrApi.updateDepartment(department.id, { name, description: description || null, managerId: managerId || null }); else await hrApi.createDepartment({ name, description: description || null }); onSuccess(); } catch (err) { setError(errorText(err)); } finally { setBusy(false); } }}>
    {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
    <label className="block text-sm">Department Name<input className={fieldClass + ' mt-1'} required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-sm">Description (Optional)<textarea className={fieldClass + ' mt-1'} maxLength={500} rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label>
    {department && <div className="space-y-2"><label className="block text-sm">Search manager<input className={fieldClass + ' mt-1'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an active employee" /></label><label className="block text-sm">Department manager<select className={fieldClass + ' mt-1'} value={managerId} onChange={e => setManager(e.target.value)}><option value="">No manager</option>{managerId && !people.some(p => p.id === managerId) && <option value={managerId}>{department.managerName || 'Current manager'}</option>}{people.map(p => <option key={p.id} value={p.id}>{p.fullName} · {p.employeeCode}</option>)}</select></label>{people.length === 100 && <p className={muted}>Showing 100 matches. Narrow your search.</p>}{lookupError && <p role="alert" className="text-sm text-red-600">{lookupError} Change the search to retry.</p>}</div>}
    <button className={primary} disabled={busy}>{busy ? 'Saving…' : department ? 'Save Department' : 'Create Department'}</button>
  </form></Dialog>;
}
