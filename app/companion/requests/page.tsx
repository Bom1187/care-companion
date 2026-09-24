"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChatDock from "@/app/components/ChatDock";

type RequestFilter = "all" | "open" | "in_progress" | "completed";
type ServiceRequest = { id: string; requester_id: string; companion_id: string | null; service_type: string | null; title: string; details: string | null; origin_location: string | null; destination_location: string | null; status: string; created_at: string; accepted_at: string | null; requester: { full_name: string | null; email: string | null } | null };
const filters: { key: RequestFilter; label: string }[] = [{ key: "all", label: "คำขอทั้งหมด" }, { key: "open", label: "เปิดรับ" }, { key: "in_progress", label: "กำลังดำเนินการ" }, { key: "completed", label: "ส่งสำเร็จ" }];
const statusLabel = (status: string) => status === "open" ? "เปิดรับผู้ช่วยเหลือ" : status === "in_progress" ? "กำลังดำเนินการ" : status === "completed" ? "เสร็จสิ้น" : status;
const statusClassName = (status: string) => status === "open" ? "bg-[#e8f3ff] text-[#3979c8]" : status === "completed" ? "bg-[#e8f7ee] text-[#26804a]" : "bg-[#fff5d6] text-[#9a7211]";

export default function CompanionRequestsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState("");
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<RequestFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [workingRequestId, setWorkingRequestId] = useState<string | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/"); return; }
      setCurrentUserId(user.id);
      const { data, error } = await supabase.from("service_requests").select("id, requester_id, companion_id, service_type, title, details, origin_location, destination_location, status, created_at, accepted_at").in("status", ["open", "in_progress", "completed"]).or(`companion_id.eq.${user.id},companion_id.is.null`).order("created_at", { ascending: false }).returns<Omit<ServiceRequest, "requester">[]>();
      if (error) { setErrorMessage(`โหลดคำขอไม่สำเร็จ: ${error.message}`); setIsLoading(false); return; }
      const loadedRequests = data ?? [];
      const requesterIds = [...new Set(loadedRequests.map((request) => request.requester_id))];
      const { data: requesters } = requesterIds.length > 0 ? await supabase.from("profiles").select("id, full_name, email").in("id", requesterIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
      const requestersById = new Map((requesters ?? []).map((requester) => [requester.id, requester]));
      setRequests(loadedRequests.map((request) => ({ ...request, requester: requestersById.get(request.requester_id) ?? null })));
      setIsLoading(false);
    };
    void loadRequests();
  }, [router]);

  const updateRequestStatus = async (request: ServiceRequest, status: "in_progress" | "completed") => {
    setWorkingRequestId(request.id);
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/"); return; }
    const update = status === "in_progress" ? { companion_id: user.id, status, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status, updated_at: new Date().toISOString() };
    const query = supabase.from("service_requests").update(update).eq("id", request.id);
    const { error } = status === "in_progress" ? await query.eq("status", "open").is("companion_id", null) : await query.eq("status", "in_progress").eq("companion_id", user.id);
    setWorkingRequestId(null);
    if (error) { setErrorMessage(`${status === "in_progress" ? "รับคำขอ" : "ยืนยันการส่งผู้โดยสาร"}ไม่สำเร็จ: ${error.message}`); return; }
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...update } : item));
  };

  const visibleRequests = useMemo(() => requests.filter((request) => selectedFilter === "all" || request.status === selectedFilter), [requests, selectedFilter]);

  return <main className="min-h-screen bg-[#f6f8fb] text-[#17253d]"><header className="border-b border-[#e7edf4] bg-white px-5 py-4 sm:px-10"><div className="mx-auto flex max-w-5xl items-center justify-between"><button type="button" onClick={() => router.push("/companion")} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b70] text-sm font-black text-[#b8e3d0]">cc</span><span className="font-bold tracking-tight">คำขอสำหรับ Companion</span></button><button type="button" onClick={() => router.push("/companion")} className="rounded-xl border border-[#dfe7f0] px-4 py-2 text-sm font-semibold text-[#607089]">กลับหน้าหลัก</button></div></header><div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 lg:py-12"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3979c8]">Companion workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">คำขอของ Customer</h1><p className="mt-2 text-sm text-[#8491a2]">เปิดดูรายละเอียด รับคำขอ และยืนยันเมื่อส่งผู้โดยสารสำเร็จ</p><div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-[#e5ebf2] bg-white p-2">{filters.map((filter) => <button key={filter.key} type="button" onClick={() => setSelectedFilter(filter.key)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${selectedFilter === filter.key ? "bg-[#163b70] text-white" : "text-[#607089] hover:bg-[#f1f6fc]"}`}>{filter.label}</button>)}</div>{errorMessage && <p role="alert" className="mt-5 rounded-xl border border-[#f1d1d1] bg-[#fff4f4] px-4 py-3 text-sm text-[#b43f4e]">{errorMessage}</p>}{isLoading ? <p className="mt-8 text-sm text-[#8491a2]">กำลังโหลดคำขอ...</p> : visibleRequests.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#d8e2ec] bg-white p-10 text-center text-sm text-[#8491a2]">ยังไม่มีคำขอในหมวดนี้</div> : <div className="mt-8 space-y-4">{visibleRequests.map((request) => <article key={request.id} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(28,53,84,0.04)]"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-semibold text-[#3979c8]">{request.service_type || "บริการเดินทาง"}</p><h2 className="mt-1 text-lg font-semibold">{request.title}</h2><p className="mt-2 text-sm leading-6 text-[#607089]">{request.details || "ไม่ได้ระบุรายละเอียดเพิ่มเติม"}</p></div><span className={`h-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClassName(request.status)}`}>{statusLabel(request.status)}</span></div><div className="mt-5 grid gap-3 border-t border-[#edf1f5] pt-4 text-sm sm:grid-cols-2"><p><span className="text-[#8491a2]">Customer: </span>{request.requester?.full_name || request.requester?.email || "ไม่ทราบชื่อ"}</p><p><span className="text-[#8491a2]">ต้นทาง: </span>{request.origin_location || "ไม่ระบุ"}</p><p><span className="text-[#8491a2]">ปลายทาง: </span>{request.destination_location || "ไม่ระบุ"}</p><p><span className="text-[#8491a2]">สร้างเมื่อ: </span>{new Date(request.created_at).toLocaleString("th-TH")}</p></div><div className="mt-5 flex flex-wrap justify-end gap-2">{request.status === "in_progress" && <button type="button" onClick={() => setChatPartnerId(request.requester_id)} className="rounded-xl border border-[#3979c8] px-4 py-2.5 text-sm font-semibold text-[#3979c8]">เริ่มแชทกับ Customer</button>}{request.status === "open" && <button type="button" onClick={() => void updateRequestStatus(request, "in_progress")} disabled={workingRequestId === request.id} className="rounded-xl bg-[#3979c8] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{workingRequestId === request.id ? "กำลังรับคำขอ..." : "รับคำขอ"}</button>}{request.status === "in_progress" && <button type="button" onClick={() => void updateRequestStatus(request, "completed")} disabled={workingRequestId === request.id} className="rounded-xl bg-[#26804a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{workingRequestId === request.id ? "กำลังบันทึก..." : "ยืนยันส่งผู้โดยสารสำเร็จ"}</button>}</div></article>)}</div>}</div>{currentUserId && <ChatDock key={chatPartnerId ?? "chat-history"} userId={currentUserId} initialPartnerId={chatPartnerId} />}</main>;
}
