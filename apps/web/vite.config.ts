import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "../../node_modules/react-native-web/src/index"),
      "react-native-svg": path.resolve(
        __dirname,
        "../../node_modules/react-native-svg/src/ReactNativeSVG.web"
      ),
    },
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js"],
  },
  define: {
    global: "globalThis",
  },
});
