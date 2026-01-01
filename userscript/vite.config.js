import { defineConfig, loadEnv } from "vite";
import banner from "vite-plugin-banner";
import { readFileSync } from "fs";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // 读取 userscript 元数据模板
  let metadata = readFileSync(resolve(__dirname, "src/metadata.txt"), "utf-8");

  // 如果有环境变量，在元数据中添加配置说明
  if (env.VITE_WORKER_URL || env.VITE_SUPABASE_URL) {
    const configComment = `
// 配置信息（构建时注入）:
// WORKER_URL: ${env.VITE_WORKER_URL || "未配置"}
// SUPABASE_URL: ${env.VITE_SUPABASE_URL || "未配置"}
`;
    metadata = metadata + configComment;
  }

  return {
    build: {
      // 输出目录
      outDir: "dist",
      // 清空输出目录
      emptyOutDir: true,
      // 库模式配置
      lib: {
        entry: resolve(__dirname, "src/main.js"),
        name: "SnapMoe",
        formats: ["iife"],
        fileName: () => "snapmoe.user.js",
      },
      // 不分割代码，输出单个文件
      rollupOptions: {
        output: {
          // 不添加 hash
          entryFileNames: "snapmoe.user.js",
          // 使用 IIFE 格式包装
          format: "iife",
          // 不生成 sourcemap（userscript 不需要）
          sourcemap: false,
        },
      },
      // 不压缩代码，保持可读性（userscript 通常不压缩）
      minify: false,
      // 目标浏览器
      target: "es2022",
    },
    plugins: [
      // 在文件顶部添加 userscript 元数据
      banner({
        content: metadata,
        // 不添加额外的注释标记
        verify: false,
      }),
    ],
  };
});
