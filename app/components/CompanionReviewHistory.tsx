"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Review = {
  id: number;
  customer_id: string;
  rating: number;
  review: string;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
};

export default function CompanionReviewHistory({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadReviews = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("companion_reviews")
        .select("id, customer_id, rating, review, created_at")
        .eq("companion_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setReviews([]);
        setIsLoading(false);
        return;
      }
      const customerIds = [
        ...new Set((data ?? []).map((review) => review.customer_id)),
      ];
      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", customerIds)
          : {
              data: [] as {
                id: string;
                full_name: string | null;
                email: string | null;
              }[],
            };
      const customersById = new Map(
        (customers ?? []).map((customer) => [customer.id, customer]),
      );
      setReviews(
        (data ?? []).map((review) => ({
          ...review,
          customer: customersById.get(review.customer_id) ?? null,
        })),
      );
      setIsLoading(false);
    };
    void loadReviews();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#102542]/30 px-5 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-[1200px] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="mt-1 text-2xl font-semibold">
              ประวัติรีวิวจาก Customer
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
        {isLoading ? (
          <p className="mt-6 text-sm text-[#8491a2]">
            กำลังโหลดประวัติรีวิว...
          </p>
        ) : reviews.length === 0 ? (
          <p className="mt-6 rounded-xl bg-[#f7f9fc] p-5 text-sm text-[#8491a2]">
            ยังไม่มีรีวิวจาก Customer
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-[#e5ebf2] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {review.customer?.full_name ||
                        review.customer?.email ||
                        "Customer"}
                    </p>
                    <p className="mt-1 text-lg tracking-[0.15em] text-[#e5a91c]">
                      {"★".repeat(review.rating)}
                      <span className="text-[#d9e3ee]">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-[#9aa7b5]">
                    {new Date(review.created_at).toLocaleString("th-TH")}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#607089]">
                  {review.review || "ไม่ได้เขียนความคิดเห็นเพิ่มเติม"}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
