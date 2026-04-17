/* UI OVERHAUL: Parsley Health-inspired patient dashboard.
 * - Warm, welcoming design with serif headings
 * - Sage green accents for CTAs and badges
 * - Subtle shadows and generous spacing */
'use client';

import { useAuth } from '../../../contexts/auth.context';
import { useAppointments } from '../../../hooks/use-appointments';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { Calendar, Search, User, CalendarCheck } from 'lucide-react';

/* UI OVERHAUL: Earthy status badge colors */
const statusColors: Record<string, string> = {
  pending: 'bg-[#FFF3E8] text-[#C4874A]',
  confirmed: 'bg-[#E8F0EC] text-[#5B7B6A]',
  completed: 'bg-[#E8EDF5] text-[#5A6B8A]',
  cancelled: 'bg-[#FDECEC] text-[#C4604A]',
};

type AppointmentSummary = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  doctorId: string;
  notes?: string;
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAppointments({ status: 'confirmed' });
  const appointments: AppointmentSummary[] = data?.data || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          Welcome back, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-[#7A7267] mt-1">Here&apos;s your health overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#7A7267] flex items-center gap-2 uppercase tracking-wide">
              <span className="w-7 h-7 rounded-lg bg-[#E8F0EC] flex items-center justify-center text-[#5B7B6A]">
                <Calendar size={14} />
              </span>
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#2D2D2D]">
              {appointments.length}
            </p>
            <p className="text-sm text-[#7A7267] mt-1">appointments</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#7A7267] flex items-center gap-2 uppercase tracking-wide">
              <span className="w-7 h-7 rounded-lg bg-[#E8F0EC] flex items-center justify-center text-[#5B7B6A]">
                <Search size={14} />
              </span>
              Quick action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/patient/doctors">
              <Button
                className="w-full rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors"
                size="sm"
              >
                Book appointment
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#7A7267] flex items-center gap-2 uppercase tracking-wide">
              <span className="w-7 h-7 rounded-lg bg-[#F5F0EB] flex items-center justify-center text-[#7A7267]">
                <User size={14} />
              </span>
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/patient/profile">
              <Button
                variant="outline"
                className="w-full rounded-full border-[#E8E2DA] text-[#5B7B6A] hover:bg-[#E8F0EC] transition-colors"
                size="sm"
              >
                View profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming appointments */}
      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#2D2D2D] font-heading">
              Upcoming appointments
            </CardTitle>
            <Link href="/patient/appointments">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#5B7B6A] hover:bg-[#E8F0EC] rounded-full transition-colors"
              >
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-[#F5F0EB] rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck
                size={40}
                className="mx-auto text-[#5B7B6A]/30 mb-3"
              />
              <p className="text-[#7A7267] text-sm mb-4">
                No upcoming appointments
              </p>
              <Link href="/patient/doctors">
                <Button
                  size="sm"
                  className="rounded-full bg-[#5B7B6A] hover:bg-[#4A6A59] text-white transition-colors"
                >
                  Find a doctor
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(appt.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'confirmed' && (
                      <Link href={`/patient/consultation/${appt.id}`}>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-xs h-7"
                        >
                          Join
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
