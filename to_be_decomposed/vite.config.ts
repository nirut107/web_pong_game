import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

const certDir = path.resolve(__dirname, "nginx", "certs");

export default defineConfig({
  plugins: [tailwindcss()],

  server: {
    port: 3000,
    https: {
      key: fs.readFileSync(path.join(certDir, "private.key")),
      cert: fs.readFileSync(path.join(certDir, "cert.crt")),
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false, // allow self-signed cert
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Origin", "https://localhost:3000");
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            if (req.method === "OPTIONS") {
              proxyRes.headers["Access-Control-Allow-Origin"] =
                "https://localhost:3000";
              proxyRes.headers["Access-Control-Allow-Credentials"] = "true";
              proxyRes.headers["Access-Control-Allow-Methods"] =
                "GET, POST, PUT, DELETE, OPTIONS";
              proxyRes.headers["Access-Control-Allow-Headers"] =
                "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since";
              proxyRes.headers["Access-Control-Max-Age"] = "86400";
            }
          });
        },
      },
    },
  },

  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ["@babylonjs/core", "@babylonjs/loaders"],
          vendor: ["socket.io-client"],
        },
        compact: false,
      },
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },
});
