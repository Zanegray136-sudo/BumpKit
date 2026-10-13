import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative paths, so the built site works from any address: a github.io project page,
// a custom domain, or a sub-folder. It also survives renaming the repository.
// Set BASE_PATH only if you need absolute paths.
export default defineConfig({
  base: process.env.BASE_PATH || "./",
  plugins: [
    react(),
    tailwindcss(),
  ],
});
