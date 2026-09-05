import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
