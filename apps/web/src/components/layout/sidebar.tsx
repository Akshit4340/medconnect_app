/* UI OVERHAUL: Parsley Health-inspired sidebar.
 * - Lucide icons replace emojis for a professional, consistent look
 * - Sage green active states with soft rounded nav items
 * - Warm cream background with serif brand heading */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/auth.context';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Search,
  User,
  Users,
  Stethoscope,
  CalendarClock,
  Settings,
} from 'lucide-react';

const patientLinks = [
  { href: '/patient', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patient/appointments', label: 'Appointments', icon: Calendar },
  { href: '/patient/doctors', label: 'Find Doctors', icon: Search },
  { href: '/patient/profile', label: 'My Profile', icon: User },
];

const doctorLinks = [
  { href: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/doctor/patients', label: 'Patients', icon: Stethoscope },
  { href: '/doctor/schedule', label: 'My Schedule', icon: CalendarClock },
  { href: '/doctor/profile', label: 'My Profile', icon: User },
];

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/appointments', label: 'Appointments', icon: Calendar },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
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
    <aside className="w-64 bg-white border-r border-[#E8E2DA] flex-col hidden md:flex">
      {/* Brand header with serif font */}
      <div className="p-6 border-b border-[#E8E2DA]">
        <div className="flex items-center gap-2.5">
          {/* Leaf icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5B7B6A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 8c.7-1 1.2-2.2 1.6-3.6.4-1.5.4-3.1 0-4.4-1.3-.4-2.9-.4-4.4 0C12.8 .4 11.6.9 10.6 1.6 8 4.3 6.5 8.2 7 12c-1.4 1.4-2.5 3.2-3 5.2A13 13 0 0 0 16 5" />
            <path d="M2 22c2-4 5.5-7.5 10-9" />
          </svg>
          <div>
            <h2 className="text-lg font-semibold text-[#2D2D2D] font-heading">
              MedConnect
            </h2>
            <p className="text-[10px] text-[#7A7267] uppercase tracking-widest">
              {user?.role} portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#5B7B6A] text-white shadow-sm'
                  : 'text-[#5A5A5A] hover:bg-[#E8F0EC] hover:text-[#3D5A4A]',
              )}
            >
              {/* UI OVERHAUL: Lucide icons — thin, minimalist, consistent weight */}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#E8E2DA]">
        <p className="text-[10px] text-[#A09A90] text-center tracking-wide">
          © 2026 MedConnect
        </p>
      </div>
    </aside>
  );
}
