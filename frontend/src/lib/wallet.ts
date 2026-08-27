type FreighterApi = typeof import("@stellar/freighter-api");
type StellarSdk = typeof import("@stellar/stellar-sdk");
type ContractOperation = ReturnType<StellarSdk["Operation"]["invokeContractFunction"]>;
type ScVal = ReturnType<StellarSdk["nativeToScVal"]>;
export type ContractArgument = { value: string | number | Uint8Array; type: "address" | "bytes" | "u32" };

const freighter = (): Promise<FreighterApi> => import("@stellar/freighter-api");
const stellar = (): Promise<StellarSdk> => import("@stellar/stellar-sdk");
const factoryStorageKey = "meridian.factory.testnet";

export interface WalletSession {
  address: string;
  networkPassphrase: string;
  network: string;
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export function configuredFactoryAddress(): string | undefined {
  return import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS || window.localStorage.getItem(factoryStorageKey) || undefined;
}

const requiredRpcUrl = () => {
  const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL;
  if (!rpcUrl) throw new WalletError("VITE_SOROBAN_RPC_URL is required before on-chain actions can be used.");
  return rpcUrl;
};

const errorMessage = (error: unknown) => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Freighter rejected or could not sign the transaction.";
};

export async function connectFreighter(): Promise<WalletSession> {
  const [freighterApi, stellarSdk] = await Promise.all([freighter(), stellar()]);
  const { isConnected, requestAccess, getNetwork } = freighterApi;
  const installed = await isConnected();
  if (installed.error || !installed.isConnected) throw new WalletError("Freighter is not available. Install and unlock the Freighter browser extension first.");
  const access = await requestAccess();
  if (access.error || !access.address) throw new WalletError(errorMessage(access.error));
  const network = await getNetwork();
  if (network.error) throw new WalletError(errorMessage(network.error));
  if (network.networkPassphrase !== stellarSdk.Networks.TESTNET) {
    throw new WalletError("Switch Freighter to Stellar Testnet before using this Meridian deployment.");
  }
  return { address: access.address, network: network.network, networkPassphrase: network.networkPassphrase };
}

export async function restoreFreighterSession(): Promise<WalletSession | null> {
  const [freighterApi, stellarSdk] = await Promise.all([freighter(), stellar()]);
  const { isAllowed, getAddress, getNetwork } = freighterApi;
  const allowed = await isAllowed();
  if (allowed.error || !allowed.isAllowed) return null;
  const address = await getAddress();
  const network = await getNetwork();
  if (address.error || network.error || !address.address || network.networkPassphrase !== stellarSdk.Networks.TESTNET) return null;
  return { address: address.address, network: network.network, networkPassphrase: network.networkPassphrase };
}

async function signAndSubmit(sdk: StellarSdk, session: WalletSession, operation: ContractOperation) {
  const { rpc, BASE_FEE, TransactionBuilder } = sdk;
  const { signTransaction } = await freighter();
  const server = new rpc.Server(requiredRpcUrl());
  const account = await server.getAccount(session.address);
  const transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: session.networkPassphrase })
    .addOperation(operation)
    .setTimeout(90)
    .build();
  const prepared = await server.prepareTransaction(transaction);
  const signed = await signTransaction(prepared.toXDR(), { address: session.address, networkPassphrase: session.networkPassphrase });
  if (signed.error || !signed.signedTxXdr) throw new WalletError(errorMessage(signed.error));
  const submitted = await server.sendTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, session.networkPassphrase));
  if (submitted.status === "ERROR") throw new WalletError(`Stellar RPC rejected the transaction: ${submitted.errorResult ?? "unknown error"}`);
  const completed = await server.pollTransaction(submitted.hash, { attempts: 45, sleepStrategy: rpc.LinearSleepStrategy });
  if (completed.status !== rpc.Api.GetTransactionStatus.SUCCESS) throw new WalletError("The transaction did not confirm successfully on Stellar Testnet.");
  return { transactionHash: submitted.hash, returnValue: completed.returnValue };
}

function tokenAmount(value: string): bigint {
  if (!/^\d+(\.\d{1,7})?$/.test(value)) throw new WalletError("Each amount must use up to 7 decimal places.");
  const [whole, fractional = ""] = value.split(".");
  return BigInt(whole) * 10_000_000n + BigInt(fractional.padEnd(7, "0"));
}

