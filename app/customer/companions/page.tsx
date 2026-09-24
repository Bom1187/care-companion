"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Companion = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  latestRequest: {
    title: string;
    origin_location: string | null;
    destination_location: string | null;
    created_at: string;
  };
  averageRating: number;
  reviewCount: number;
};
type RequestRow = {
  id: string;
  companion_id: string | null;
  title: string;
  origin_location: string | null;
  destination_location: string | null;
  created_at: string;
};
type ReviewRow = { companion_id: string; rating: number };

export default function CustomerCompanionsPage() {
  const router = useRouter();
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadCompanions = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { data: requests, error } = await supabase
        .from("service_requests")
        .select(
          "id, companion_id, title, origin_location, destination_location, created_at",
        )
        .eq("requester_id", user.id)
        .eq("status", "completed")
        .not("companion_id", "is", null)
        .order("created_at", { ascending: false })
        .returns<RequestRow[]>();
      if (error) {
        setErrorMessage(`โหลดประวัติ Companion ไม่สำเร็จ: ${error.message}`);
        setIsLoading(false);
        return;
      }
      const completedRequests = requests ?? [];
      const companionIds = [
        ...new Set(
          completedRequests
            .map((request) => request.companion_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (companionIds.length === 0) {
        setIsLoading(false);
        return;
      }
      const [{ data: profiles }, { data: reviews }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", companionIds),
        supabase
          .from("companion_reviews")
          .select("companion_id, rating")
          .in("companion_id", companionIds)
          .returns<ReviewRow[]>(),
      ]);
      const reviewsByCompanion = new Map<string, ReviewRow[]>();
      (reviews ?? []).forEach((review) =>
        reviewsByCompanion.set(review.companion_id, [
          ...(reviewsByCompanion.get(review.companion_id) ?? []),
          review,
        ]),
      );
      const latestByCompanion = new Map<string, RequestRow>();
      completedRequests.forEach((request) => {
        if (
          request.companion_id &&
          !latestByCompanion.has(request.companion_id)
        )
          latestByCompanion.set(request.companion_id, request);
      });
      setCompanions(
        (profiles ?? []).map((profile) => {
          const companionReviews = reviewsByCompanion.get(profile.id) ?? [];
          return {
            ...profile,
            latestRequest: latestByCompanion.get(profile.id) ?? {
              title: "บริการที่เสร็จแล้ว",
              origin_location: null,
              destination_location: null,
              created_at: new Date().toISOString(),
            },
            averageRating:
              companionReviews.length > 0
                ? companionReviews.reduce(
                    (total, review) => total + review.rating,
                    0,
                  ) / companionReviews.length
                : 0,
            reviewCount: companionReviews.length,
          };
        }),
      );
      setIsLoading(false);
    };
    void loadCompanions();
  }, [router]);

  const visibleCompanions = useMemo(
    () =>
      companions.filter((companion) =>
        `${companion.full_name || ""} ${companion.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [companions, search],
  );

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#17253d]">
      <header className="border-b border-[#e7edf4] bg-white px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/customer")}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b70] text-sm font-black text-[#b8e3d0]">
              cc
            </span>
            <span className="font-bold tracking-tight">
              Companion ที่เคยให้บริการ
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/customer")}
            className="rounded-xl border border-[#dfe7f0] px-4 py-2 text-sm font-semibold text-[#607089]"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3979c8]">
              ประวัติการให้บริการ
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Companion ที่เคยให้บริการคุณ
            </h1>
            <p className="mt-2 text-sm text-[#8491a2]">
              Companion ที่เคยร่วมเดินทางกับคุณ พร้อมคะแนนจาก Customer ทั้งหมด
            </p>
          </div>
          <span className="rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm font-semibold text-[#3979c8]">
            {companions.length} คน
          </span>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#dfe7f0] bg-white px-4 py-3">
            <span className="text-[#3979c8]">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาจากชื่อ หรืออีเมล..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select className="rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm font-semibold text-[#607089]">
            <option>เรียงตามล่าสุด</option>
            <option>คะแนนสูงสุด</option>
          </select>
        </div>
        {errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-[#f1d1d1] bg-[#fff4f4] px-4 py-3 text-sm text-[#b43f4e]"
          >
            {errorMessage}
          </p>
        )}
        {isLoading ? (
          <p className="mt-8 text-sm text-[#8491a2]">
            กำลังโหลดข้อมูล Companion...
          </p>
        ) : visibleCompanions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ec] bg-white p-12 text-center text-sm text-[#8491a2]">
            ยังไม่มี Companion ที่ให้บริการคุณ
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCompanions.map((companion) => (
              <article
                key={companion.id}
                className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(28,53,84,0.05)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#b8e3d0] text-xl font-bold text-[#163b70]">
                    {companion.avatar_url ? (
                      <img
                        src={companion.avatar_url}
                        alt={`รูปโปรไฟล์ ${companion.full_name || "Companion"}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (companion.full_name || companion.email || "C")
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </div>
                  <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-xs font-semibold text-[#3979c8]">
                    เคยให้บริการ
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {companion.full_name || companion.email || "Companion"}
                </h2>
                <p className="mt-1 text-xs text-[#8491a2]">
                  {companion.email || "Companion ในระบบ"}
                </p>
                <div className="mt-4 border-t border-[#edf1f5] pt-4">
                  <p className="text-xs font-semibold text-[#8491a2]">
                    คำขอล่าสุดที่ให้บริการคุณ
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#607089]">
                    {companion.latestRequest.title}
                  </p>
                  <p className="mt-1 text-xs text-[#8491a2]">
                    {companion.latestRequest.origin_location || "ไม่ระบุ"} →{" "}
                    {companion.latestRequest.destination_location || "ไม่ระบุ"}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#3979c8]">
                    ★{" "}
                    {companion.averageRating > 0
                      ? companion.averageRating.toFixed(1)
                      : "ยังไม่มีคะแนน"}{" "}
                    <span className="text-xs font-normal text-[#9aa7b5]">
                      ({companion.reviewCount} รีวิว)
                    </span>
                  </p>
                  <span className="text-xs text-[#9aa7b5]">
                    {new Date(
                      companion.latestRequest.created_at,
                    ).toLocaleDateString("th-TH")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
