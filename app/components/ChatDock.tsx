"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ChatMessage = {
  id: number;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type ChatPartner = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export default function ChatDock({
  userId,
  initialPartnerId,
}: {
  userId: string;
  initialPartnerId?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [partnerOrder, setPartnerOrder] = useState<string[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(
    initialPartnerId ?? null,
  );
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    startTransition(() => setActivePartnerId(initialPartnerId ?? null));
  }, [initialPartnerId]);

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_id, receiver_id, body, read_at, created_at")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true });
      const loadedMessages = data ?? [];
      setMessages(loadedMessages);
      const partnerIds = [
        ...new Set([
          ...loadedMessages.map((message) =>
            message.sender_id === userId
              ? message.receiver_id
              : message.sender_id,
          ),
          ...(initialPartnerId ? [initialPartnerId] : []),
        ]),
      ];
      if (partnerIds.length > 0) {
        const { data: partnerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", partnerIds);
        setPartners(partnerProfiles ?? []);
        setPartnerOrder([
          ...(initialPartnerId ? [initialPartnerId] : []),
          ...partnerIds.filter((id) => id !== initialPartnerId),
        ]);
      } else {
        setPartners([]);
      }
      setIsLoading(false);
    };
    void loadMessages();
  }, [initialPartnerId, userId]);

  const activePartner =
    partners.find((partner) => partner.id === activePartnerId) ?? null;
  const partnerMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.sender_id === activePartnerId ||
          message.receiver_id === activePartnerId,
      ),
    [activePartnerId, messages],
  );
  const historicalPartnerIds = new Set(
    messages.map((message) =>
      message.sender_id === userId ? message.receiver_id : message.sender_id,
    ),
  );
  const orderedPartners = [...partners].sort(
    (left, right) =>
      partnerOrder.indexOf(left.id) - partnerOrder.indexOf(right.id),
  );
  const initials = (partner: ChatPartner) =>
    (partner.full_name || partner.email || "U").slice(0, 1).toUpperCase();
  const unreadCount = (partnerId: string) =>
    messages.filter(
      (message) =>
        message.sender_id === partnerId &&
        message.receiver_id === userId &&
        !message.read_at,
    ).length;

  const markAsRead = async (partnerId: string) => {
    const readAt = new Date().toISOString();
    await supabase
      .from("chat_messages")
      .update({ read_at: readAt })
      .eq("sender_id", partnerId)
      .eq("receiver_id", userId)
      .is("read_at", null);
    setMessages((current) =>
      current.map((message) =>
        message.sender_id === partnerId && message.receiver_id === userId
          ? { ...message, read_at: readAt }
          : message,
      ),
    );
  };

  const openPartner = (partnerId: string) => {
    setActivePartnerId(partnerId);
    setPartnerOrder((current) => [
      partnerId,
      ...current.filter((id) => id !== partnerId),
    ]);
    void markAsRead(partnerId);
  };

  const sendMessage = async () => {
    if (!activePartnerId || !draft.trim() || isSending) return;
    setIsSending(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        sender_id: userId,
        receiver_id: activePartnerId,
        body: draft.trim(),
      })
      .select("id, sender_id, receiver_id, body, read_at, created_at")
      .single<ChatMessage>();
    setIsSending(false);
    if (error || !data) return;
    setMessages((current) => [...current, data]);
    setDraft("");
  };

  return (
    <>
      {!isLoading && (partners.length > 0 || Boolean(initialPartnerId)) && (
        <div className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-2">
          {activePartner && (
            <div className="w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#dfe7f0] bg-white shadow-[0_18px_50px_rgba(22,59,112,0.2)]">
              <div className="flex items-center justify-between border-b border-[#edf1f5] bg-[#163b70] px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b8e3d0] text-sm font-bold text-[#163b70]">
                    {activePartner.avatar_url ? (
                      <img
                        src={activePartner.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(activePartner)
                    )}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {activePartner.full_name || activePartner.email || "ผู้ใช้"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePartnerId(null)}
                  className="text-xl leading-none text-blue-100"
                  aria-label="ปิดแชท"
                >
                  ×
                </button>
              </div>
              <div className="max-h-80 min-h-24 space-y-2 overflow-y-auto bg-[#f7faff] p-3">
                {partnerMessages.length === 0 && (
                  <p className="py-8 text-center text-xs text-[#8491a2]">
                    เริ่มพูดคุยกันได้เลย
                  </p>
                )}
                {partnerMessages.map((message, index) => {
                  const previous = partnerMessages[index - 1];
                  const showTime =
                    !previous ||
                    new Date(message.created_at).getTime() -
                      new Date(previous.created_at).getTime() >=
                      180000;
                  return (
                    <div key={message.id}>
                      {showTime && (
                        <p className="my-2 text-center text-[11px] text-[#8491a2]">
                          {new Date(message.created_at).toLocaleString(
                            "th-TH",
                            { dateStyle: "medium", timeStyle: "short" },
                          )}
                        </p>
                      )}
                      <div
                        className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
                      >
                        <p
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 ${message.sender_id === userId ? "rounded-br-md bg-[#3979c8] text-white" : "rounded-bl-md bg-white text-[#34455e] shadow-sm"}`}
                        >
                          {message.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
                className="flex gap-2 border-t border-[#edf1f5] bg-white p-3"
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe7f0] px-3 py-2 text-sm outline-none focus:border-[#3979c8]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  className="rounded-xl bg-[#163b70] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  ส่ง
                </button>
              </form>
            </div>
          )}
          {orderedPartners
            .filter((partner) => historicalPartnerIds.has(partner.id))
            .map((partner) => (
              <button
                key={partner.id}
                type="button"
                onClick={() => openPartner(partner.id)}
                className="relative flex items-center gap-2 rounded-full border border-[#dfe7f0] bg-white px-2 py-2 pr-4 text-sm font-semibold text-[#34455e] shadow-[0_8px_24px_rgba(22,59,112,0.14)]"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#e8f3ff] text-sm font-bold text-[#3979c8]">
                  {partner.avatar_url ? (
                    <img
                      src={partner.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(partner)
                  )}
                </span>
                <span className="max-w-32 truncate">
                  {partner.full_name || partner.email || "ผู้ใช้"}
                </span>
                {unreadCount(partner.id) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9364f] px-1 text-[10px] font-bold text-white">
                    {unreadCount(partner.id) > 99
                      ? "99+"
                      : unreadCount(partner.id)}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </>
  );
}
