import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CreateContract } from "./CreateContract";
import { WalletProvider } from "../components/WalletProvider";
it("validates required contract fields", () => { render(<WalletProvider><BrowserRouter><CreateContract /></BrowserRouter></WalletProvider>); fireEvent.click(screen.getByRole("button", { name: /freighter.*deploy/i })); expect(screen.getByRole("alert")).toHaveTextContent(/valid G/i); });
