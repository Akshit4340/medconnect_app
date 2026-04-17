/* UI OVERHAUL: Parsley Health-inspired admin dashboard.
 * - Sage green accent cards, warm backgrounds
 * - Serif headings, generous spacing */
'use client';

import { useAdminStats } from '../../../hooks/use-admin';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Users, Stethoscope, UserCheck, Calendar } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats() as {
    data: AdminStats | undefined;
    isLoading: boolean;
  };

  const statCards = [
    {
      label: 'Total users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-[#E8F0EC] text-[#5B7B6A]',
    },
    {
      label: 'Doctors',
      value: stats?.totalDoctors ?? 0,
      icon: Stethoscope,
      color: 'bg-[#E8F0EC] text-[#5B7B6A]',
    },
    {
      label: 'Patients',
      value: stats?.totalPatients ?? 0,
      icon: UserCheck,
      color: 'bg-[#FFF3E8] text-[#D4A574]',
    },
    {
      label: 'Appointments',
      value: stats?.totalAppointments ?? 0,
      icon: Calendar,
      color: 'bg-[#F5F0EB] text-[#7A7267]',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          Admin Dashboard
        </h1>
        <p className="text-[#7A7267] mt-1">Tenant overview</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-2xl animate-pulse shadow-sm"
            />
          ))}
        </div>
      ) : (
        <>
          {/* UI OVERHAUL: Cards with subtle shadow, rounded corners, icon accents */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.label}
                  className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-[#7A7267] flex items-center gap-2 uppercase tracking-wide">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}
                      >
                        <Icon size={14} />
                      </span>
                      {card.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-[#2D2D2D]">
                      {card.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {stats?.appointmentsByStatus && (
            <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[#2D2D2D] font-heading">
                  Appointments by status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.appointmentsByStatus).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="bg-[#FAF8F5] rounded-xl p-4 text-center"
                      >
                        <p className="text-2xl font-bold text-[#2D2D2D]">
                          {count as number}
                        </p>
                        <p className="text-sm text-[#7A7267] capitalize mt-1">
                          {status}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
