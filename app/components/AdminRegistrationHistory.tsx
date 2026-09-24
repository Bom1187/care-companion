"use client";

type Registration = {
  id: number;
  full_name: string | null;
  email: string | null;
  registered_at: string;
};

type Props = {
  open: boolean;
  registrations: Registration[];
  onClose: () => void;
};

const dateTime = (value: string) =>
  new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function AdminRegistrationHistory({
  open,
  registrations,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[#3979c8]">
              Registration history
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              ประวัติการสมัครสมาชิก
            </h2>
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
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#e5ebf2]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[#f7f9fc] text-xs text-[#8491a2]">
              <tr>
                <th className="px-4 py-3 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">สมัครเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f5]">
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td className="px-4 py-3 font-semibold">
                    {registration.full_name || "ไม่ระบุชื่อ"}
                  </td>
                  <td className="px-4 py-3 text-[#607089]">
                    {registration.email || "ไม่มีอีเมล"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[#8491a2]">
                    {dateTime(registration.registered_at)}
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-sm text-[#8491a2]">
                    ยังไม่มีประวัติสมาชิกที่สมัครเข้ามา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
