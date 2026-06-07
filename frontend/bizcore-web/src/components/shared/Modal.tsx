import type { ReactNode } from 'react';

const Modal = ({ children, open }: { children: ReactNode; open?: boolean }) => {
	if (!open) return null;
	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center">
			<div className="bg-white p-4 rounded shadow">{children}</div>
		</div>
	);
};

export default Modal;

