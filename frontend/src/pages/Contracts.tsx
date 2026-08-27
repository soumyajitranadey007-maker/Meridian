import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "../components/StatusPill";
import { useWallet } from "../components/WalletProvider";
import { fetchContracts } from "../lib/api";
import type { EscrowContract } from "../types";

const compact = (address: string) => `${address.slice(0, 5)}…${address.slice(-4)}`;

export function Contracts() {
  const { session } = useWallet();
  const [contracts, setContracts] = useState<EscrowContract[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session) { setContracts([]); return; }
    let mounted = true; setLoading(true); setError("");
    fetchContracts(session.address).then((records) => { if (mounted) setContracts(records); }).catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load contracts."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [session]);
  const visible = useMemo(() => contracts.filter((contract) => `${contract.title} ${contract.counterparty} ${contract.chainAddress}`.toLowerCase().includes(query.toLowerCase())), [contracts, query]);
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-mint">Agreement workspace</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Your contracts.</h1><p className="mt-2 text-[12px] text-white/50">{session ? `Showing agreements for ${compact(session.address)}.` : "Connect Freighter to view agreements that belong to you."}</p></div><Link to="/contracts/new" className="rounded-xl bg-mint px-4 py-3 text-[12px] font-bold text-ink shadow-mint transition hover:-translate-y-0.5">Create contract</Link></div>{session && <label className="mt-7 block max-w-md"><span className="sr-only">Search contracts</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, address, or counterparty" className="w-full rounded-xl bg-ink/45 px-4 py-3 text-[12px] outline-none ringline placeholder:text-white/28 focus:ring-1 focus:ring-mint" /></label>}<AnimatePresence>{error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="mt-5 rounded-xl bg-coral/10 px-4 py-3 text-[11px] text-coral ringline">{error}</motion.p>}</AnimatePresence>{!session ? <div className="mt-8 rounded-2xl bg-surface/50 p-6 ringline soft-card"><p className="text-[13px] font-semibold">Your contract list is private to your wallet.</p><p className="mt-2 text-[11px] leading-5 text-white/48">Open the profile panel and connect Freighter to retrieve live records—Meridian does not display sample contracts.</p></div> : loading ? <p className="mt-8 text-[12px] text-white/48">Loading confirmed contracts…</p> : visible.length === 0 ? <div className="mt-8 rounded-2xl bg-surface/50 p-6 ringline soft-card"><p className="text-[13px] font-semibold">{contracts.length ? "No contracts match that search." : "No contracts have been recorded for this wallet."}</p><p className="mt-2 text-[11px] leading-5 text-white/48">A contract appears here only after its Stellar transaction confirms and Meridian verifies it.</p></div> : <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((contract, index) => { const amount = contract.milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0); const latest = contract.milestones.at(-1)?.status ?? "Draft"; return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} key={contract.id}><Link to={`/contracts/${contract.id}`} className="block rounded-2xl bg-surface/50 p-5 ringline soft-card transition hover:-translate-y-1 hover:bg-surface/70"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-white/40">{compact(contract.chainAddress)}</p><h2 className="mt-2 text-[15px] font-bold">{contract.title}</h2></div><StatusPill status={latest} /></div><p className="mt-3 font-mono text-[10px] text-white/55">{contract.role} · {compact(contract.counterparty)}</p><div className="mt-6 flex items-end justify-between"><p className="text-xl font-extrabold tracking-[-.05em]">{amount.toLocaleString(undefined, { maximumFractionDigits: 7 })}</p><p className="text-[10px] text-white/48">{contract.milestones.length} milestones</p></div></Link></motion.div>; })}</div>}</div>;
}
