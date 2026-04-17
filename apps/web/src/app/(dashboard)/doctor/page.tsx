'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Appointment = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  patientId: string;
  notes?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DoctorDashboard() {
  const { user } = useAuth();

  // Fetch all active appointments (pending + confirmed)
  const { data: allData, isLoading } = useAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  const allAppointments: Appointment[] = allData?.data || [];

  const pendingAppointments = allAppointments.filter(
    (a) => a.status === 'pending',
  );
  const confirmedAppointments = allAppointments.filter(
    (a) => a.status === 'confirmed',
  );
  const todayAppointments = allAppointments.filter((a) => {
    const apptDate = new Date(a.scheduledAt).toDateString();
    const today = new Date().toDateString();
    return apptDate === today && a.status !== 'cancelled';
  });

  const handleConfirm = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'confirmed' });
      toast.success('Appointment confirmed');
    } catch {
      toast.error('Failed to confirm');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'completed' });
      toast.success('Appointment marked as complete');
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-slate-500 mt-1">{user?.email}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {pendingAppointments.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Confirmed today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {todayAppointments.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              My schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/doctor/schedule">
              <Button variant="outline" size="sm" className="w-full">
                Manage
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              All appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/doctor/appointments">
              <Button variant="outline" size="sm" className="w-full">
                View all
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Confirmed appointments — ready to join */}
      {confirmedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Ready to join
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                {confirmedAppointments.length} confirmed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {confirmedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(appt.scheduledAt).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {appt.durationMinutes} min
                      {appt.notes && ` · "${appt.notes}"`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/doctor/consultation/${appt.id}`}>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Join call
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleComplete(appt.id)}
                      disabled={updateStatus.isPending}
                    >
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending appointment requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending requests</CardTitle>
            <Link href="/doctor/appointments">
              <Button variant="ghost" size="sm">
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
                  className="h-16 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : pendingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">No pending requests</p>
              <p className="text-slate-400 text-xs mt-1">
                New bookings will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(appt.scheduledAt).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient ID: {appt.patientId.slice(0, 8)}... ·{' '}
                      {appt.durationMinutes} min
                    </p>
                    {appt.notes && (
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(appt.id)}
                      disabled={updateStatus.isPending}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus.mutateAsync({
                          id: appt.id,
                          status: 'cancelled',
                          cancellationReason: 'Doctor unavailable',
                        })
                      }
                      disabled={updateStatus.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's schedule */}
      {todayAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Today's schedule —{' '}
              {new Date().toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayAppointments
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt).getTime() -
                    new Date(b.scheduledAt).getTime(),
                )
                .map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-12">
                        <p className="text-sm font-bold text-slate-900">
                          {new Date(appt.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {appt.durationMinutes}m
                        </p>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div>
                        <p className="text-sm text-slate-700">
                          Patient {appt.patientId.slice(0, 8)}...
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status]}`}
                        >
                          {appt.status}
                        </span>
                      </div>
                    </div>
                    {appt.status === 'confirmed' && (
                      <Link href={`/doctor/consultation/${appt.id}`}>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Join
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
