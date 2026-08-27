import { AlertTriangle, Check, CircleDot } from "lucide-react";
import type { MilestoneStatus } from "../types";

const tone: Record<MilestoneStatus, string> = { Draft: "bg-white/8 text-white/55", Funded: "bg-mint/12 text-mint", Submitted: "bg-amber/12 text-amber", Approved: "bg-mint/12 text-mint", Disputed: "bg-coral/12 text-coral", Released: "bg-mint/12 text-mint" };
export function StatusPill({ status }: { status: MilestoneStatus }) {
  const Icon = status === "Disputed" ? AlertTriangle : status === "Released" || status === "Approved" ? Check : CircleDot;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone[status]}`}><Icon size={12} />{status}</span>;
}
