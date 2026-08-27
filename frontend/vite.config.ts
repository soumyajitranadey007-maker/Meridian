import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "lucide-react": fileURLToPath(new URL("./src/components/icons.tsx", import.meta.url)) } },
  // Stellar's SDK is intentionally loaded only after a wallet action; its
  // separate transaction runtime is larger than the initial visual app shell.
  build: { chunkSizeWarningLimit: 1000 }
});
