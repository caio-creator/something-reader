import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localFetchPlugin } from "./vite-plugin-fetch";

export default defineConfig({
  plugins: [react(), localFetchPlugin()],
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
