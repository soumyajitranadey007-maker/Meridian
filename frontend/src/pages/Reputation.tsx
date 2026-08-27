import { Award, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useWallet } from "../components/WalletProvider";
import { ApiError, fetchReputation } from "../lib/api";
import type { ReputationProfile } from "../types";

const compact = (address: string) => `${address.slice(0, 6)}…${address.slice(-5)}`;

export function Reputation() {
  const { session, connect, connecting } = useWallet();
  const [profile, setProfile] = useState<ReputationProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    let active = true; setError("");
    fetchReputation(session.address).then((record) => { if (active) setProfile(record); }).catch((cause) => { if (active) setError(cause instanceof ApiError && cause.status === 404 ? "This wallet has no indexed reputation score yet." : cause instanceof Error ? cause.message : "Could not load reputation."); });
    return () => { active = false; };
  }, [session]);
  return <div className="mx-auto max-w-4xl"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-mint">On-chain trust record</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Reputation profile.</h1>{!session ? <section className="mt-8 rounded-2xl bg-surface/50 p-7 ringline soft-card"><Wallet size={22} className="text-mint" /><h2 className="mt-4 text-[16px] font-bold">Connect your wallet to view its score.</h2><p className="mt-2 text-[12px] leading-5 text-white/52">Meridian never substitutes a placeholder score. A score exists only after the reputation contract has emitted and the indexer has recorded it.</p><button onClick={() => void connect().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not connect Freighter."))} disabled={connecting} className="mt-5 rounded-xl bg-mint px-4 py-2.5 text-[11px] font-bold text-ink disabled:opacity-60">{connecting ? "Connecting…" : "Connect Freighter"}</button></section> : profile ? <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl bg-surface/50 p-6 ringline soft-card"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-ink"><Award size={24} /></span><div><p className="text-[15px] font-bold">{profile.displayName ?? "Freighter wallet"}</p><p className="mt-1 font-mono text-[10px] text-white/42">{compact(profile.address)} · Stellar Testnet</p></div></div><div className="mt-8 rounded-2xl bg-ink/55 p-5 text-center ringline"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/42">Meridian score</p><p className="mt-2 text-6xl font-extrabold tracking-[-.075em] text-mint">{profile.score}</p><p className="mt-2 text-[11px] font-semibold text-white/70">Indexed from the reputation contract</p></div></div><div className="rounded-2xl bg-ink/55 p-6 ringline soft-card"><ShieldCheck size={20} className="text-mint" /><h2 className="mt-4 text-[15px] font-bold">A record built from contract events.</h2><p className="mt-2 text-[12px] leading-6 text-white/58">Milestone approvals and arbitration outcomes can update this score on-chain. The score is public; private evidence remains available only inside its associated dispute.</p><a href={`https://stellar.expert/explorer/testnet/account/${profile.address}`} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-white/5 px-3 py-2.5 text-[11px] font-bold text-mint ringline transition hover:bg-mint hover:text-ink">View wallet in explorer</a></div></motion.section> : <section className="mt-8 rounded-2xl bg-surface/50 p-7 ringline soft-card"><Award size={22} className="text-mint" /><h2 className="mt-4 text-[16px] font-bold">No reputation score is available yet.</h2><p className="mt-2 text-[12px] leading-5 text-white/52">{error || "The score will appear once a confirmed reputation event is indexed."}</p></section>}</div>;
}
