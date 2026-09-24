"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminMemberManager from "@/app/components/AdminMemberManager";
import AdminMemberOverview from "@/app/components/AdminMemberOverview";
import AdminActivityCenter from "@/app/components/AdminActivityCenter";
import AdminRegistrationHistory from "@/app/components/AdminRegistrationHistory";
import CompanionReviewHistory from "@/app/components/CompanionReviewHistory";
import ChatDock from "@/app/components/ChatDock";

type Role = "customer" | "companion" | "admin";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  moderation_type: "ban" | "timeout" | null;
  moderation_until: string | null;
  moderation_note: string | null;
};

type AuditEvent = {
  id: number;
  event_type: string;
  metadata: Record<string, string | number | null>;
  created_at: string;
  target_user_id: string | null;
};

type UserRegistration = {
  id: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  registered_at: string;
};

type ServiceRequest = {
  id: number;
  requester_id: string;
  companion_id: string | null;
  service_type: string;
  title: string;
  details: string | null;
  origin_location: string;
  destination_location: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  requester?: { full_name: string | null; email: string | null } | null;
  companion?: { full_name: string | null; email: string | null } | null;
};

type Appeal = {
  id: number;
  user_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};

const copy = {
  customer: {
    eyebrow: "Customer workspace",
    title: "สวัสดีครับ, วันนี้ให้เราช่วยอะไรคุณ?",
    description:
      "บอกความต้องการของคุณ แล้วเลือก Companion ที่เหมาะกับการเดินทางครั้งสำคัญ",
    action: "สร้างคำขอใหม่",
    stats: [
      "คำขอที่กำลังดำเนินการ",
      "Companion ที่บันทึกไว้",
      "ทริปที่เสร็จแล้ว",
    ],
  },
  companion: {
    eyebrow: "Companion workspace",
    title: "พร้อมเป็นเพื่อนร่วมทางให้ใครสักคนหรือยัง?",
    description:
      "จัดการโปรไฟล์ของคุณ ดูคำขอที่เหมาะสม และช่วยให้การเดินทางของ Customer ราบรื่นขึ้น",
    action: "ดูคำขอที่เหมาะกับฉัน",
    stats: ["คำขอใหม่", "งานที่กำลังดำเนินการ", "บริการที่เสร็จแล้ว"],
  },
  admin: {
    eyebrow: "Admin workspace",
    title: "ภาพรวม Care Companion",
    description:
      "ติดตามการใช้งาน ตรวจสอบสมาชิก และดูแลข้อมูลของแพลตฟอร์มจากที่เดียว",
    action: "จัดการสมาชิก",
    stats: ["สมาชิกทั้งหมด", "คำขอวันนี้", "งานที่กำลังดำเนินการ"],
  },
} as const;

