/* UI OVERHAUL: Parsley Health-inspired doctor patients page.
 * - Warm earthy palette, sage green accents
 * - Rounded cards and avatar initials */
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Users } from 'lucide-react';

interface Patient {
  id: string;
  userId: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalSummary?: string;
  emergencyContactName?: string;
  createdAt: string;
}

export default function DoctorPatientsPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'patients', cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const res = await api.get(`/patients?${params}`);
      return res.data as {
        data: Patient[];
        hasMore: boolean;
        nextCursor?: string;
      };
    },
  });

  const patients = data?.data || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D2D2D] font-heading">
          My Patients
        </h1>
        <p className="text-[#7A7267] mt-1">All patients in your clinic</p>
      </div>

      <Card className="shadow-sm shadow-black/5 border-[#E8E2DA]/60 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[#2D2D2D] font-heading">
            Patient list
          </CardTitle>
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
          ) : patients.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto text-[#5B7B6A]/30 mb-3" />
              <p className="text-[#7A7267] text-sm">No patients found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-[#FAF8F5] rounded-xl hover:bg-[#F5F0EB] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* UI OVERHAUL: Sage green avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#5B7B6A] flex items-center justify-center text-white font-medium text-sm">
                      {patient.userId.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2D2D2D]">
                        Patient {patient.id.slice(0, 8)}...
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {patient.bloodGroup && (
                          <span className="text-xs text-[#7A7267]">
                            {patient.bloodGroup}
                          </span>
                        )}
                        {patient.dateOfBirth && (
                          <span className="text-xs text-[#7A7267]">
                            DOB:{' '}
                            {new Date(patient.dateOfBirth).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {patient.allergies && patient.allergies.length > 0 && (
                      <div className="flex gap-1">
                        {patient.allergies.slice(0, 2).map((allergy) => (
                          <Badge
                            key={allergy}
                            variant="secondary"
                            className="text-xs bg-[#FDECEC] text-[#C4604A] border-0"
                          >
                            {allergy}
                          </Badge>
                        ))}
                        {patient.allergies.length > 2 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-[#F5F0EB] text-[#7A7267] border-0"
                          >
                            +{patient.allergies.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-[#A09A90]">
                      Since {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {data?.hasMore && (
                <div className="text-center pt-3">
                  <button
                    className="text-sm text-[#5B7B6A] hover:text-[#4A6A59] font-medium transition-colors"
                    onClick={() => setCursor(data.nextCursor)}
                  >
                    Load more →
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
