"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/customer`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (authError) {
      setError(
        "ไม่สามารถเชื่อมต่อ Google ได้ กรุณาตรวจสอบการตั้งค่า Supabase แล้วลองใหม่",
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-[#17253d]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.9),transparent_48%),linear-gradient(rgba(44,102,196,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(44,102,196,0.045)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px]" />
      <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#d8e9ff] blur-3xl" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-8 sm:px-10 lg:px-16">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/80 bg-white/85 shadow-[0_24px_80px_rgba(27,52,87,0.13)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex min-h-[640px] flex-col justify-between overflow-hidden bg-[#163b70] p-8 text-white sm:p-12 lg:p-14">
            <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_80%_12%,#4d95e8_0,transparent_28%),radial-gradient(circle_at_10%_92%,#1e7891_0,transparent_35%)]" />
            <div className="relative">
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b8e3d0] text-lg font-black text-[#163b70]">
                  cc
                </div>
                <span className="text-lg font-bold tracking-tight">
                  Care Companion
                </span>
              </div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#b8e3d0]">
                เดินทางอย่างมั่นใจ
              </p>
              <h1 className="max-w-md text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                ทุกธุระสำคัญ มีคนที่พร้อมไปด้วยกัน
              </h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-blue-100">
                พื้นที่ที่เชื่อมต่อผู้ต้องการความช่วยเหลือกับ Companion
                ที่เหมาะสม เพื่อให้ทุกการเดินทางนอกบ้านอุ่นใจยิ่งขึ้น
              </p>
            </div>
            <div className="relative mt-12 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="mb-2 text-2xl font-semibold">01</p>
                <p className="text-blue-100">บอกความต้องการของคุณ</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="mb-2 text-2xl font-semibold">02</p>
                <p className="text-blue-100">พบคนที่ใช่สำหรับทริปนี้</p>
              </div>
            </div>
          </div>
          <div className="flex min-h-[640px] flex-col justify-center p-8 sm:p-12 lg:p-16">
            <div className="mx-auto w-full max-w-md">
              <p className="mb-3 text-sm font-semibold text-[#3979c8]">
                ยินดีต้อนรับ
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#17253d] sm:text-4xl">
                เข้าสู่ Care Companion
              </h2>
              <p className="mt-3 leading-7 text-[#6e7d91]">
                เริ่มต้นประสบการณ์ที่เหมาะกับคุณ
              </p>
              <div className="mt-8 rounded-2xl border border-[#e4eaf1] bg-[#f8fafc] p-4 text-sm leading-6 text-[#6e7d91]">
                ระบบจะตรวจสอบ role ของบัญชี Google
                จากฐานข้อมูลให้อัตโนมัติหลังเข้าสู่ระบบ
              </div>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isLoading}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#3979c8] px-5 py-4 font-semibold text-white shadow-[0_10px_20px_rgba(57,121,200,0.22)] transition hover:bg-[#2d68b2] disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3979c8]">
                  G
                </span>
                {isLoading ? "กำลังเชื่อมต่อ..." : "Sign in with Google"}
              </button>
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                  {error}
                </p>
              )}
              <p className="mt-6 text-center text-xs leading-5 text-[#8b97a6]">
                การเข้าสู่ระบบแสดงว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของ
                Care Companion
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