export default function RoleDashboard({ role }: { role: Role }) {
  const router = useRouter();
  const [showForm, setShowFormState] = useState(false);
  const [serviceType, setServiceType] = useState("เดินทางไปพบแพทย์");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [originLocation, setOriginLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileAvatarDraft, setProfileAvatarDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("customer");
  const [roleMessage, setRoleMessage] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [showLegacyMemberManager, setShowLegacyMemberManagerState] =
    useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const setShowLegacyMemberManager = (visible: boolean) => {
    if (visible) setShowMemberManager(true);
    else setShowLegacyMemberManagerState(false);
  };
  const [moderationType, setModerationType] = useState<"ban" | "timeout">(
    "timeout",
  );
  const [moderationDuration, setModerationDuration] = useState("60");
  const [moderationNote, setModerationNote] = useState("");
  const [isSavingModeration, setIsSavingModeration] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<
    UserRegistration[]
  >([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [showNotifications, setShowNotificationsState] = useState(false);
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  const [showRegistrationHistory, setShowRegistrationHistory] = useState(false);
  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [isReviewingAppeal, setIsReviewingAppeal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const content = copy[role];

  const setShowNotifications = (visible: boolean) => {
    if (visible && role === "admin") {
      setShowActivityDetails(true);
      return;
    }
    setShowNotificationsState(visible);
  };

  const setShowForm = (visible: boolean) => {
    if (
      visible &&
      role === "customer" &&
      document.activeElement?.textContent?.trim().includes("ดูทั้งหมด")
    ) {
      router.push("/customer/requests");
      return;
    }
    if (
      visible &&
      role === "companion" &&
      document.activeElement?.textContent?.trim().includes("อัปเดตโปรไฟล์")
    ) {
      router.push("/profile");
      return;
    }
    if (
      visible &&
      role === "companion" &&
      ["ดูทั้งหมด", "ดูคำขอที่เหมาะกับฉัน"].some((label) =>
        document.activeElement?.textContent?.trim().includes(label),
      )
    ) {
      router.push("/companion/requests");
      return;
    }
    if (visible && role === "admin") {
      const activeLabel = document.activeElement?.textContent?.trim();
      if (activeLabel?.includes("จัดการสมาชิก")) {
        setShowMemberManager(true);
      } else {
        setShowRegistrationHistory(true);
      }
      return;
    }
    if (visible) setRoleMessage("");
    setShowFormState(visible);
  };

  const submitServiceRequest = async () => {
    if (
      !profile ||
      !requestTitle.trim() ||
      !originLocation.trim() ||
      !destinationLocation.trim()
    )
      return;

    setIsSubmittingRequest(true);
    setRoleMessage("");
    const { data: request, error } = await supabase
      .from("service_requests")
      .insert({
        customer_id: profile.id,
        requester_id: profile.id,
        service_type: serviceType,
        title: requestTitle.trim(),
        details: requestDetails.trim() || null,
        start_location: originLocation.trim(),
        origin_location: originLocation.trim(),
        destination: destinationLocation.trim(),
        destination_location: destinationLocation.trim(),
        service_date: new Date().toISOString().split("T")[0],
        start_time: new Date().toISOString().split("T")[1].slice(0, 8),
        created_at: new Date().toISOString(),
      })
      .select(
        "id, requester_id, companion_id, service_type, title, details, origin_location, destination_location, status, created_at, accepted_at",
      )
      .single<ServiceRequest>();
    setIsSubmittingRequest(false);

    if (error) {
      setRoleMessage(`สร้างคำขอไม่สำเร็จ: ${error.message}`);
      return;
    }

    setServiceRequests((current) => [request, ...current]);
    setServiceType("เดินทางไปพบแพทย์");
    setRequestTitle("");
    setRequestDetails("");
    setOriginLocation("");
    setDestinationLocation("");
    setShowFormState(false);
    setRoleMessage("สร้างคำขอเรียบร้อยแล้ว");
  };

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, role, moderation_type, moderation_until, moderation_note",
        )
        .eq("id", user.id)
        .single<Profile>();

      if (profileError || !userProfile) {
        console.error("Unable to load profile", profileError);
        router.replace("/");
        return;
      }

      setProfile(userProfile);
      setProfileNameDraft(userProfile.full_name || "");
      setProfileAvatarDraft(userProfile.avatar_url || "");
      if (userProfile.role !== role) {
        router.replace(`/${userProfile.role}`);
        return;
      }

      if (userProfile.role === "admin") {
        const { data: allProfiles, error: profilesError } = await supabase
          .rpc("admin_list_profiles")
          .returns<Profile[]>();
        if (profilesError) {
          const { data: fallbackProfiles, error: fallbackError } =
            await supabase
              .from("profiles")
              .select(
                "id, email, full_name, avatar_url, role, moderation_type, moderation_until, moderation_note",
              )
              .order("created_at", { ascending: false })
              .returns<Profile[]>();
          if (fallbackError) {
            console.error(
              "Unable to load admin profiles",
              profilesError,
              fallbackError,
            );
            setRoleMessage(
              `โหลดรายชื่อผู้ใช้ไม่สำเร็จ: ${fallbackError.message}`,
            );
          } else {
            setProfiles(fallbackProfiles ?? []);
          }
        } else {
          setProfiles((allProfiles as Profile[] | null) ?? []);
        }
      }

      const { data: events, error: eventsError } = await supabase
        .from("audit_events")
        .select("id, event_type, metadata, created_at, target_user_id")
        .order("created_at", { ascending: false })
        .limit(500)
        .returns<AuditEvent[]>();
      const { data: registrations } = await supabase
        .from("user_registrations")
        .select("id, user_id, full_name, email, role, registered_at")
        .order("registered_at", { ascending: false })
        .limit(500)
        .returns<UserRegistration[]>();
      if (eventsError) {
        console.error("Unable to load audit events", eventsError);
        setRoleMessage(`โหลดกิจกรรมล่าสุดไม่สำเร็จ: ${eventsError.message}`);
      }
      const { data: requests } = await supabase
        .from("service_requests")
        .select(
          "id, requester_id, companion_id, service_type, title, details, origin_location, destination_location, status, created_at, accepted_at",
        )
        .order("created_at", { ascending: false })
        .limit(100)
        .returns<ServiceRequest[]>();
      const { data: userAppeals } = await supabase
        .from("moderation_appeals")
        .select("id, user_id, reason, status, admin_note, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<Appeal[]>();
      setAuditEvents(events ?? []);
      setUserRegistrations(registrations ?? []);
      setServiceRequests(requests ?? []);
      setAppeals(userAppeals ?? []);
      setIsCheckingAccess(false);
    };

    void loadProfile();
  }, [role, router]);

  const updateUserRole = async () => {
    if (!selectedUserId) return;
    setIsSavingRole(true);
    setRoleMessage("");
    const { error } = await supabase.rpc("admin_set_user_role", {
      target_user_id: selectedUserId,
      new_role: selectedRole,
    });
    setIsSavingRole(false);
    if (error) {
      setRoleMessage(`เปลี่ยน role ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setProfiles((currentProfiles) =>
      currentProfiles.map((item) =>
        item.id === selectedUserId ? { ...item, role: selectedRole } : item,
      ),
    );
    setRoleMessage("เปลี่ยน role สำเร็จแล้ว");
  };

  const updateMemberModeration = async (
    actionType: "ban" | "timeout" | "clear",
  ) => {
    if (!selectedUserId) return;
    setIsSavingModeration(true);
    setRoleMessage("");
    const { data: changedProfile, error } = await supabase
      .rpc("admin_set_member_moderation", {
        target_user_id: selectedUserId,
        action_type: actionType,
        duration_minutes:
          actionType === "clear" ? null : Number(moderationDuration),
        moderation_reason: actionType === "clear" ? null : moderationNote,
      })
      .returns<Profile>();
    setIsSavingModeration(false);
    if (error) {
      setRoleMessage(`จัดการสมาชิกไม่สำเร็จ: ${error.message}`);
      return;
    }
    setProfiles((currentProfiles) =>
      currentProfiles.map((item) =>
        item.id === selectedUserId ? { ...item, ...changedProfile } : item,
      ),
    );
    setRoleMessage(
      actionType === "clear"
        ? "ยกเลิกการระงับสมาชิกแล้ว"
        : "บันทึกการระงับสมาชิกแล้ว",
    );
  };

  const saveProfile = async () => {
    if (!profile || !profileNameDraft.trim()) return;
    setIsSavingProfile(true);
    setRoleMessage("");
    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        full_name: profileNameDraft.trim(),
        avatar_url: profileAvatarDraft.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select(
        "id, email, full_name, avatar_url, role, moderation_type, moderation_until, moderation_note",
      )
      .single<Profile>();
    setIsSavingProfile(false);
    if (error) {
      setRoleMessage(`บันทึกโปรไฟล์ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setProfile(updatedProfile);
    setShowProfile(false);
    setRoleMessage("บันทึกโปรไฟล์แล้ว");
  };

  const submitAppeal = async () => {
    if (!appealReason.trim()) return;
    setIsSubmittingAppeal(true);
    const { data: appealData, error } = await supabase.rpc(
      "submit_moderation_appeal",
      {
        appeal_reason: appealReason.trim(),
      },
    );
    const appeal = appealData as Appeal | null;
    setIsSubmittingAppeal(false);
    if (error) {
      setRoleMessage(`ส่งคำร้องไม่สำเร็จ: ${error.message}`);
      return;
    }
    if (appeal) setAppeals((current) => [appeal, ...current]);
    setAppealReason("");
    setShowAppeal(false);
    setRoleMessage("ส่งคำร้องไปยัง Admin แล้ว");
  };

  const reviewAppeal = async (
    appealId: number,
    decision: "approved" | "rejected",
  ) => {
    setIsReviewingAppeal(true);
    const { data: appealData, error } = await supabase.rpc(
      "admin_review_moderation_appeal",
      {
        appeal_id: appealId,
        decision,
        review_note:
          decision === "approved"
            ? "อนุมัติคำร้องและปลดการระงับ"
            : "ไม่อนุมัติคำร้อง",
      },
    );
    const appeal = appealData as Appeal | null;
    setIsReviewingAppeal(false);
    if (error) {
      setRoleMessage(`ตรวจคำร้องไม่สำเร็จ: ${error.message}`);
      return;
    }
    if (appeal)
      setAppeals((current) =>
        current.map((item) => (item.id === appeal.id ? appeal : item)),
      );
    if (decision === "approved") {
      setProfiles((current) =>
        current.map((item) =>
          item.id === appeal?.user_id
            ? {
                ...item,
                moderation_type: null,
                moderation_until: null,
                moderation_note: null,
              }
            : item,
        ),
      );
    }
    setRoleMessage("อัปเดตคำร้องแล้ว");
  };

  const isModerationActive = Boolean(
    profile?.moderation_type &&
    profile.moderation_until &&
    new Date(profile.moderation_until).getTime() > currentTime,
  );
  const eventLabel = (event: AuditEvent) => {
    const labels: Record<string, string> = {
      role_changed: "Admin มอบ role ให้สมาชิก",
      moderation_applied: "Admin ระงับสมาชิก",
      moderation_cleared: "Admin ปลดการระงับสมาชิก",
      moderation_appeal_submitted: "สมาชิกยื่นคำร้องปลดการระงับ",
      moderation_appeal_reviewed: "Admin ตรวจคำร้องปลดการระงับ",
    };
    return labels[event.event_type] ?? event.event_type;
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const requestsToday = serviceRequests.filter(
    (request) => new Date(request.created_at) >= todayStart,
  );
  const customerRequests = serviceRequests.filter(
    (request) => request.requester_id === profile?.id,
  );
  const activeCustomerRequests = customerRequests.filter((request) =>
    /pending|accepted|progress|assigned|active/i.test(request.status),
  );
  const savedCompanionIds = new Set(
    customerRequests.map((request) => request.companion_id).filter(Boolean),
  );
  const completedCustomerTrips = customerRequests.filter(
    (request) => request.status === "completed",
  );
  const activeRequests = serviceRequests.filter((request) =>
    /accepted|progress|assigned|active/i.test(request.status),
  );
  const newCompanionRequests = serviceRequests.filter(
    (request) => request.status === "open" && !request.companion_id,
  );
  const inProgressCompanionRequests = serviceRequests.filter(
    (request) =>
      request.status === "in_progress" && request.companion_id === profile?.id,
  );
  const completedCompanionRequests = serviceRequests.filter(
    (request) =>
      request.status === "completed" && request.companion_id === profile?.id,
  );
  const latestRegistration = userRegistrations[0];
  const latestRequest = customerRequests[0];
  const latestCompanionRequest =
    serviceRequests.find(
      (request) =>
        request.companion_id === profile?.id && request.status === "completed",
    ) ??
    serviceRequests.find(
      (request) =>
        request.companion_id === profile?.id || request.status === "open",
    );
  const latestRegistrationName =
    latestRegistration?.full_name ||
    latestRegistration?.email ||
    "ยังไม่มีข้อมูลการสมัคร";
  const latestRegistrationDate = latestRegistration
    ? new Date(latestRegistration.registered_at).toLocaleString("th-TH")
    : "ยังไม่มีข้อมูลเวลา";
  const profileName = (id: string | null) => {
    const member = profiles.find((item) => item.id === id);
    return member?.full_name || member?.email || "ไม่ทราบชื่อผู้ใช้";
  };
  const formatActivityDate = (value: string) =>
    new Date(value).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const statValues =
    role === "admin"
      ? [profiles.length, requestsToday.length, activeRequests.length]
      : role === "customer"
        ? [
            activeCustomerRequests.length,
            savedCompanionIds.size,
            completedCustomerTrips.length,
          ]
        : [
            newCompanionRequests.length,
            inProgressCompanionRequests.length,
            completedCompanionRequests.length,
          ];

  useEffect(() => {
    if (role !== "admin") return;
    const latest = userRegistrations[0];
    const activityTitle = Array.from(
      document.querySelectorAll("p.font-semibold"),
    ).find((element) =>
      element.textContent?.includes("การลงทะเบียนใหม่วันนี้"),
    );
    if (!activityTitle) return;
    const activityDate =
      activityTitle.parentElement?.querySelector("p.text-sm");
    activityTitle.textContent = latest
      ? `สมาชิกสมัครล่าสุด: ${latestRegistrationName}`
      : "ยังไม่มีข้อมูลการสมัคร";
    if (activityDate)
      activityDate.textContent = latest ? latestRegistrationDate : "";
  }, [latestRegistrationDate, latestRegistrationName, role, userRegistrations]);

  useEffect(() => {
    if (role !== "customer") return;
    const requestTitle = Array.from(
      document.querySelectorAll("p.font-semibold"),
    ).find((element) => element.textContent?.includes("ไปพบแพทย์ตามนัด"));
    if (!requestTitle) return;
    const latestRequestDate =
      requestTitle.parentElement?.querySelector("p.text-sm");
    requestTitle.textContent = latestRequest?.title || "ยังไม่มีคำขอ";
    if (latestRequestDate) {
      latestRequestDate.textContent = latestRequest
        ? `${latestRequest.origin_location || "ไม่ระบุ"} → ${latestRequest.destination_location || "ไม่ระบุ"} · สร้างเมื่อ ${new Date(latestRequest.created_at).toLocaleString("th-TH")}`
        : "สร้างคำขอแรกของคุณได้ที่นี่";
    }
  }, [latestRequest, role]);

  useEffect(() => {
    if (role !== "companion") return;
    const requestTitle = Array.from(
      document.querySelectorAll("p.font-semibold"),
    ).find((element) =>
      element.textContent?.includes("พา Customer ไปโรงพยาบาล"),
    );
    if (!requestTitle) return;
    const requestDate = requestTitle.parentElement?.querySelector("p.text-sm");
    requestTitle.textContent =
      latestCompanionRequest?.title || "ยังไม่มีคำขอแนะนำ";
    if (requestDate) {
      requestDate.textContent = latestCompanionRequest
        ? `${latestCompanionRequest.origin_location || "ไม่ระบุ"} → ${latestCompanionRequest.destination_location || "ไม่ระบุ"} · ${latestCompanionRequest.status === "completed" ? "ส่งผู้โดยสารสำเร็จ" : latestCompanionRequest.status === "in_progress" ? "กำลังดำเนินการ" : "เปิดรับผู้ช่วยเหลือ"}`
        : "เปิดดูคำขอจาก Customer ได้ที่นี่";
    }
  }, [latestCompanionRequest, role]);

  const signOut = async () => {
    window.localStorage.removeItem("care-companion-role");
    await supabase.auth.signOut({ scope: "global" });
    router.push("/");
  };

  if (isCheckingAccess || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-sm text-[#607089]">
        กำลังตรวจสอบสิทธิ์...
      </main>
    );
  }

  if (isModerationActive && role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-10 text-[#17253d]">
        <section className="w-full max-w-xl rounded-3xl border border-[#f0d9d9] bg-white p-8 text-center shadow-[0_20px_60px_rgba(70,40,40,0.12)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0f0] text-2xl">
            !
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#c24f5a]">
            บัญชีถูกระงับชั่วคราว
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            ไม่สามารถใช้งานแพลตฟอร์มได้
          </h1>
          <p className="mt-4 leading-7 text-[#6f7d90]">
            บัญชีของคุณถูก{" "}
            {profile.moderation_type === "ban" ? "Ban" : "Timeout"} จนถึง
          </p>
          <p className="mt-2 text-xl font-semibold text-[#b43f4e]">
            {new Date(profile.moderation_until || "").toLocaleString("th-TH")}
          </p>
          <div className="mt-6 rounded-2xl bg-[#fff8f8] p-5 text-left">
            <p className="text-sm font-semibold text-[#6d3c42]">
              สาเหตุจาก Admin
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#7c6267]">
              {profile.moderation_note || "ไม่ได้ระบุหมายเหตุ"}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAppeal(true)}
              className="flex-1 rounded-xl bg-[#3979c8] px-5 py-3 font-semibold text-white"
            >
              ยื่นคำร้องขอปลดระงับ
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#dfe7f0] px-5 py-3 font-semibold text-[#607089]"
            >
              ออกจากระบบ
            </button>
          </div>
          {roleMessage && (
            <p className="mt-4 text-sm text-[#3979c8]">{roleMessage}</p>
          )}
        </section>
        {showAppeal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-left shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#3979c8]">
                    Moderation appeal
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    ยื่นคำร้องขอปลดระงับ
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppeal(false)}
                  className="text-2xl leading-none text-[#8090a4]"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
              <textarea
                value={appealReason}
                onChange={(event) => setAppealReason(event.target.value)}
                placeholder="อธิบายเหตุผลที่ขอให้ Admin พิจารณา"
                className="mt-6 min-h-32 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
              />
              <button
                type="button"
                disabled={!appealReason.trim() || isSubmittingAppeal}
                onClick={submitAppeal}
                className="mt-4 w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
              >
                {isSubmittingAppeal ? "กำลังส่งคำร้อง..." : "ส่งคำร้อง"}
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#17253d]">
      {role === "admin" && (
        <AdminMemberManager
          key={selectedUserId}
          open={showMemberManager}
          members={profiles}
          initialMemberId={selectedUserId}
          onClose={() => setShowMemberManager(false)}
          onUpdated={(member, message) => {
            setProfiles((current) =>
              current.map((item) =>
                item.id === member.id ? { ...item, ...member } : item,
              ),
            );
            setRoleMessage(message);
            setShowMemberManager(false);
          }}
        />
      )}
      {role === "admin" && (
        <AdminActivityCenter
          open={showActivityDetails}
          profiles={profiles}
          events={auditEvents}
          registrations={userRegistrations}
          requests={serviceRequests}
          onClose={() => setShowActivityDetails(false)}
        />
      )}
      {role === "admin" && (
        <AdminRegistrationHistory
          open={showRegistrationHistory}
          registrations={userRegistrations}
          onClose={() => setShowRegistrationHistory(false)}
        />
      )}
      {role === "companion" && (
        <CompanionReviewHistory
          open={showReviewHistory}
          onClose={() => setShowReviewHistory(false)}
        />
      )}
      {showProfile && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#3979c8]">
                  {role} profile
                </p>
                <h2 className="mt-1 text-2xl font-semibold">แก้ไขโปรไฟล์</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="text-2xl leading-none text-[#8090a4]"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#e8f3ff] text-xl font-bold text-[#3979c8]">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="รูปโปรไฟล์"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.full_name || profile.email || "U")
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-sm text-[#8491a2]">{profile.email}</p>
              </div>
            </div>
            <label
              htmlFor="profile-name"
              className="mt-6 block text-sm font-semibold"
            >
              ชื่อที่แสดง
            </label>
            <input
              id="profile-name"
              value={profileNameDraft}
              onChange={(event) => setProfileNameDraft(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
              required
            />
            <label
              htmlFor="profile-avatar"
              className="mt-4 block text-sm font-semibold"
            >
              ลิงก์รูปโปรไฟล์
            </label>
            <input
              id="profile-avatar"
              value={profileAvatarDraft}
              onChange={(event) => setProfileAvatarDraft(event.target.value)}
              placeholder="ใช้รูปจาก Google หรือ URL รูปภาพ"
              className="mt-2 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
            />
            <button
              type="button"
              disabled={isSavingProfile || !profileNameDraft.trim()}
              onClick={() => void saveProfile()}
              className="mt-5 w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
            >
              {isSavingProfile ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
            </button>
          </div>
        </div>
      )}
      {roleMessage && (
        <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-10">
          <p
            role="status"
            className="rounded-xl border border-[#cfe2f7] bg-[#eef6ff] px-4 py-3 text-sm font-semibold text-[#2866a8]"
          >
            {roleMessage}
          </p>
        </div>
      )}
      <header className="border-b border-[#e7edf4] bg-white/90 px-5 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#163b70] text-sm font-black text-[#b8e3d0]">
              cc
            </span>
            <span className="font-bold tracking-tight">Care Companion</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 rounded-full border border-[#dfe7f0] p-1 pr-3 transition hover:border-[#3979c8]"
              aria-label="เปิดโปรไฟล์"
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#e8f3ff] text-sm font-bold text-[#3979c8]">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="รูปโปรไฟล์"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.full_name || profile.email || "U")
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </span>
              <span className="hidden max-w-28 truncate text-sm font-semibold text-[#34455e] sm:inline">
                {profile.full_name || profile.email}
              </span>
            </button>
            <span className="hidden rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-semibold text-[#3979c8] sm:inline">
              {role}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#dfe7f0] px-3 py-2 text-sm font-semibold text-[#607089] transition hover:border-[#3979c8] hover:text-[#3979c8]"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-10 lg:py-14">
        <section className="rounded-[28px] bg-[#163b70] p-7 text-white shadow-[0_18px_50px_rgba(22,59,112,0.17)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b8e3d0]">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-blue-100">
            {content.description}
          </p>
          {role !== "admin" && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-7 rounded-xl bg-[#b8e3d0] px-5 py-3 font-semibold text-[#163b70] transition hover:bg-white"
            >
              {content.action} <span aria-hidden="true">→</span>
            </button>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {content.stats.map((stat, index) => (
            <div
              key={stat}
              className="rounded-2xl border border-[#e5ebf2] bg-white p-6"
            >
              <p className="text-sm text-[#78879b]">{stat}</p>
              <p className="mt-3 text-3xl font-semibold text-[#1d365a]">
                {statValues[index]}
              </p>
              <p className="mt-2 text-xs text-[#8da0b5]"></p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-[#e5ebf2] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {role === "customer"
                    ? "คำขอของฉัน"
                    : role === "companion"
                      ? "คำขอที่แนะนำ"
                      : "การลงทะเบียน"}
                </h2>
                <p className="mt-1 text-sm text-[#8491a2]">
                  ติดตามสถานะและรายละเอียดได้จากที่นี่
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="text-sm font-semibold text-[#3979c8]"
              >
                ดูทั้งหมด →
              </button>
            </div>
            <div className="mt-6 rounded-xl bg-[#f7f9fc] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {role === "admin"
                      ? "การลงทะเบียนใหม่วันนี้"
                      : role === "customer"
                        ? "ไปพบแพทย์ตามนัด"
                        : "พา Customer ไปโรงพยาบาล"}
                  </p>
                  <p className="mt-1 text-sm text-[#8491a2]">
                    พรุ่งนี้ · 09:00 น. · กรุงเทพฯ
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e5ebf2] bg-white p-6">
            <h2 className="text-lg font-semibold">ทางลัด</h2>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex w-full items-center justify-between rounded-xl border border-[#e6edf5] p-4 text-left text-sm font-semibold transition hover:border-[#3979c8]"
              >
                {role === "customer"
                  ? "สร้างคำขอเดินทาง"
                  : role === "companion"
                    ? "อัปเดตโปรไฟล์"
                    : "จัดการสมาชิก"}
                <span className="text-[#3979c8]">+</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="flex w-full items-center justify-between rounded-xl border border-[#e6edf5] p-4 text-left text-sm font-semibold transition hover:border-[#3979c8]"
              >
                ดูการแจ้งเตือน<span className="text-[#3979c8]">→</span>
              </button>
            </div>
          </div>
        </section>
        {role === "admin" && (
          <section className="mt-8 rounded-2xl border border-[#e5ebf2] bg-white p-6">
            <div>
              <h2 className="text-lg font-semibold">จัดการสมาชิกและสิทธิ์</h2>
              <p className="mt-1 text-sm text-[#8491a2]">
                มอบ role, ban หรือ timeout สมาชิก พร้อมบันทึกเหตุผลได้
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
              {" "}
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm text-[#34455e]"
              >
                <option value="">เลือกผู้ใช้งาน</option>
                {profiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name || item.email || item.id} ({item.role})
                  </option>
                ))}
              </select>
              <select
                value={selectedRole}
                onChange={(event) =>
                  setSelectedRole(event.target.value as Role)
                }
                className="rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm text-[#34455e]"
              >
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                disabled={!selectedUserId || isSavingRole}
                onClick={updateUserRole}
                className="rounded-xl bg-[#3979c8] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRole ? "กำลังบันทึก..." : "บันทึก role"}
              </button>
            </div>
            <div className="mt-5 divide-y divide-[#edf1f5]">
              {profiles.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {item.full_name || item.email || item.id}
                    </p>
                    <p className="text-xs text-[#8491a2]">
                      {item.email || "ไม่มีอีเมล"} · {item.role}
                      {item.moderation_type
                        ? ` · ${item.moderation_type} ถึง ${new Date(item.moderation_until || "").toLocaleString("th-TH")}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(item.id);
                      setShowLegacyMemberManager(true);
                    }}
                    className="rounded-xl border border-[#dfe7f0] px-3 py-2 text-xs font-semibold text-[#3979c8]"
                  >
                    จัดการสมาชิก
                  </button>
                </div>
              ))}
            </div>
            {roleMessage && (
              <p className="mt-3 text-sm text-[#3979c8]">{roleMessage}</p>
            )}
          </section>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-[#102542]/30 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#3979c8]">
                  เริ่มต้นขั้นตอนใหม่
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {role === "customer"
                    ? "สร้างคำขอเดินทาง"
                    : role === "companion"
                      ? "อัปเดตข้อมูลของคุณ"
                      : "จัดการสมาชิก"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-2xl leading-none text-[#8090a4]"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            {role === "customer" ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitServiceRequest();
                }}
              >
                <div>
                  <label
                    htmlFor="service-type"
                    className="mb-2 block text-sm font-semibold"
                  >
                    ประเภทบริการ
                  </label>
                  <select
                    id="service-type"
                    value={serviceType}
                    onChange={(event) => setServiceType(event.target.value)}
                    className="w-full rounded-xl border border-[#dfe7f0] bg-white px-4 py-3 text-sm"
                    required
                  >
                    <option value="เดินทางไปพบแพทย์">เดินทางไปพบแพทย์</option>
                    <option value="พาไปทำธุระ">พาไปทำธุระ</option>
                    <option value="เดินทางทั่วไป">เดินทางทั่วไป</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="request-title"
                    className="mb-2 block text-sm font-semibold"
                  >
                    หัวข้อคำขอ
                  </label>
                  <input
                    id="request-title"
                    value={requestTitle}
                    onChange={(event) => setRequestTitle(event.target.value)}
                    placeholder="เช่น ไปพบแพทย์ตามนัด"
                    className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="request-details"
                    className="mb-2 block text-sm font-semibold"
                  >
                    รายละเอียดงาน
                  </label>
                  <textarea
                    id="request-details"
                    value={requestDetails}
                    onChange={(event) => setRequestDetails(event.target.value)}
                    placeholder="บอกวันนัด ความช่วยเหลือ หรือรายละเอียดเพิ่มเติม"
                    className="min-h-24 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="origin-location"
                    className="mb-2 block text-sm font-semibold"
                  >
                    สถานที่ต้นทาง
                  </label>
                  <input
                    id="origin-location"
                    value={originLocation}
                    onChange={(event) => setOriginLocation(event.target.value)}
                    placeholder="เช่น บ้านพัก ซอยสุขุมวิท 12"
                    className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="destination-location"
                    className="mb-2 block text-sm font-semibold"
                  >
                    สถานที่ปลายทาง
                  </label>
                  <input
                    id="destination-location"
                    value={destinationLocation}
                    onChange={(event) =>
                      setDestinationLocation(event.target.value)
                    }
                    placeholder="เช่น โรงพยาบาลจุฬาลงกรณ์"
                    className="w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                    required
                  />
                  {roleMessage && (
                    <p
                      role="alert"
                      className="mt-2 rounded-lg bg-[#fff4f4] px-3 py-2 text-sm text-[#b43f4e]"
                    >
                      {roleMessage}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
                >
                  {isSubmittingRequest ? "กำลังสร้างคำขอ..." : "ส่งคำขอ"}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="h-12 rounded-xl bg-[#f4f7fb] px-4 py-3 text-sm text-[#8290a3]">
                  รายละเอียดจะพร้อมใช้งานในขั้นตอนถัดไป
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white"
                >
                  ดำเนินการต่อ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {showLegacyMemberManager && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#3979c8]">
                  Admin moderation
                </p>
                <h2 className="mt-1 text-2xl font-semibold">จัดการสมาชิก</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLegacyMemberManager(false)}
                className="text-2xl leading-none text-[#8090a4]"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4">
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
                  value={moderationDuration}
                  onChange={(event) =>
                    setModerationDuration(event.target.value)
                  }
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
                  value={moderationNote}
                  onChange={(event) => setModerationNote(event.target.value)}
                  placeholder="ระบุเหตุผลหรือหมายเหตุ"
                  className="min-h-24 w-full rounded-xl border border-[#dfe7f0] px-4 py-3 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={!selectedUserId || isSavingModeration}
                onClick={() => updateMemberModeration(moderationType)}
                className="w-full rounded-xl bg-[#3979c8] py-3 font-semibold text-white disabled:opacity-50"
              >
                {isSavingModeration
                  ? "กำลังบันทึก..."
                  : `ยืนยัน ${moderationType === "ban" ? "Ban" : "Timeout"}`}
              </button>
              <button
                type="button"
                disabled={!selectedUserId || isSavingModeration}
                onClick={() => updateMemberModeration("clear")}
                className="w-full rounded-xl border border-[#dfe7f0] py-3 text-sm font-semibold text-[#607089] disabled:opacity-50"
              >
                ยกเลิก Ban / Timeout
              </button>
            </div>
          </div>
        </div>
      )}
      {showNotifications && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#3979c8]">
                  Activity center
                </p>
                <h2 className="mt-1 text-2xl font-semibold">ดูการแจ้งเตือน</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="text-2xl leading-none text-[#8090a4]"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            <section className="mt-6">
              <h3 className="font-semibold">ประวัติการดำเนินการ</h3>
              <div className="mt-3 space-y-2">
                {auditEvents.length === 0 && (
                  <p className="rounded-xl bg-[#f7f9fc] p-4 text-sm text-[#8491a2]">
                    ยังไม่มีรายการ
                  </p>
                )}
                {auditEvents.map((event) => (
                  <div key={event.id} className="rounded-xl bg-[#f7f9fc] p-4">
                    <p className="text-sm font-semibold">{eventLabel(event)}</p>
                    <p className="mt-1 text-xs text-[#8491a2]">
                      {new Date(event.created_at).toLocaleString("th-TH")}
                      {event.metadata.note ? ` · ${event.metadata.note}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            {role === "admin" && (
              <section className="mt-7">
                <h3 className="font-semibold">คำร้องขอปลดระงับ</h3>
                <div className="mt-3 space-y-3">
                  {appeals.filter((appeal) => appeal.status === "pending")
                    .length === 0 && (
                    <p className="rounded-xl bg-[#f7f9fc] p-4 text-sm text-[#8491a2]">
                      ไม่มีคำร้องที่รอตรวจ
                    </p>
                  )}
                  {appeals
                    .filter((appeal) => appeal.status === "pending")
                    .map((appeal) => (
                      <div
                        key={appeal.id}
                        className="rounded-xl border border-[#e5ebf2] p-4"
                      >
                        <p className="text-sm font-semibold">
                          คำร้องจาก {appeal.user_id}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#607089]">
                          {appeal.reason}
                        </p>
                        <p className="mt-1 text-xs text-[#8491a2]">
                          {new Date(appeal.created_at).toLocaleString("th-TH")}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={isReviewingAppeal}
                            onClick={() => reviewAppeal(appeal.id, "approved")}
                            className="rounded-lg bg-[#3979c8] px-3 py-2 text-xs font-semibold text-white"
                          >
                            อนุมัติและปลดระงับ
                          </button>
                          <button
                            type="button"
                            disabled={isReviewingAppeal}
                            onClick={() => reviewAppeal(appeal.id, "rejected")}
                            className="rounded-lg border border-[#e0c9cc] px-3 py-2 text-xs font-semibold text-[#b43f4e]"
                          >
                            ไม่อนุมัติ
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
      {role === "admin" && <AdminMemberOverview members={profiles} />}
      {role === "customer" && (
        <section className="mx-auto mb-15 max-w-[1200px] rounded-2xl border border-[#e5ebf2] bg-white p-6 sm:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Companion ที่เคยให้บริการ
              </h2>
              <p className="mt-1 text-sm text-[#8491a2]">
                ดูประวัติ Companion และคะแนนรีวิวจากผู้ใช้งาน
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/customer/companions")}
              className="rounded-xl border border-[#dfe7f0] px-4 py-2.5 text-sm font-semibold text-[#3979c8]"
            >
              ดู Companion
            </button>
          </div>
        </section>
      )}
      <ChatDock userId={profile.id} />
      {role === "companion" && (
        <section className="mx-auto mb-15 max-w-[1200px] rounded-2xl border border-[#e5ebf2] bg-white p-6 sm:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">รีวิวจากผู้ใช้งาน</h2>
              <p className="mt-1 text-sm text-[#8491a2]">
                ดูความคิดเห็นจากผู้ใช้งานที่คุณให้บริการ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewHistory(true)}
              className="rounded-xl border border-[#dfe7f0] px-4 py-2.5 text-sm font-semibold text-[#3979c8]"
            >
              ประวัติรีวิว
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
