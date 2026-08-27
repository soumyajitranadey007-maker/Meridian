export type MilestoneStatus = "Draft" | "Funded" | "Submitted" | "Approved" | "Disputed" | "Released";
export type ContractRole = "Client" | "Freelancer" | "Observer";

export interface Milestone {
  id: string;
  chainMilestoneId: number;
  title: string;
  amount: string;
  status: MilestoneStatus;
  description: string;
}

export interface EscrowContract {
  id: string;
  chainAddress: string;
  title: string;
  clientAddress: string;
  freelancerAddress: string;
  tokenAddress: string;
  network: string;
  status: string;
  role: ContractRole;
  counterparty: string;
  milestones: Milestone[];
}

export interface ActivityEvent {
  id: string;
  kind: string;
  message: string;
  contractAddress: string;
  occurredAt: string;
  transactionHash: string;
}

export interface AIReview {
  completenessScore: number;
  summary: string;
  riskFlags: string[];
  suggestedQuestions: string[];
}

export interface ReputationProfile {
  address: string;
  score: number;
  displayName: string | null;
}

export interface Dispute {
  id: string;
  contractId: string;
  chainCaseId: number | null;
  status: string;
  summary: string | null;
  resolvedToFreelancer: boolean | null;
  createdAt: string;
}
