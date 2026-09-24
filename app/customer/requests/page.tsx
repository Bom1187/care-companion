"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequestStatus = "all" | "active" | "completed" | "cancelled";

type ServiceRequest = {
  id: string;
  companion_id: string | null;
  service_type: string | null;
  title: string;
  details: string | null;
  start_location: string | null;
  destination: string | null;
  origin_location: string | null;
  destination_location: string | null;
  status: string;
  created_at: string;
  companion: { full_name: string | null; email: string | null } | null;
};

type CompanionReview = {
  id: number;
  service_request_id: string;
  rating: number;
  review: string;
  created_at: string;
};

function ReviewEditor({
  requestId,
  customerId,
  companionId,
  existingReview,
  onSubmitted,
}: {
  requestId: string;
  customerId: string;
  companionId: string | null;
  existingReview: CompanionReview | null;
  onSubmitted: (review: CompanionReview) => void;
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!companionId) return null;
  if (existingReview) {
    return <div className="mt-5 rounded-xl bg-[#f7fbff] p-4"><p className="text-sm font-semibold text-[#3979c8]">รีวิวของคุณ</p><p className="mt-2 text-lg tracking-[0.18em] text-[#e5a91c]">{"★".repeat(existingReview.rating)}<span className="text-[#d9e3ee]">{"★".repeat(5 - existingReview.rating)}</span></p><p className="mt-2 text-sm leading-6 text-[#607089]">{existingReview.review || "ไม่ได้เขียนความคิดเห็นเพิ่มเติม"}</p></div>;
  }

  const submitReview = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("companion_reviews")
      .insert({ service_request_id: requestId, customer_id: customerId, companion_id: companionId, rating, review: reviewText.trim() })
      .select("id, service_request_id, rating, review, created_at")
      .single<CompanionReview>();
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(`ส่งรีวิวไม่สำเร็จ: ${error.message}`);
      return;
    }
    onSubmitted(data);
  };

  return <div className="mt-5 border-t border-[#edf1f5] pt-4"><p className="text-sm font-semibold">รีวิว Companion</p><div className="mt-2 flex gap-1" aria-label="ให้คะแนน 1 ถึง 5 ดาว">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} ดาว`} className={`text-2xl ${value <= rating ? "text-[#e5a91c]" : "text-[#d9e3ee]"}`}>★</button>)}</div><textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="เขียนความคิดเห็นเกี่ยวกับ Companion" rows={3} className="mt-2 w-full rounded-xl border border-[#dfe7f0] px-3 py-2 text-sm outline-none focus:border-[#3979c8]" /><div className="mt-2 flex items-center justify-between gap-3">{errorMessage ? <p role="alert" className="text-xs text-[#b43f4e]">{errorMessage}</p> : <span /> }<button type="button" onClick={() => void submitReview()} disabled={isSubmitting} className="rounded-xl bg-[#163b70] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{isSubmitting ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}</button></div></div>;
}

const tabs: { key: RequestStatus; label: string }[] = [
  { key: "all", label: "คำขอทั้งหมด" },
  { key: "active", label: "กำลังดำเนินการ" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
];

const isActive = (status: string) => status.trim() === "" || ["open", "pending", "accepted", "in_progress", "assigned", "active"].includes(status.toLowerCase());

export default function CustomerRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [reviewsByRequestId, setReviewsByRequestId] = useState<Record<string, CompanionReview | null>>({});

  useEffect(() => {
    const loadRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      setCustomerId(user.id);

      const { data, error } = await supabase
        .from("service_requests")
        .select("id, service_type, title, details, start_location, destination, origin_location, destination_location, status, created_at, companion_id")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false })
        .returns<(ServiceRequest & { companion_id: string | null })[]>();

      if (error) {
        setErrorMessage(`โหลดคำขอไม่สำเร็จ: ${error.message}`);
        setIsLoading(false);
        return;
      }

      const loadedRequests = data ?? [];
      const companionIds = [...new Set(loadedRequests.map((request) => request.companion_id).filter((id): id is string => Boolean(id)))];
      const { data: companions } = companionIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", companionIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
      const companionsById = new Map((companions ?? []).map((companion) => [companion.id, companion]));
      const requestIds = loadedRequests.map((request) => request.id);
      const { data: reviews } = requestIds.length > 0
        ? await supabase.from("companion_reviews").select("id, service_request_id, rating, review, created_at").in("service_request_id", requestIds).returns<CompanionReview[]>()
        : { data: [] as CompanionReview[] };
      setReviewsByRequestId(Object.fromEntries((reviews ?? []).map((review) => [review.service_request_id, review])));

      setRequests(loadedRequests.map((request) => ({
        ...request,
        companion: request.companion_id ? companionsById.get(request.companion_id) ?? null : null,
      })));
      setIsLoading(false);
    };

    void loadRequests();
  }, [router]);

  const cancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId);
    setErrorMessage("");
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    setCancellingRequestId(null);

    if (error) {
      setErrorMessage(`ยกเลิกคำขอไม่สำเร็จ: ${error.message}`);
      return;
    }

    setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: "cancelled" } : request));
  };

  const visibleRequests = useMemo(() => requests.filter((request) => {
    if (selectedStatus === "active") return isActive(request.status);
    return selectedStatus === "all" || request.status.toLowerCase() === selectedStatus;
  }), [requests, selectedStatus]);

  const statusLabel = (status: string) => {
    if (status.trim() === "" || status === "pending") return "ว่าง";
    if (status === "open") return "เปิดรับผู้ช่วยเหลือ";
    if (status === "completed") return "เสร็จสิ้น";
    if (status === "cancelled") return "ยกเลิก";
    if (isActive(status)) return "กำลังดำเนินการ";
    return status;
  };

  const statusClassName = (status: string) => {
    if (status === "completed") return "bg-[#e8f7ee] text-[#26804a]";
    if (status === "cancelled") return "bg-[#fff0f0] text-[#b43f4e]";
    if (status === "open") return "bg-[#e8f3ff] text-[#3979c8]";
    if (isActive(status)) return "bg-[#fff5d6] text-[#9a7211]";
    return "bg-[#eef6ff] text-[#3979c8]";
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#17253d]">
      <header className="border-b border-[#e7edf4] bg-white px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button type="button" onClick={() => router.push("/customer")} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b70] text-sm font-black text-[#b8e3d0]">cc</span><span className="font-bold tracking-tight">คำขอของฉัน</span></button>
          <button type="button" onClick={() => router.push("/customer")} className="rounded-xl border border-[#dfe7f0] px-4 py-2 text-sm font-semibold text-[#607089]">กลับหน้าหลัก</button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 lg:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3979c8]">Customer workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">คำขอที่คุณสร้าง</h1>
        <p className="mt-2 text-sm text-[#8491a2]">แสดงเฉพาะคำขอที่สร้างจากบัญชีของคุณ</p>
        <div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-[#e5ebf2] bg-white p-2">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setSelectedStatus(tab.key)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${selectedStatus === tab.key ? "bg-[#163b70] text-white" : "text-[#607089] hover:bg-[#f1f6fc]"}`}>{tab.label}</button>)}</div>
        {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-[#f1d1d1] bg-[#fff4f4] px-4 py-3 text-sm text-[#b43f4e]">{errorMessage}</p>}
        {isLoading ? <p className="mt-8 text-sm text-[#8491a2]">กำลังโหลดคำขอ...</p> : visibleRequests.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ec] bg-white p-10 text-center text-sm text-[#8491a2]">ยังไม่มีคำขอในหมวดนี้</div> : <div className="mt-8 space-y-4">{visibleRequests.map((request) => <article key={request.id} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(28,53,84,0.04)]"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-semibold text-[#3979c8]">{request.service_type || "บริการเดินทาง"}</p><h2 className="mt-1 text-lg font-semibold">{request.title}</h2><p className="mt-2 text-sm leading-6 text-[#607089]">{request.details || "ไม่ได้ระบุรายละเอียดเพิ่มเติม"}</p></div><span className={`h-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClassName(request.status)}`}>{statusLabel(request.status)}</span></div><div className="mt-5 grid gap-3 border-t border-[#edf1f5] pt-4 text-sm sm:grid-cols-2"><p><span className="text-[#8491a2]">ต้นทาง: </span>{request.start_location || request.origin_location || "ไม่ระบุ"}</p><p><span className="text-[#8491a2]">ปลายทาง: </span>{request.destination || request.destination_location || "ไม่ระบุ"}</p><p><span className="text-[#8491a2]">Companion: </span>{request.companion?.full_name || request.companion?.email || "ยังไม่มีผู้รับคำขอ"}</p></div><div className="mt-4 flex items-center justify-between gap-4"><p className="text-xs text-[#9aa7b5]">สร้างเมื่อ {new Date(request.created_at).toLocaleString("th-TH")}</p>{isActive(request.status) && <button type="button" onClick={() => void cancelRequest(request.id)} disabled={cancellingRequestId === request.id} className="rounded-xl border border-[#efcaca] px-3 py-2 text-xs font-semibold text-[#b43f4e] disabled:cursor-wait disabled:opacity-60">{cancellingRequestId === request.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}</button>}</div>{request.status === "completed" && <ReviewEditor requestId={request.id} customerId={customerId} companionId={request.companion_id} existingReview={reviewsByRequestId[request.id] ?? null} onSubmitted={(review) => setReviewsByRequestId((current) => ({ ...current, [request.id]: review }))} />}</article>)}</div>}
      </div>
    </main>
  );
}