import { AlertTriangle, ArrowUpRight, Database, FileText, RefreshCw, ShieldCheck, UsersRound, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ApiError, type AdminMetrics, type AdminSession, createAdminChallenge, createAdminSession, fetchAdminMetrics } from "../lib/api";
import { signAdminChallenge } from "../lib/wallet";
import { useWallet } from "../components/WalletProvider";

const storageKey = (address: string) => `meridian.admin.session.${address}`;
const compact = (value: string) => `${value.slice(0, 5)}…${value.slice(-4)}`;
const eventLabel = (eventType: string) => eventType.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
const statusTone = (status: string) => {
  const value = status.toLowerCase();
  if (value.includes("dispute")) return "bg-amber/15 text-amber";
  if (value.includes("release") || value.includes("complete") || value.includes("approved")) return "bg-lilac/15 text-lilac";
  return "bg-mint/12 text-mint";
};

function readStoredSession(address: string): AdminSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(address));
    if (!raw) return null;
    const saved = JSON.parse(raw) as AdminSession;
    if (!saved.accessToken || !saved.expiresAt || new Date(saved.expiresAt).getTime() <= Date.now()) return null;
    return saved;
  } catch { return null; }
}

export function Admin() {
  const { session, connect, connecting } = useWallet();
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async (activeSession: AdminSession) => {
    setLoading(true); setError("");
    try { setMetrics(await fetchAdminMetrics(activeSession.accessToken)); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401 && session) {
        window.sessionStorage.removeItem(storageKey(session.address));
        setAdminSession(null);
      }
      setError(cause instanceof Error ? cause.message : "Could not load Meridian operations.");
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    if (!session) { setAdminSession(null); setMetrics(null); setError(""); return; }
    const stored = readStoredSession(session.address);
    setAdminSession(stored);
    setMetrics(null);
    if (stored) void loadMetrics(stored);
  }, [session, loadMetrics]);

  const authenticate = async () => {
    if (!session) return;
    setSigning(true); setError("");
    try {
      const challenge = await createAdminChallenge(session.address);
      const signature = await signAdminChallenge(session, challenge.message);
      const nextSession = await createAdminSession(session.address, challenge.challengeId, signature);
      window.sessionStorage.setItem(storageKey(session.address), JSON.stringify(nextSession));
      setAdminSession(nextSession);
      await loadMetrics(nextSession);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Admin authentication failed."); }
    finally { setSigning(false); }
  };

  if (!session) return <section className="mx-auto max-w-3xl rounded-2xl bg-surface/50 p-7 text-center ringline soft-card sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint/12 text-mint"><ShieldCheck size={23} /></span><p className="mt-5 text-[11px] font-bold uppercase tracking-[.16em] text-mint">Restricted workspace</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Connect an administrator wallet.</h1><p className="mx-auto mt-3 max-w-lg text-[13px] leading-6 text-white/60">Meridian operations are visible only after a configured Freighter wallet signs a one-time authorization message.</p><button onClick={() => void connect().catch((cause) => setError(cause instanceof Error ? cause.message : "Freighter connection failed."))} disabled={connecting} className="mt-6 rounded-xl bg-mint px-5 py-3 text-[12px] font-bold text-ink shadow-mint disabled:opacity-60">{connecting ? "Connecting…" : "Connect Freighter"}</button>{error && <p role="alert" className="mt-4 text-[11px] text-coral">{error}</p>}</section>;

  if (!adminSession) return <section className="mx-auto max-w-3xl rounded-2xl bg-surface/50 p-7 text-center ringline soft-card sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint/12 text-mint"><Wallet size={23} /></span><p className="mt-5 text-[11px] font-bold uppercase tracking-[.16em] text-mint">Freighter authorization</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Sign in to operations.</h1><p className="mx-auto mt-3 max-w-lg text-[13px] leading-6 text-white/60">{compact(session.address)} must appear in <code className="rounded bg-white/8 px-1.5 py-0.5 text-mint">ADMIN_WALLET_ADDRESSES</code>. The signature grants a 15-minute, tab-only metrics session; it never submits an on-chain transaction.</p><button onClick={() => void authenticate()} disabled={signing} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-[12px] font-bold text-ink shadow-mint transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"><ShieldCheck size={15} />{signing ? "Awaiting Freighter…" : "Sign in with Freighter"}</button>{error && <p role="alert" className="mx-auto mt-4 max-w-lg rounded-xl bg-coral/10 px-4 py-3 text-left text-[11px] font-semibold text-coral ringline">{error}</p>}</section>;

  const statusTotal = metrics?.statusDistribution.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const cards = metrics ? [
    ["Registered wallets", metrics.registeredWallets, "Unique accounts recorded by Meridian", UsersRound, "mint"],
    ["Confirmed transactions", metrics.confirmedTransactions, "Deployments and indexed on-chain transactions", ArrowUpRight, "lilac"],
    ["Active escrows", metrics.activeEscrows, "Contracts marked active in persistent storage", FileText, "mint"],
    ["Open disputes", metrics.openDisputes, "Cases awaiting a recorded outcome", AlertTriangle, "amber"],
  ] as const : [];

  return <div className="mx-auto max-w-[1280px] space-y-5"><section className="rounded-2xl bg-surface/50 p-5 ringline soft-card sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-mint">Private operations</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-[35px]">Meridian, at a glance.</h1><p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/60">Monitor registrations, confirmed transactions, escrow state, and dispute workload from the source database. Metrics refresh only when requested—no persistent socket is kept open.</p></div><div className="flex items-center gap-3"><p className="hidden text-right text-[10px] leading-4 text-white/42 sm:block">{metrics ? <>Last refreshed<br />{new Date(metrics.generatedAt).toLocaleString()}</> : "Waiting for metrics"}</p><button onClick={() => void loadMetrics(adminSession)} disabled={loading || signing} className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-3 text-[12px] font-bold text-ink shadow-mint transition hover:-translate-y-0.5 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Refreshing…" : "Refresh data"}</button></div></div></section>
    {error && <p role="alert" className="rounded-xl bg-coral/10 px-4 py-3 text-[11px] font-semibold text-coral ringline">{error}</p>}
    {loading && !metrics ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-white/[.05] ringline" />)}</section> : metrics && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note, Icon, color], index) => <motion.article key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} className="rounded-2xl bg-surface/50 p-5 ringline soft-card"><div className="flex items-start justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/45">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl ${color === "amber" ? "bg-amber/12 text-amber" : color === "lilac" ? "bg-lilac/12 text-lilac" : "bg-mint/12 text-mint"}`}><Icon size={16} /></span></div><p className="mt-5 text-3xl font-extrabold tracking-[-.055em] tabular">{value.toLocaleString()}</p><p className="mt-3 text-[11px] leading-5 text-white/48">{note}</p></motion.article>)}</section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,.8fr)]"><div className="overflow-hidden rounded-2xl bg-surface/50 ringline soft-card"><div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6"><div><h2 className="text-[15px] font-bold">Confirmed activity</h2><p className="mt-1 text-[11px] text-white/48">Deployments and latest persisted contract events.</p></div><span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-mint"><span className="h-1.5 w-1.5 rounded-full bg-mint" />HTTP refresh</span></div>{metrics.recentActivity.length === 0 ? <p className="px-5 py-8 text-[12px] leading-6 text-white/50 sm:px-6">No confirmed activity has been persisted yet. This will populate only after an escrow deployment or the scheduled event indexer records a Stellar event.</p> : <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left"><thead className="bg-ink/30 text-[10px] font-bold uppercase tracking-[.13em] text-white/38"><tr><th className="px-5 py-3.5 sm:px-6">Activity</th><th>Wallet</th><th>Contract</th><th>Time</th><th className="px-5 text-right sm:px-6">Explorer</th></tr></thead><tbody className="divide-y divide-white/7 text-[12px]">{metrics.recentActivity.map((activity, index) => <motion.tr initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }} key={`${activity.transactionHash}-${activity.eventType}-${index}`} className="transition hover:bg-white/[.035]"><td className="px-5 py-4 sm:px-6"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(activity.eventType)}`}>{eventLabel(activity.eventType)}</span></td><td className="font-mono text-[10px] text-white/60">{activity.walletAddress ? compact(activity.walletAddress) : "Indexed event"}</td><td className="font-mono text-[10px] text-white/60">{compact(activity.contractAddress)}</td><td className="text-[10px] text-white/48">{new Date(activity.occurredAt).toLocaleString()}</td><td className="px-5 text-right sm:px-6"><a id={`admin-tx-${activity.transactionHash}-${index}`} href={`https://stellar.expert/explorer/testnet/tx/${activity.transactionHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-mint transition hover:text-cream">Open <ArrowUpRight size={13} /></a></td></motion.tr>)}</tbody></table></div>}</div>
        <aside className="space-y-5"><section className="rounded-2xl bg-ink/60 p-5 ringline soft-card"><div className="flex items-start justify-between"><div><h2 className="text-[15px] font-bold">Escrow health</h2><p className="mt-1 text-[11px] text-white/48">Status distribution</p></div><span className="text-[11px] font-bold text-mint">{statusTotal} total</span></div><div className="mt-7 space-y-4">{metrics.statusDistribution.length === 0 ? <p className="text-[12px] leading-5 text-white/48">No escrow status data has been recorded yet.</p> : metrics.statusDistribution.map((item) => <div key={item.status}><div className="flex items-center justify-between gap-3 text-[11px]"><span className="capitalize text-white/65">{item.status}</span><span className="font-bold text-white/80">{item.count}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${statusTotal ? item.count / statusTotal * 100 : 0}%` }} transition={{ duration: .55 }} className={`h-full rounded-full ${item.status.toLowerCase().includes("dispute") ? "bg-amber" : item.status.toLowerCase().includes("release") ? "bg-lilac" : "bg-mint"}`} /></div></div>)}</div></section>
          <section className="rounded-2xl bg-mint/8 p-5 ringline soft-card"><div className="flex items-center gap-2 text-[12px] font-bold text-mint"><Database size={16} />Database sync</div><p className="mt-3 text-[12px] leading-5 text-white/58">All figures are queried over authenticated HTTP and returned with no-store caching. WebSockets are intentionally disabled for Vercel compatibility.</p><p className="mt-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/38">Session expires {new Date(adminSession.expiresAt).toLocaleTimeString()}</p></section></aside></section></>}
  </div>;
}
