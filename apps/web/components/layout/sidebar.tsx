'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/auth.context';
import { cn } from '../../lib/utils';

const patientLinks = [
  { href: '/patient', label: 'Dashboard', icon: '🏠' },
  { href: '/patient/appointments', label: 'Appointments', icon: '📅' },
  { href: '/patient/doctors', label: 'Find Doctors', icon: '🔍' },
  { href: '/patient/profile', label: 'My Profile', icon: '👤' },
];

const doctorLinks = [
  { href: '/doctor', label: 'Dashboard', icon: '🏠' },
  { href: '/doctor/appointments', label: 'Appointments', icon: '📅' },
  { href: '/doctor/patients', label: 'Patients', icon: '🧑‍⚕️' },
  { href: '/doctor/schedule', label: 'My Schedule', icon: '🗓️' },
  { href: '/doctor/profile', label: 'My Profile', icon: '👤' },
];

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: '🏠' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/appointments', label: 'Appointments', icon: '📅' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const links =
    user?.role === 'admin'
      ? adminLinks
      : user?.role === 'doctor'
        ? doctorLinks
        : patientLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">MedConnect</h2>
        <p className="text-xs text-slate-500 mt-0.5 capitalize">
          {user?.role} portal
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === link.href
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
