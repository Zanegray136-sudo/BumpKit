import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// BASE_PATH is only needed when the site is served from a sub-folder, for example
// GitHub Pages project sites at https://user.github.io/repo-name/ (set it to "/repo-name/").
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
});
