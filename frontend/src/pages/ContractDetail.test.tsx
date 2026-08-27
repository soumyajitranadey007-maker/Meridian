import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { ContractDetail } from "./ContractDetail";

vi.mock("../components/WalletProvider", () => ({ useWallet: () => ({ session: { address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" }, connect: vi.fn(), connecting: false }) }));
vi.mock("../lib/wallet", () => ({ callEscrowWithFreighter: vi.fn().mockResolvedValue({ transactionHash: "a".repeat(64) }), deliverableDigest: vi.fn().mockResolvedValue(new Uint8Array(32)) }));
vi.mock("../lib/api", () => ({
  fetchContract: vi.fn().mockResolvedValue({ id: "contract-1", chainAddress: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM", title: "Delivery", clientAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", freelancerAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", tokenAddress: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM", network: "testnet", status: "active", role: "Freelancer", counterparty: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", milestones: [{ id: "milestone-1", chainMilestoneId: 0, title: "Design", amount: "10", status: "Funded", description: "Design work" }] }),
  reviewMilestone: vi.fn().mockResolvedValue({ completenessScore: 88, summary: "Strong delivery.", riskFlags: [], suggestedQuestions: ["Confirm handoff"] }),
}));

it("renders an AI review after a signed submission", async () => {
  render(<MemoryRouter initialEntries={["/contracts/contract-1"]}><Routes><Route path="/contracts/:id" element={<ContractDetail />} /></Routes></MemoryRouter>);
  expect(await screen.findByText("Delivery")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText(/describe the work/i), { target: { value: "https://figma.com/file/demo" } });
  fireEvent.click(screen.getByRole("button", { name: /submit & request/i }));
  expect(await screen.findByText(/Meridian AI review/i)).toBeInTheDocument();
});
