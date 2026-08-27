import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Landing } from "./Landing";
it("renders the Meridian landing call to action", () => { render(<BrowserRouter><Landing /></BrowserRouter>); expect(screen.getByRole("heading", { name: /where milestones meet money/i })).toBeInTheDocument(); expect(screen.getByRole("link", { name: /open workspace/i })).toBeInTheDocument(); });
