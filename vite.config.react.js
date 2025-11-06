import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import reactRefresh from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import fs from "fs";

dotenv.config();

// Auto-increment build number
function updateVersion() {
  const packagePath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const versionParts = pkg.version.split(".");
  const buildNumber = parseInt(versionParts[3] || "0") + 1;
  const newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.${buildNumber}`;
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  return newVersion;
}

const version = process.env.NODE_ENV === "production" ? updateVersion() : JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8")).version;

const manifestForPlugin = {
  registerType: "prompt",
  includeAssets: ["favicon.ico"],
  manifest: {
    short_name: "DooCoins",
    name: "DooCoins Kids Rewards dApp",
    description: "Children earn DooCoins for good behavior, completing chores and personal achievements. Web3 dApp built on blockchain",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon"
      },
      {
        src: "/192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any maskable"
      },
      {
        src: "/512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any maskable"
      },
      {
        src: "/144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    theme_color: "#0B334D",
    background_color: "#0B334D",
    display: "standalone",
    scope: "/",
    start_url: "/",
    orientation: "portrait"
  }
};

export default defineConfig({
  root: path.resolve(__dirname, "src", "frontend"),
  build: {
    outDir: path.resolve(__dirname, "src", "frontend", "dist"),
    emptyOutDir: true
  },
  define: {
    global: "window",
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version)
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        // target: "http://127.0.0.1:5173",
        changeOrigin: true
      }
    }
  },
  plugins: [
    reactRefresh(),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin({ BACKEND_CANISTER_ID: "" }),
    // VitePWA(manifestForPlugin), // TEMPORARILY DISABLED for testing
    svgr()
  ]
});