export async function createEscrowWithFreighter(input: {
  session: WalletSession;
  factoryAddress: string;
  freelancerAddress: string;
  milestones: Array<{ description: string; amount: string }>;
  onStatus?: (message: string) => void;
}): Promise<{ contractAddress: string; deploymentTransactionHash: string }> {
  const sdk = await stellar();
  const { Contract, nativeToScVal, scValToNative } = sdk;
  if (!input.factoryAddress) throw new WalletError("VITE_FACTORY_CONTRACT_ADDRESS is required to create an escrow contract.");
  input.onStatus?.("Creating your escrow contract through the Meridian factory…");
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const factory = new Contract(input.factoryAddress);
  const deployed = await signAndSubmit(sdk, input.session, factory.call("create_escrow", nativeToScVal(input.session.address, { type: "address" }), nativeToScVal(input.freelancerAddress, { type: "address" }), nativeToScVal(salt, { type: "bytes" })));
  const contractAddress = deployed.returnValue ? scValToNative(deployed.returnValue) : null;
  if (typeof contractAddress !== "string" || !contractAddress.startsWith("C")) throw new WalletError("Stellar confirmed deployment but did not return a valid contract address.");

  const contract = new Contract(contractAddress);
  const invoke = async (label: string, method: string, args: ScVal[]) => {
    input.onStatus?.(label);
    return signAndSubmit(sdk, input.session, contract.call(method, ...args));
  };
  for (const milestone of input.milestones) {
    const created = await invoke(`Adding and funding ${milestone.description.slice(0, 42)}…`, "add_milestone", [
      nativeToScVal(milestone.description, { type: "string" }),
      nativeToScVal(tokenAmount(milestone.amount), { type: "i128" }),
    ]);
    const chainMilestoneId = created.returnValue ? scValToNative(created.returnValue) : null;
    if (typeof chainMilestoneId !== "number") throw new WalletError("The new milestone did not return a valid on-chain identifier.");
    const funded = await invoke(`Funding milestone ${chainMilestoneId + 1} from Freighter…`, "fund_milestone", [nativeToScVal(chainMilestoneId, { type: "u32" })]);
    void funded;
  }
  input.onStatus?.("All signed transactions confirmed on Stellar Testnet.");
  return { contractAddress, deploymentTransactionHash: deployed.transactionHash };
}

async function loadProtocolWasm(file: string): Promise<Uint8Array> {
  const response = await fetch(`/contracts/${file}`, { cache: "no-store" });
  if (!response.ok) throw new WalletError(`The audited ${file} artifact is unavailable in this Vercel build.`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function bootstrapProtocolWithFreighter(input: { session: WalletSession; tokenAddress: string; onStatus?: (message: string) => void }): Promise<{ factoryAddress: string; reputationAddress: string; arbitrationAddress: string }> {
  const sdk = await stellar();
  const { Address, Contract, Operation, nativeToScVal, scValToNative } = sdk;
  if (!input.tokenAddress) throw new WalletError("VITE_TOKEN_CONTRACT_ADDRESS is required before the protocol can be initialized.");
  const upload = async (name: string) => {
    input.onStatus?.(`Uploading audited ${name.replace("meridian_", "").replace(".wasm", "")} WASM…`);
    const result = await signAndSubmit(sdk, input.session, Operation.uploadContractWasm({ wasm: await loadProtocolWasm(name) }));
    const hash = result.returnValue ? scValToNative(result.returnValue) : null;
    if (!(hash instanceof Uint8Array)) throw new WalletError(`Stellar did not return a valid hash for ${name}.`);
    return hash;
  };
  const deploy = async (name: string, wasmHash: Uint8Array) => {
    input.onStatus?.(`Deploying ${name}…`);
    const result = await signAndSubmit(sdk, input.session, Operation.createCustomContract({ address: new Address(input.session.address), wasmHash, salt: crypto.getRandomValues(new Uint8Array(32)) }));
    const address = result.returnValue ? scValToNative(result.returnValue) : null;
    if (typeof address !== "string" || !address.startsWith("C")) throw new WalletError(`Stellar did not return a valid ${name} contract address.`);
    return address;
  };
  const invoke = async (address: string, label: string, method: string, args: ScVal[]) => {
    input.onStatus?.(label);
    await signAndSubmit(sdk, input.session, new Contract(address).call(method, ...args));
  };
  // Freighter transactions share one account sequence number, so these must
  // remain sequential rather than racing four signed uploads.
  const escrowWasmHash = await upload("meridian_escrow.wasm");
  const reputationWasmHash = await upload("meridian_reputation.wasm");
  const arbitrationWasmHash = await upload("meridian_arbitration.wasm");
  const factoryWasmHash = await upload("meridian_factory.wasm");
  const reputationAddress = await deploy("reputation", reputationWasmHash);
  const arbitrationAddress = await deploy("arbitration", arbitrationWasmHash);
  const factoryAddress = await deploy("factory", factoryWasmHash);
  await invoke(reputationAddress, "Initializing reputation safeguards…", "initialize", [nativeToScVal(input.session.address, { type: "address" }), nativeToScVal(factoryAddress, { type: "address" }), nativeToScVal(arbitrationAddress, { type: "address" })]);
  await invoke(arbitrationAddress, "Initializing independent arbitration…", "initialize", [nativeToScVal(input.session.address, { type: "address" }), nativeToScVal(input.session.address, { type: "address" }), nativeToScVal(reputationAddress, { type: "address" }), nativeToScVal(factoryAddress, { type: "address" })]);
  await invoke(factoryAddress, "Initializing the Meridian escrow factory…", "initialize", [nativeToScVal(input.session.address, { type: "address" }), nativeToScVal(escrowWasmHash, { type: "bytes" }), nativeToScVal(input.tokenAddress, { type: "address" }), nativeToScVal(reputationAddress, { type: "address" }), nativeToScVal(arbitrationAddress, { type: "address" })]);
  window.localStorage.setItem(factoryStorageKey, factoryAddress);
  input.onStatus?.("Protocol confirmed. Add the factory address to Vercel for all users.");
  return { factoryAddress, reputationAddress, arbitrationAddress };
}

export async function callEscrowWithFreighter(input: { session: WalletSession; contractAddress: string; method: string; args: ContractArgument[] }) {
  const sdk = await stellar();
  return signAndSubmit(sdk, input.session, new sdk.Contract(input.contractAddress).call(input.method, ...input.args.map((argument) => sdk.nativeToScVal(argument.value, { type: argument.type }))));
}

export async function deliverableDigest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
