import { defineConfig } from "vite";

export default defineConfig({
  // Streamlit이 dist 폴더를 별도 경로에서 제공하므로 상대 경로를 사용한다.
  base: "./",
  build: {
    outDir: "dist",
  },
});
