"use client";

import { useState } from "react";

type Role = "customer" | "companion" | "admin";
type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
};

type Props = {
  members: Member[];
};

export default function AdminMemberOverview({ members }: Props) {
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const visibleMembers =
    roleFilter === "all"
      ? members
      : members.filter((member) => member.role === roleFilter);

  return (
    <section className="mx-auto max-w-[1200px] mb-15 rounded-2xl border border-[#e5ebf2] bg-white px-5 py-6 sm:px-10">
      <div>
        <h2 className="text-lg font-semibold">สมาชิกทั้งหมด</h2>
        <p className="mt-1 text-sm text-[#8491a2]">
          ดูชื่อ อีเมล และ role ของสมาชิกแต่ละคน
        </p>
      </div>
      <select
        value={roleFilter}
        onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}
        className="mt-5 w-full rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm text-[#34455e]"
        aria-label="เลือก role เพื่อกรองสมาชิก"
      >
        <option value="all">ทุก role</option>
        <option value="admin">Admin</option>
        <option value="companion">Companion</option>
        <option value="customer">Customer</option>
      </select>
      <div className="mt-5 divide-y divide-[#edf1f5]">
        {visibleMembers.map((member) => (
          <div key={member.id} className="py-3">
            <p className="text-sm font-semibold">
              {member.full_name || "ไม่ระบุชื่อ"}
            </p>
            <p className="mt-1 text-xs text-[#8491a2]">
              {member.email || "ไม่มีอีเมล"} · {member.role}
            </p>
          </div>
        ))}
        {visibleMembers.length === 0 && (
          <p className="py-4 text-sm text-[#8491a2]">ไม่พบสมาชิกใน role นี้</p>
        )}
      </div>
    </section>
  );
}
