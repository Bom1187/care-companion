"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "customer" | "companion" | "admin";
type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  moderation_type: "ban" | "timeout" | null;
};

type Props = {
  open: boolean;
  members: Member[];
  initialMemberId: string;
  onClose: () => void;
  onUpdated: (member: Member, message: string) => void;
};

export default function AdminMemberManager({
  open,
  members,
  initialMemberId,
  onClose,
  onUpdated,
}: Props) {
  const [tab, setTab] = useState<"moderation" | "role">("moderation");
  const [memberId, setMemberId] = useState(initialMemberId);
  const [memberSearch, setMemberSearch] = useState("");
  const [moderationType, setModerationType] = useState<"ban" | "timeout">(
    "timeout",
  );
  const [duration, setDuration] = useState("60");
  const [note, setNote] = useState("");
  const [newRole, setNewRole] = useState<Role>("customer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return [member.full_name, member.email, member.id, member.role]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const selectedMember = members.find((member) => member.id === memberId);
  const memberInputValue =
    memberSearch ||
    (selectedMember
      ? `${selectedMember.full_name || selectedMember.email || selectedMember.id} (${selectedMember.role})`
      : "");

  const selectMember = (value: string) => {
    const member = members.find(
      (item) =>
        `${item.full_name || item.email || item.id} (${item.role})` === value,
    );
    setMemberSearch(value);
    setMemberId(member?.id ?? "");
  };

  if (!open) return null;

  const saveRole = async () => {
    if (!memberId) return;
    setSaving(true);
    setError("");
    const { error: requestError } = await supabase.rpc("admin_set_user_role", {
      target_user_id: memberId,
      new_role: newRole,
    });
    setSaving(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    onUpdated(
      { ...members.find((member) => member.id === memberId)!, role: newRole },
      "เปลี่ยน role สำเร็จแล้ว",
    );
  };

  const saveModeration = async (action: "ban" | "timeout" | "clear") => {
    if (!memberId) return;
    setSaving(true);
    setError("");
    const { error: requestError } = await supabase.rpc(
      "admin_set_member_moderation",
      {
        target_user_id: memberId,
        action_type: action,
        duration_minutes: action === "clear" ? null : Number(duration),
        moderation_reason: action === "clear" ? null : note,
      },
    );
    setSaving(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const current = members.find((member) => member.id === memberId)!;
    onUpdated(
      { ...current, moderation_type: action === "clear" ? null : action },
      action === "clear"
        ? "ยกเลิกการระงับสมาชิกแล้ว"
        : "บันทึกการระงับสมาชิกแล้ว",
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[#3979c8]">
              Admin control
            </p>
            <h2 className="mt-1 text-2xl font-semibold">จัดการสมาชิก</h2>
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
        <label className="mt-6 block text-sm font-semibold">เลือกสมาชิก</label>
        <div className="relative mt-2">
          <input
            list="admin-members"
            value={memberInputValue}
            onChange={(event) => selectMember(event.target.value)}
            placeholder="ค้นหาหรือเลือกสมาชิก"
            className="w-full rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 pr-10 text-sm"
          />
          {memberInputValue && (
            <button
              type="button"
              onClick={() => {
                setMemberSearch("");
                setMemberId("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-[#8090a4]"
              aria-label="ล้างสมาชิก"
            >
              ×
            </button>
          )}
        </div>
        <datalist id="admin-members">
          {filteredMembers.map((member) => (
            <option
              key={member.id}
              value={`${member.full_name || member.email || member.id} (${member.role})`}
            />
          ))}
        </datalist>
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[#f3f6fa] p-1">
          <button
            type="button"
            onClick={() => setTab("moderation")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "moderation" ? "bg-white text-[#3979c8] shadow-sm" : "text-[#7a899c]"}`}
          >
            Ban / Timeout
          </button>
          <button
            type="button"
            onClick={() => setTab("role")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "role" ? "bg-white text-[#3979c8] shadow-sm" : "text-[#7a899c]"}`}
          >
            มอบ role
          </button>
        </div>
        {tab === "moderation" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                การดำเนินการ
              </label>
              <select
                value={moderationType}
                onChange={(event) =>
                  setModerationType(event.target.value as "ban" | "timeout")
                }
                className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
              >
                <option value="timeout">Timeout</option>
                <option value="ban">Ban</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                ระยะเวลา
              </label>
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
              >
                <option value="60">1 ชั่วโมง</option>
                <option value="1440">1 วัน</option>
                <option value="10080">7 วัน</option>
                <option value="43200">30 วัน</option>
                <option value="525600">1 ปี</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                หมายเหตุ
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                placeholder="ระบุเหตุผลหรือหมายเหตุ"
              />
            </div>
            <button
              type="button"
              disabled={!memberId || saving}
              onClick={() => saveModeration(moderationType)}
              className="w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : `ยืนยัน ${moderationType === "ban" ? "Ban" : "Timeout"}`}
            </button>
            <button
              type="button"
              disabled={!memberId || saving}
              onClick={() => saveModeration("clear")}
              className="w-full rounded-xl border border-[#dfe7f0] py-3 text-sm font-semibold text-[#607089] disabled:opacity-50"
            >
              ปลด Ban / Timeout
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Role ใหม่
              </label>
              <select
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as Role)}
                className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
              >
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="button"
              disabled={!memberId || saving}
              onClick={saveRole}
              className="w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก role"}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
