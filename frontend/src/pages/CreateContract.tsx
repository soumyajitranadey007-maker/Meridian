import { ArrowLeft, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createContract } from "../lib/api";
import { configuredFactoryAddress, createEscrowWithFreighter } from "../lib/wallet";
import { useWallet } from "../components/WalletProvider";

type DraftMilestone = { title: string; amount: string; description: string };
const stellarAddress = /^G[A-Z2-7]{55}$/;

export function CreateContract() {
  const navigate = useNavigate();
  const { session, connect, connecting } = useWallet();
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [milestones, setMilestones] = useState<DraftMilestone[]>([{ title: "", amount: "", description: "" }]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [deploying, setDeploying] = useState(false);
  const add = () => setMilestones((current) => [...current, { title: "", amount: "", description: "" }]);
  const update = (index: number, field: keyof DraftMilestone, value: string) => setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !stellarAddress.test(counterparty) || milestones.some((milestone) => !milestone.title.trim() || !/^\d+(\.\d{1,7})?$/.test(milestone.amount) || Number(milestone.amount) <= 0)) {
      setError("Add a contract title, a valid G… counterparty address, and a positive amount (up to 7 decimals) for every milestone.");
      return;
    }
    const tokenAddress = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS;
    const factoryAddress = configuredFactoryAddress();
    if (!tokenAddress || !factoryAddress) {
      setError("Deployment is not configured. Set VITE_TOKEN_CONTRACT_ADDRESS and VITE_FACTORY_CONTRACT_ADDRESS in Vercel.");
      return;
    }
    setError("");
    setDeploying(true);
    try {
      const wallet = session ?? await connect();
      const deployment = await createEscrowWithFreighter({
        session: wallet,
        factoryAddress,
        freelancerAddress: counterparty,
        milestones: milestones.map((milestone) => ({ description: `${milestone.title.trim()}\n\n${milestone.description.trim()}`, amount: milestone.amount })),
        onStatus: setProgress,
      });
      setContractAddress(deployment.contractAddress);
      setProgress("Recording the confirmed on-chain contract in Meridian…");
      const contract = await createContract({
        chainAddress: deployment.contractAddress,
        clientAddress: wallet.address,
        freelancerAddress: counterparty,
        tokenAddress,
        title: title.trim(),
        network: "testnet",
        transactionHash: deployment.deploymentTransactionHash,
        milestones: milestones.map((milestone, index) => ({ chainMilestoneId: index, description: `${milestone.title.trim()}\n\n${milestone.description.trim()}`, amount: milestone.amount })),
      });
      navigate(`/contracts/${contract.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The contract could not be deployed. No Meridian record was created.");
      setProgress("");
    } finally { setDeploying(false); }
  };

  return <div className="mx-auto max-w-3xl"><Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold text-white/55 transition hover:text-mint"><ArrowLeft size={15} />Back to workspace</Link><div className="rounded-2xl bg-surface/50 p-5 ringline soft-card sm:p-7"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-mint">New on-chain agreement</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Create a contract.</h1><p className="mt-3 max-w-xl text-[13px] leading-6 text-white/60">Every deployment, milestone, and funding action is prepared against Stellar Testnet and signed in Freighter. Nothing is simulated or saved as a demo.</p><form onSubmit={submit} className="mt-8 space-y-6"><div className="grid gap-5 sm:grid-cols-[1fr_1.45fr]"><label className="block"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-white/45">Contract title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Website redesign" className="mt-2 w-full rounded-xl bg-ink/55 px-4 py-3 text-[13px] text-cream outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint" /></label><label className="block"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-white/45">Freelancer wallet address</span><input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="G…" className="mt-2 w-full rounded-xl bg-ink/55 px-4 py-3 text-[13px] text-cream outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint" /></label></div><div><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-white/45">Milestones</p><p className="mt-1 text-[11px] text-white/45">Each milestone is created and funded through a separate, visible Freighter approval.</p></div><button type="button" onClick={add} disabled={deploying} className="flex items-center gap-1.5 rounded-lg bg-white/6 px-3 py-2 text-[11px] font-bold text-mint ringline transition hover:bg-mint hover:text-ink disabled:opacity-50"><Plus size={14} />Add milestone</button></div><div className="mt-4 space-y-3">{milestones.map((milestone, index) => <motion.div layout key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-ink/45 p-4 ringline"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mint/12 text-[11px] font-extrabold text-mint">{index + 1}</span><div className="grid flex-1 gap-3 sm:grid-cols-[1fr_145px]"><input aria-label={`Milestone ${index + 1} title`} value={milestone.title} disabled={deploying} onChange={(event) => update(index, "title", event.target.value)} placeholder="Milestone title" className="rounded-lg bg-white/5 px-3 py-2.5 text-[12px] outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint disabled:opacity-50" /><input aria-label={`Milestone ${index + 1} amount`} type="text" inputMode="decimal" value={milestone.amount} disabled={deploying} onChange={(event) => update(index, "amount", event.target.value)} placeholder="Amount (token)" className="rounded-lg bg-white/5 px-3 py-2.5 text-[12px] outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint disabled:opacity-50" /></div>{milestones.length > 1 && <button type="button" aria-label="Remove milestone" disabled={deploying} onClick={() => setMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-white/35 transition hover:text-coral disabled:opacity-50"><Trash2 size={16} /></button>}</div><textarea value={milestone.description} disabled={deploying} onChange={(event) => update(index, "description", event.target.value)} placeholder="What should be delivered?" className="mt-3 min-h-20 w-full resize-y rounded-lg bg-white/5 px-3 py-2.5 text-[12px] outline-none ringline placeholder:text-white/25 focus:ring-1 focus:ring-mint disabled:opacity-50" /></motion.div>)}</div></div><AnimatePresence>{(error || progress) && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={error ? "alert" : "status"} className={`rounded-xl px-3 py-2.5 text-[11px] font-semibold ringline ${error ? "bg-coral/12 text-coral" : "bg-mint/10 text-mint"}`}>{progress || error}</motion.p>}</AnimatePresence>{contractAddress && <p className="rounded-xl bg-mint/10 p-3 text-[11px] text-mint"><CheckCircle2 size={14} className="mr-1.5 inline" />Contract confirmed: <span className="break-all font-mono">{contractAddress}</span></p>}<div className="flex flex-wrap gap-3 border-t border-white/8 pt-6"><button disabled={deploying || connecting} className="flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-[12px] font-bold text-ink shadow-mint transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"><Wallet size={15} />{deploying ? "Awaiting Freighter…" : session ? "Deploy & fund with Freighter" : "Connect Freighter & deploy"}</button><button type="button" onClick={() => navigate("/dashboard")} disabled={deploying} className="rounded-xl bg-white/5 px-5 py-3 text-[12px] font-semibold text-white/80 ringline transition hover:bg-white/10 disabled:opacity-50">Cancel</button></div></form></div></div>;
}
