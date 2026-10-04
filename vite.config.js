import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" lets the built site be served from any folder or sub-path
export default defineConfig({
  base: "./",
  plugins: [react()],
});
