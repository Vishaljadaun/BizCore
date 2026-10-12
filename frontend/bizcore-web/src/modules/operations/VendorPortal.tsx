import { useState } from 'react';
import OperationsPage from './OperationsPage';
import { button, primary } from './ui';
export default function VendorPortal() {
  const [tab, setTab] = useState<'orders' | 'contracts' | 'suppliers'>('orders');
  return <div className="space-y-6"><nav aria-label="Vendor sections" className="flex flex-wrap gap-2">{(['orders', 'contracts', 'suppliers'] as const).map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? primary : button} onClick={() => setTab(value)}>{value === 'suppliers' ? 'Supplier profile' : value === 'orders' ? 'Orders' : 'Contracts'}</button>)}</nav><OperationsPage key={tab} resource={tab} vendor /></div>;
}
