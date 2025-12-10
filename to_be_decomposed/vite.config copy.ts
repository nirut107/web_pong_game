import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import fs from "fs";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    // minify: "terser",
    minify: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug", "console.info"],
        passes: 2,
      },
      format: {
        comments: false,
      },
      keep_fnames: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ["@babylonjs/core", "@babylonjs/loaders"],
          vendor: ["socket.io-client"],
        },
        compact: true,
      },
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },

  server: {
    https: {
      key: fs.readFileSync("./public/certs/private.key"),
      cert: fs.readFileSync("./public/certs/cert.crt"),
    },
    host: "localhost",
    port: 3000,
  },
});
