import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Faz react-native-web resolver todos os imports de react-native no browser
      "react-native": path.resolve(__dirname, "../../node_modules/react-native-web/src/index"),
      // Alias para react-native-svg no web
      "react-native-svg": path.resolve(
        __dirname,
        "../../node_modules/react-native-svg/src/ReactNativeSVG.web"
      ),
    },
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js"],
  },
  optimizeDeps: {
    include: ["sql.js"],
  },
  server: {
    headers: {
      // Necessário para SharedArrayBuffer (sql.js WASM)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  define: {
    // Shim global para libs React Native
    global: "globalThis",
  },
});
