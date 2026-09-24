"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "customer" | "companion" | "admin";
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role")
        .eq("id", user.id)
        .single<Profile>();
      if (error || !data) {
        setErrorMessage(
          `โหลดโปรไฟล์ไม่สำเร็จ: ${error?.message || "ไม่พบข้อมูล"}`,
        );
        setIsLoading(false);
        return;
      }
      setProfile(data);
      setFullName(data.full_name || "");
      setAvatarUrl(data.avatar_url || "");
      setIsLoading(false);
    };
    void loadProfile();
  }, [router]);

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    setErrorMessage("");
    if (!file.type.startsWith("image/")) {
      setErrorMessage("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("รูปภาพต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setAvatarUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!profile || !fullName.trim()) return;
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("id, email, full_name, avatar_url, role")
      .single<Profile>();
    setIsSaving(false);
    if (error) {
      setErrorMessage(`บันทึกโปรไฟล์ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setProfile(data);
    setMessage("บันทึกโปรไฟล์ในเว็บไซต์แล้ว");
  };

  if (isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-sm text-[#607089]">
        กำลังโหลดโปรไฟล์...
      </main>
    );
  if (!profile)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-sm text-[#b43f4e]">
        {errorMessage || "ไม่พบโปรไฟล์"}
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#17253d]">
      <header className="border-b border-[#e7edf4] bg-white px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/${profile.role}`)}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b70] text-sm font-black text-[#b8e3d0]">
              cc
            </span>
            <span className="font-bold tracking-tight">โปรไฟล์ของฉัน</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${profile.role}`)}
            className="rounded-xl border border-[#dfe7f0] px-4 py-2 text-sm font-semibold text-[#607089]"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-10 lg:py-14">
        <section className="rounded-3xl border border-[#e5ebf2] bg-white p-7 shadow-[0_16px_40px_rgba(28,53,84,0.06)] sm:p-10">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            แก้ไขข้อมูลโปรไฟล์
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#8491a2]">
            การเปลี่ยนแปลงนี้มีผลเฉพาะในเว็บไซต์ ไม่เปลี่ยนข้อมูล Google account
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#e8f3ff] text-2xl font-bold text-[#3979c8]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="รูปโปรไฟล์"
                  className="h-full w-full object-cover"
                />
              ) : (
                (fullName || profile.email || "U").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold">{profile.email}</p>
              <p className="mt-1 text-sm text-[#8491a2]">
                รูป Google เดิมจะแสดงเป็นค่าเริ่มต้น
              </p>
            </div>
          </div>
          <label
            htmlFor="full-name"
            className="mt-8 block text-sm font-semibold"
          >
            ชื่อที่แสดง
          </label>
          <input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm outline-none focus:border-[#3979c8]"
          />
          <label
            htmlFor="avatar-file"
            className="mt-5 block text-sm font-semibold"
          >
            เลือกรูปโปรไฟล์
          </label>
          <input
            id="avatar-file"
            type="file"
            accept="image/*"
            onChange={(event) => chooseAvatar(event.target.files?.[0])}
            className="mt-2 w-full rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef5ff] file:px-3 file:py-2 file:font-semibold file:text-[#3979c8]"
          />
          <p className="mt-2 text-xs text-[#8491a2]">
            เลือกไฟล์รูปภาพจากเครื่อง ขนาดไม่เกิน 2 MB
          </p>
          {errorMessage && (
            <p role="alert" className="mt-4 text-sm text-[#b43f4e]">
              {errorMessage}
            </p>
          )}
          {message && (
            <p role="status" className="mt-4 text-sm text-[#26804a]">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={isSaving || !fullName.trim()}
            className="mt-6 w-full rounded-xl bg-[#163b70] py-3 font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
          </button>
        </section>
      </div>
    </main>
  );
}
