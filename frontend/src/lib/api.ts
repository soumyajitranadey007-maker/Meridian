import type { AIReview, ActivityEvent, Dispute, EscrowContract, Milestone, ReputationProfile } from "../types";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

function apiBaseUrl(): string {
  if (!configuredApiUrl) {
    throw new ApiError("VITE_API_URL is required. Configure the production API URL in Vercel before using Meridian.");
  }
  return configuredApiUrl;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "The Meridian API did not return a valid error." }));
    throw new ApiError(body.detail ?? "The Meridian API request failed.", response.status);
  }
  return response.json() as Promise<T>;
}

type ApiMilestone = { id: string; chain_milestone_id: number; description: string; amount: string; status: string };
type ApiContract = {
  id: string; chain_address: string; title: string; client_address: string; freelancer_address: string;
  token_address: string; network: string; status: string; milestones?: ApiMilestone[];
};
type ApiEvent = { id: string; event_type: string; contract_address: string; transaction_hash: string; observed_at: string };
type ApiDispute = { id: string; contract_id: string; chain_case_id: number | null; status: string; summary: string | null; resolved_to_freelancer: boolean | null; created_at: string };

const titleFromDescription = (description: string, id: number) => description.split("\n")[0].slice(0, 80) || `Milestone ${id + 1}`;
const supportedStatus = (value: string): Milestone["status"] => {
  const normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return ["Draft", "Funded", "Submitted", "Approved", "Disputed", "Released"].includes(normalized) ? normalized as Milestone["status"] : "Draft";
};

export function mapContract(contract: ApiContract, walletAddress?: string): EscrowContract {
  const role = walletAddress === contract.client_address ? "Client" : walletAddress === contract.freelancer_address ? "Freelancer" : "Observer";
  return {
    id: contract.id,
    chainAddress: contract.chain_address,
    title: contract.title,
    clientAddress: contract.client_address,
    freelancerAddress: contract.freelancer_address,
    tokenAddress: contract.token_address,
    network: contract.network,
    status: contract.status,
    role,
    counterparty: role === "Client" ? contract.freelancer_address : contract.client_address,
    milestones: (contract.milestones ?? []).map((item) => ({
      id: item.id,
      chainMilestoneId: item.chain_milestone_id,
      title: titleFromDescription(item.description, item.chain_milestone_id),
      amount: item.amount,
      status: supportedStatus(item.status),
      description: item.description,
    })),
  };
}

export async function fetchContracts(walletAddress?: string): Promise<EscrowContract[]> {
  const query = walletAddress ? `?wallet_address=${encodeURIComponent(walletAddress)}` : "";
  const response = await request<ApiContract[]>(`/api/contracts${query}`);
  return response.map((contract) => mapContract(contract, walletAddress));
}

export async function fetchContract(id: string, walletAddress?: string): Promise<EscrowContract> {
  return mapContract(await request<ApiContract>(`/api/contracts/${encodeURIComponent(id)}`), walletAddress);
}

export async function createContract(payload: {
  chainAddress: string; clientAddress: string; freelancerAddress: string; tokenAddress: string; title: string; network: string; transactionHash: string;
  milestones: Array<{ chainMilestoneId: number; description: string; amount: string }>;
}): Promise<EscrowContract> {
  const response = await request<ApiContract>("/api/contracts", {
    method: "POST",
    body: JSON.stringify({
      chain_address: payload.chainAddress,
      client_address: payload.clientAddress,
      freelancer_address: payload.freelancerAddress,
      token_address: payload.tokenAddress,
      title: payload.title,
      network: payload.network,
      transaction_hash: payload.transactionHash,
      milestones: payload.milestones.map((item) => ({ chain_milestone_id: item.chainMilestoneId, description: item.description, amount: item.amount })),
    }),
  });
  return mapContract(response, payload.clientAddress);
}

export async function reviewMilestone(milestoneId: string, deliverable: string): Promise<AIReview> {
  const response = await request<{ completeness_score: number; summary: string; risk_flags: string[]; suggested_questions: string[] }>(`/api/milestones/${encodeURIComponent(milestoneId)}/review`, {
    method: "POST",
    body: JSON.stringify({ deliverable }),
  });
  return { completenessScore: response.completeness_score, summary: response.summary, riskFlags: response.risk_flags, suggestedQuestions: response.suggested_questions };
}

export async function fetchActivity(walletAddress?: string): Promise<ActivityEvent[]> {
  const query = walletAddress ? `?wallet_address=${encodeURIComponent(walletAddress)}` : "";
  const response = await request<ApiEvent[]>(`/api/contracts/events${query}`);
  return response.map((event) => ({
    id: event.id,
    kind: event.event_type,
    message: `${event.event_type.replace(/([A-Z])/g, " $1").trim()} confirmed on Stellar.`,
    contractAddress: event.contract_address,
    occurredAt: event.observed_at,
    transactionHash: event.transaction_hash,
  }));
}

export async function fetchReputation(address: string): Promise<ReputationProfile> {
  const response = await request<{ address: string; score: number; display_name: string | null }>(`/api/reputation/${encodeURIComponent(address)}`);
  return { address: response.address, score: response.score, displayName: response.display_name };
}

export async function fetchDisputes(walletAddress?: string): Promise<Dispute[]> {
  const query = walletAddress ? `?wallet_address=${encodeURIComponent(walletAddress)}` : "";
  const response = await request<ApiDispute[]>(`/api/disputes${query}`);
  return response.map((item) => ({ id: item.id, contractId: item.contract_id, chainCaseId: item.chain_case_id, status: item.status, summary: item.summary, resolvedToFreelancer: item.resolved_to_freelancer, createdAt: item.created_at }));
}

export async function submitEvidence(disputeId: string, partyAddress: string, body: string): Promise<void> {
  await request(`/api/disputes/${encodeURIComponent(disputeId)}/evidence`, { method: "POST", body: JSON.stringify({ party_address: partyAddress, body }) });
}

export async function requestDisputeSummary(disputeId: string): Promise<string> {
  const response = await request<{ summary: string }>(`/api/disputes/${encodeURIComponent(disputeId)}/summary`, { method: "POST" });
  return response.summary;
}
