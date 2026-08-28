import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreateContract } from "./pages/CreateContract";
import { ContractDetail } from "./pages/ContractDetail";
import { Contracts } from "./pages/Contracts";
import { Disputes } from "./pages/Disputes";
import { Reputation } from "./pages/Reputation";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";
import { WalletProvider } from "./components/WalletProvider";

export default function App() { return <WalletProvider><Routes><Route path="/" element={<Landing />} /><Route element={<AppShell />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/contracts" element={<Contracts />} /><Route path="/contracts/new" element={<CreateContract />} /><Route path="/contracts/:id" element={<ContractDetail />} /><Route path="/disputes" element={<Disputes />} /><Route path="/reputation" element={<Reputation />} /><Route path="/settings" element={<Settings />} /><Route path="/admin" element={<Admin />} /><Route path="/archive" element={<Contracts />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></WalletProvider>; }
