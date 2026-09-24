"use client";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role?: string;
};

type AuditEvent = {
  id: number;
  event_type: string;
  metadata: Record<string, string | number | null>;
  target_user_id: string | null;
  created_at: string;
};

type UserRegistration = {
  id: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  registered_at: string;
};

type ServiceRequest = {
  id: number;
  title: string;
  status: string;
  requester_id: string;
  companion_id: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  profiles: Profile[];
  events: AuditEvent[];
  registrations: UserRegistration[];
  requests: ServiceRequest[];
  onClose: () => void;
};

const dateTime = (value: string) =>
  new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function AdminActivityCenter({
  open,
  profiles,
  events,
  registrations,
  requests,
  onClose,
}: Props) {
  if (!open) return null;

  const nameOf = (id: string | null) => {
    const profile = profiles.find((item) => item.id === id);
    return profile?.full_name || profile?.email || "ไม่ทราบชื่อผู้ใช้";
  };

  const eventLabel = (event: AuditEvent) => {
    const labels: Record<string, string> = {
      user_registered: "การลงทะเบียนใหม่",
      role_changed: "เปลี่ยน role สมาชิก",
      moderation_applied: "ระงับสมาชิก",
      moderation_cleared: "ยกเลิกการระงับสมาชิก",
      moderation_appeal_submitted: "ส่งคำร้องปลดการระงับ",
      moderation_appeal_reviewed: "ตรวจคำร้องปลดการระงับ",
    };
    return labels[event.event_type] ?? event.event_type;
  };

  const appealEvents = events.filter(
    (event) => event.event_type === "moderation_appeal_submitted",
  );
  const activityEvents = events.filter(
    (event) => event.event_type !== "moderation_appeal_submitted",
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="mt-1 text-2xl font-semibold">กิจกรรมล่าสุด</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#8090a4]"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {activityEvents.map((event) => (
            <div
              key={`registration-${event.id}`}
              className="rounded-xl bg-[#f7f9fc] p-4"
            >
              <p className="text-sm font-semibold">
                {eventLabel(event)}: {nameOf(event.target_user_id)}
              </p>
              <p className="mt-1 text-xs text-[#8491a2]">
                {dateTime(event.created_at)}
              </p>
            </div>
          ))}
          {requests.map((request) => (
            <div
              key={`request-${request.id}`}
              className="rounded-xl bg-[#f7f9fc] p-4"
            >
              <p className="text-sm font-semibold">{request.title}</p>
              <p className="mt-1 text-sm text-[#607089]">
                ผู้สร้างคำขอ: {nameOf(request.requester_id)}
              </p>
              <p className="mt-1 text-sm text-[#607089]">
                ผู้รับคำขอ: {nameOf(request.companion_id)}
              </p>
              <p className="mt-1 text-xs text-[#8491a2]">
                {dateTime(request.created_at)} · {request.status}
              </p>
            </div>
          ))}
          {activityEvents.length === 0 && requests.length === 0 && (
            <p className="rounded-xl bg-[#f7f9fc] p-4 text-sm text-[#8491a2]">
              ยังไม่มีข้อมูลกิจกรรม
            </p>
          )}
        </div>
        <section className="mt-7">
          <h3 className="font-semibold">ประวัติสมาชิกที่สมัครเข้ามา</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#e5ebf2]">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#f7f9fc] text-xs text-[#8491a2]">
                <tr>
                  <th className="px-4 py-3 font-semibold">ชื่อ</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">สมัครเมื่อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f5]">
                {registrations.map((registration) => (
                  <tr key={`registration-history-${registration.id}`}>
                    <td className="px-4 py-3 font-semibold">
                      {registration.full_name || "ไม่ระบุชื่อ"}
                    </td>
                    <td className="px-4 py-3 text-[#607089]">
                      {registration.email || "ไม่มีอีเมล"}
                    </td>
                    <td className="px-4 py-3 text-[#607089]">
                      {registration.role}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#8491a2]">
                      {dateTime(registration.registered_at)}
                    </td>
                  </tr>
                ))}
                {registrations.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-sm text-[#8491a2]"
                    >
                      ยังไม่มีประวัติสมาชิกที่สมัครเข้ามา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mt-7">
          <h3 className="font-semibold">คำร้องขอปลด Ban / Timeout</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#e5ebf2]">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#f7f9fc] text-xs text-[#8491a2]">
                <tr>
                  <th className="px-4 py-3 font-semibold">ผู้ยื่นคำร้อง</th>
                  <th className="px-4 py-3 font-semibold">วันที่และเวลา</th>
                  <th className="px-4 py-3 font-semibold">เหตุผล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f5]">
                {appealEvents.map((event) => (
                  <tr key={`appeal-${event.id}`}>
                    <td className="px-4 py-3 font-semibold">
                      {nameOf(event.target_user_id)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#8491a2]">
                      {dateTime(event.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[#607089]">
                      {String(
                        event.metadata.reason ||
                          event.metadata.note ||
                          "ไม่ได้ระบุเหตุผล",
                      )}
                    </td>
                  </tr>
                ))}
                {appealEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-sm text-[#8491a2]"
                    >
                      ยังไม่มีคำร้องขอปลด Ban / Timeout
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
