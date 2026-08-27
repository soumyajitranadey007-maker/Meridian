import { ArrowLeft, CircleAlert, FileUp, MessageSquareWarning, Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusPill } from "../components/StatusPill";
import { useWallet } from "../components/WalletProvider";
import { fetchContract, reviewMilestone } from "../lib/api";
import { callEscrowWithFreighter, deliverableDigest } from "../lib/wallet";
import type { AIReview, EscrowContract } from "../types";

const compact = (address: string) => `${address.slice(0, 6)}…${address.slice(-5)}`;

export function ContractDetail() {
  const { id } = useParams();
  const { session, connect, connecting } = useWallet();
  const [contract, setContract] = useState<EscrowContract | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let mounted = true; setLoading(true); setError("");
    fetchContract(id, session?.address).then((record) => { if (mounted) { setContract(record); setSelectedId(record.milestones[0]?.id ?? ""); } }).catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load the contract."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id, session?.address]);
  const selected = useMemo(() => contract?.milestones.find((milestone) => milestone.id === selectedId) ?? contract?.milestones[0] ?? null, [contract, selectedId]);
  const ensureWallet = async () => session ?? connect();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!contract || !selected) return;
    if (!deliverable.trim()) { setError("Add a deliverable link or summary before requesting review."); return; }
    if (contract.role !== "Freelancer") { setError("Only the freelancer wallet can submit this milestone on-chain."); return; }
    setWorking(true); setError("");
    try {
      const wallet = await ensureWallet();
      setStatus("Preparing the deliverable hash for Freighter…");
      const hash = await deliverableDigest(deliverable);
      setStatus("Awaiting Freighter to submit the milestone on Stellar…");
      await callEscrowWithFreighter({ session: wallet, contractAddress: contract.chainAddress, method: "submit_milestone", args: [{ value: selected.chainMilestoneId, type: "u32" }, { value: hash, type: "bytes" }] });
      setStatus("On-chain submission confirmed. Requesting neutral Gemini review…");
      setAiReview(await reviewMilestone(selected.id, deliverable));
      setStatus("AI recommendation ready. Payment still needs a client-signed on-chain approval.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The milestone was not submitted or reviewed."); setStatus(""); }
    finally { setWorking(false); }
  };
  const runAction = async (kind: "approve" | "dispute") => {
    if (!contract || !selected) return;
    setWorking(true); setError("");
    try {
      const wallet = await ensureWallet();
      if (kind === "approve") {
        if (contract.role !== "Client") throw new Error("Only the client wallet can approve and release escrow funds.");
        setStatus("Awaiting Freighter to approve and release the milestone…");
        await callEscrowWithFreighter({ session: wallet, contractAddress: contract.chainAddress, method: "approve_milestone", args: [{ value: selected.chainMilestoneId, type: "u32" }] });
        setStatus("Release transaction submitted. The event indexer will update this record after confirmation.");
      } else {
        if (contract.role === "Observer") throw new Error("Only a contract party can raise a dispute.");
        setStatus("Awaiting Freighter to freeze this milestone and open arbitration…");
        await callEscrowWithFreighter({ session: wallet, contractAddress: contract.chainAddress, method: "raise_dispute", args: [{ value: selected.chainMilestoneId, type: "u32" }, { value: wallet.address, type: "address" }] });
        setStatus("Dispute transaction submitted. Funds remain frozen until the arbitrator resolves the case on-chain.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Freighter could not complete the action."); setStatus(""); }
    finally { setWorking(false); }
  };

  if (loading) return <p className="text-[12px] text-white/50">Loading confirmed contract…</p>;
  if (!contract) return <div className="rounded-2xl bg-surface/50 p-6 ringline"><p className="text-[13px] font-semibold">This contract is unavailable.</p><Link to="/contracts" className="mt-3 inline-block text-[11px] font-bold text-mint">Back to contracts</Link></div>;
  return <div className="mx-auto max-w-5xl"><Link to="/contracts" className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold text-white/55 transition hover:text-mint"><ArrowLeft size={15} />Back to contracts</Link><section className="rounded-2xl bg-surface/50 p-5 ringline soft-card sm:p-7"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[11px] font-bold tracking-[.12em] text-mint">{compact(contract.chainAddress)}</p><StatusPill status={selected?.status ?? "Draft"} /></div><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">{contract.title}</h1><p className="mt-2 text-[13px] text-white/60">{contract.role} workspace with <span className="font-mono">{compact(contract.counterparty)}</span> · Stellar {contract.network}.</p></div><button disabled={working || !selected} onClick={() => void runAction("dispute")} className="flex items-center gap-2 rounded-xl bg-coral/10 px-3.5 py-2.5 text-[11px] font-bold text-coral ringline transition hover:bg-coral hover:text-ink disabled:opacity-50"><MessageSquareWarning size={15} />Raise dispute</button></div><div className="mt-8 grid gap-5 lg:grid-cols-[1fr_.85fr]"><div><h2 className="text-[13px] font-bold">Milestone timeline</h2><div className="mt-4 space-y-3">{contract.milestones.map((milestone, index) => <motion.button layout key={milestone.id} onClick={() => setSelectedId(milestone.id)} className={`block w-full rounded-xl p-4 text-left ringline transition ${selected?.id === milestone.id ? "bg-mint/8 ring-mint/40" : "bg-ink/42 hover:bg-white/[.05]"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[12px] font-semibold">{index + 1}. {milestone.title}</p><p className="mt-1 text-[10px] text-white/42">{Number(milestone.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} token units · on-chain milestone {milestone.chainMilestoneId + 1}</p></div><StatusPill status={milestone.status} /></div><p className="mt-3 text-[11px] leading-5 text-white/58">{milestone.description}</p></motion.button>)}</div></div><div className="rounded-xl bg-ink/45 p-5 ringline"><div className="flex items-center gap-2"><FileUp size={17} className="text-mint" /><h2 className="text-[13px] font-bold">Submit deliverable</h2></div><p className="mt-2 text-[11px] leading-5 text-white/50">The freelancer first signs a SHA-256 deliverable hash in Freighter. Meridian then sends the readable link or summary to Gemini for an assistive review.</p><form onSubmit={submit} className="mt-4"><textarea value={deliverable} onChange={(event) => setDeliverable(event.target.value)} disabled={working || !selected} placeholder="https://… or describe the work delivered" className="min-h-28 w-full rounded-lg bg-white/5 px-3 py-2.5 text-[12px] outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint disabled:opacity-50" /><button disabled={working || connecting || !selected} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-3 py-2.5 text-[11px] font-bold text-ink transition hover:-translate-y-0.5 disabled:opacity-60"><Send size={14} />{working ? "Awaiting confirmation…" : "Submit & request AI review"}</button></form>{aiReview && <button disabled={working} onClick={() => void runAction("approve")} className="mt-3 w-full rounded-xl bg-white/5 px-3 py-2.5 text-[11px] font-semibold text-white/85 ringline transition hover:bg-mint hover:text-ink disabled:opacity-50">Approve & release with Freighter</button>}</div></div><AnimatePresence>{(status || error) && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={error ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-[11px] font-semibold ringline ${error ? "bg-coral/10 text-coral" : "bg-mint/10 text-mint"}`}>{status || error}</motion.p>}</AnimatePresence></section>{aiReview && <ReviewPanel review={aiReview} />}</div>;
}

