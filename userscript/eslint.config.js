import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module", // 改为 module 以支持 import.meta
      globals: {
        ...globals.browser,
        // Tampermonkey/Greasemonkey API
        GM_xmlhttpRequest: "readonly",
        GM_getValue: "readonly",
        GM_setValue: "readonly",
        GM_deleteValue: "readonly",
        unsafeWindow: "readonly",
        // Browser APIs
        crypto: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        URL: "readonly",
        MutationObserver: "readonly",
        createImageBitmap: "readonly",
      },
    },
    rules: {
      // 代码质量
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off", // userscript 中经常需要 console
      "no-undef": "error",

      // 代码风格
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      indent: ["error", 2, { SwitchCase: 1 }],
      "comma-dangle": ["error", "only-multiline"],

      // 最佳实践
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "warn",
      "no-eval": "error",
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
];
