import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localFetchPlugin } from "./vite-plugin-fetch";
import { shellManifestPlugin } from "./vite-plugin-shell-manifest";

export default defineConfig({
  plugins: [react(), localFetchPlugin(), shellManifestPlugin()],
  resolve: {
    alias: {
      "@core": new URL("./src/core", import.meta.url).pathname,
      "@ui": new URL("./src/ui", import.meta.url).pathname,
      "@app": new URL("./src/app", import.meta.url).pathname,
    },
  },
  worker: {
    format: "es",
  },
});
