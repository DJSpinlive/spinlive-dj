"use client";

import { ArrowDownToLine, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import {
  MonthlyComparisonChart,
  RevenueTrendChart,
  SourceDonut,
} from "@/components/studio/charts";
import {
  CardTitle,
  GlassButton,
  KpiCard,
  Pill,
  SectionCard,
} from "@/components/studio/ui";
import { kpis, transactions } from "@/lib/studio/data";
import { cn } from "@/lib/utils";

function WithdrawParamListener({ onOpen }: { onOpen: () => void }) {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("withdraw") === "1") onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  return null;
}

export default function EarningsView() {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(String(kpis.withdrawable));
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div>
      <Suspense fallback={null}>
        <WithdrawParamListener onOpen={() => setWithdrawOpen(true)} />
      </Suspense>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Earnings</h1>
          <p className="mt-0.5 text-[13px] text-studio-ink2">
            Revenue across bookings, tips and song requests. Payouts via Stripe
            Connect.
          </p>
        </div>
        <div className="ml-auto">
          <GlassButton variant="primary" onClick={() => setWithdrawOpen(true)}>
            <ArrowDownToLine size={15} /> Withdraw Funds
          </GlassButton>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-5 gap-3.5 max-xl:grid-cols-3 max-md:grid-cols-2">
        <KpiCard
          hero
          label="Total Earnings"
          value={`$${kpis.totalEarnings.toLocaleString()}`}
          delta="+12.4%"
          deltaUp
          sub="vs last month"
        />
        <KpiCard
          label="Withdrawable Balance"
          value={`$${kpis.withdrawable.toLocaleString()}`}
          sub="available now"
        />
        <KpiCard
          label="Pending Payouts"
          value={`$${kpis.pendingPayout.toLocaleString()}`}
          sub="arrives Mon, Jul 7"
        />
        <KpiCard
          label="Tips"
          value={`$${kpis.tipsTotal.toLocaleString()}`}
          delta="+31%"
          deltaUp
          sub="this quarter"
        />
        <KpiCard
          label="Booking Revenue"
          value={`$${kpis.bookingRevenue.toLocaleString()}`}
          delta="+9%"
          deltaUp
          sub="this quarter"
        />
      </div>

      <div className="mb-4 grid grid-cols-[1.7fr_1fr] gap-4 max-xl:grid-cols-1">
        <SectionCard>
          <CardTitle>
            Revenue Trend{" "}
            <span className="text-[11.5px] font-semibold text-studio-ink3">
              · last 12 months
            </span>
          </CardTitle>
          <RevenueTrendChart />
        </SectionCard>
        <div className="flex flex-col gap-4">
          <SectionCard>
            <CardTitle>Earnings by Source</CardTitle>
            <SourceDonut />
          </SectionCard>
          <SectionCard>
            <CardTitle>Monthly Comparison</CardTitle>
            <MonthlyComparisonChart />
          </SectionCard>
        </div>
      </div>

      <SectionCard>
        <CardTitle>Transactions</CardTitle>
        <div className="studio-scroll overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Date", "Customer", "Type", "Status"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-studio-line2 px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-studio-ink3"
                  >
                    {h}
                  </th>
                ))}
                <th className="border-b border-studio-line2 px-2.5 py-2 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-studio-ink3">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.03]">
                  <td className="border-b border-studio-line px-2.5 py-2.5 tabular-nums text-studio-ink2">
                    {tx.date}
                  </td>
                  <td className="border-b border-studio-line px-2.5 py-2.5 font-semibold">
                    {tx.customer}
                  </td>
                  <td className="border-b border-studio-line px-2.5 py-2.5">
                    <Pill
                      tone={
                        tx.kind === "Booking"
                          ? "violet"
                          : tx.kind === "Tip"
                            ? "good"
                            : "info"
                      }
                    >
                      {tx.kind}
                    </Pill>
                  </td>
                  <td className="border-b border-studio-line px-2.5 py-2.5">
                    <Pill
                      tone={
                        tx.status === "completed"
                          ? "good"
                          : tx.status === "pending"
                            ? "warn"
                            : "bad"
                      }
                    >
                      {tx.status}
                    </Pill>
                  </td>
                  <td className="border-b border-studio-line px-2.5 py-2.5 text-right font-extrabold tabular-nums">
                    ${tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ---------- Withdraw modal ---------- */}
      <div
        className={cn(
          "fixed inset-0 z-[150] grid place-items-center bg-black/65 backdrop-blur-sm",
          withdrawOpen ? "" : "hidden"
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close withdraw dialog"
          onClick={() => setWithdrawOpen(false)}
          className="absolute inset-0 cursor-default"
        />
        <div
          role="dialog"
          aria-label="Withdraw funds"
          className="relative w-[420px] max-w-[92vw] rounded-2xl border border-studio-line2 bg-studio-surface2 p-5 shadow-2xl"
        >
          <div className="flex items-start">
            <div>
              <h3 className="text-base font-bold">Withdraw Funds</h3>
              <p className="mt-0.5 text-[12.5px] text-studio-ink2">
                Transfers arrive in 1–2 business days via Stripe.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setWithdrawOpen(false);
                setConfirmed(false);
              }}
              className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-studio-ink2 hover:bg-white/5"
            >
              <X size={16} />
            </button>
          </div>

          {confirmed ? (
            <div className="mt-4 rounded-xl border border-studio-good/30 bg-studio-good/10 p-4 text-center">
              <div className="text-lg font-extrabold text-studio-good">
                ${Number(amount).toLocaleString()} on the way
              </div>
              <p className="mt-1 text-xs text-studio-ink2">
                Sent to Chase •••• 4821. We&apos;ll notify you when it lands.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-studio-violet/30 bg-studio-violet/10 p-4 text-center">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-studio-ink3">
                  Withdrawable balance
                </div>
                <div className="text-[28px] font-extrabold tabular-nums">
                  ${kpis.withdrawable.toLocaleString()}
                </div>
              </div>
              <label
                htmlFor="withdraw-amount"
                className="mt-4 flex flex-col gap-1.5"
              >
                <span className="text-xs font-bold text-studio-ink2">
                  Amount
                </span>
                <input
                  id="withdraw-amount"
                  type="number"
                  max={kpis.withdrawable}
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] tabular-nums focus:border-studio-violet focus:outline-none"
                />
              </label>
              <div className="mt-2 flex justify-between text-[12.5px]">
                <span className="text-studio-ink2">Destination</span>
                <span className="font-bold">Chase •••• 4821</span>
              </div>
            </>
          )}

          <div className="mt-4 flex gap-2.5">
            <GlassButton
              className="flex-1"
              onClick={() => {
                setWithdrawOpen(false);
                setConfirmed(false);
              }}
            >
              {confirmed ? "Done" : "Cancel"}
            </GlassButton>
            {!confirmed ? (
              <GlassButton
                variant="primary"
                className="flex-1"
                disabled={
                  !amount ||
                  Number(amount) <= 0 ||
                  Number(amount) > kpis.withdrawable
                }
                onClick={() => setConfirmed(true)}
              >
                Withdraw ${Number(amount || 0).toLocaleString()}
              </GlassButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
