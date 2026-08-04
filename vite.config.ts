import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/pizza/",
  build: {
    rollupOptions: {
      input: {
        storefront: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin/index.html"),
      },
    },
  },
});
