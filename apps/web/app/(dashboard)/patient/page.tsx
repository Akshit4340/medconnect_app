'use client';

import { useAuth } from '../../../contexts/auth.context';
import { useAppointments } from '../../../hooks/use-appointments';
import { Badge } from '../../../components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAppointments({ status: 'confirmed' });

  const appointments = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.email}
        </h1>
        <p className="text-slate-500 mt-1">Here's your health overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {appointments.length}
            </p>
            <p className="text-sm text-slate-500 mt-1">appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Quick action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/patient/doctors">
              <Button className="w-full" size="sm">
                Book appointment
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/patient/profile">
              <Button variant="outline" className="w-full" size="sm">
                View profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming appointments</CardTitle>
            <Link href="/patient/appointments">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-4">
                No upcoming appointments
              </p>
              <Link href="/patient/doctors">
                <Button size="sm">Find a doctor</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt: Record<string, string>) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Dr. {appt.doctorId}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(appt.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                  >
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
