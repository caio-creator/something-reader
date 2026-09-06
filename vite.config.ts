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
  preview: {
    /*
     * Testing on a real phone needs a hostname this config cannot know — a
     * tunnel, or a machine on the local network. It is opt-in through the
     * environment and empty by default, so a preview never answers to a host
     * nobody asked it to.
     */
    allowedHosts: process.env.PREVIEW_ALLOWED_HOSTS?.split(",").map((host) => host.trim()) ?? [],
  },
  worker: {
    format: "es",
  },
});