function ReviewPanel({ review }: { review: AIReview }) { return <section className="mt-5 rounded-2xl bg-ink/60 p-5 ringline soft-card sm:p-7"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lilac/15 text-lilac"><Sparkles size={18} /></span><div><h2 className="text-[14px] font-bold">Meridian AI review</h2><p className="text-[10px] text-white/42">A recommendation—not a payment decision.</p></div></div><div className="mt-5 grid gap-5 md:grid-cols-[150px_1fr]"><div className="grid h-32 place-items-center rounded-2xl bg-mint text-center text-ink"><div><p className="text-4xl font-extrabold tracking-[-.06em]">{review.completenessScore}</p><p className="text-[10px] font-bold uppercase tracking-[.12em]">Completeness score</p></div></div><div><p className="text-[13px] leading-6 text-white/70">{review.summary}</p><div className="mt-4 space-y-2">{review.riskFlags.map((flag) => <p key={flag} className="flex gap-2 text-[11px] text-white/58"><CircleAlert size={15} className="shrink-0 text-amber" />{flag}</p>)}</div>{review.suggestedQuestions.length > 0 && <div className="mt-4 rounded-xl bg-white/[.03] p-3 ringline"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/42">Questions to confirm</p>{review.suggestedQuestions.map((question) => <p key={question} className="mt-2 text-[11px] leading-5 text-white/58">{question}</p>)}</div>}</div></div></section>; }
