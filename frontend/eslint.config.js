import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**", "*.min.js"],
  },
  { files: ["**/*.{js,mjs,cjs,jsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react-icons", message: "Use lucide-react for icons." },
            { name: "@mui/icons-material", message: "Use lucide-react for icons." },
            { name: "@heroicons/react", message: "Use lucide-react for icons." },
            { name: "phosphor-react", message: "Use lucide-react for icons." },
            { name: "react-feather", message: "Use lucide-react for icons." },
            { name: "feather-icons-react", message: "Use lucide-react for icons." },
            { name: "@tabler/icons-react", message: "Use lucide-react for icons." },
          ],
        },
      ],
    },
  },
  {
    ...pluginReact.configs.flat.recommended,
    files: ["**/*.{js,mjs,cjs,jsx}"],
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: [
      "**/*.test.{js,jsx}",
      "**/*.spec.{js,jsx}",
      "**/*.integration.test.{js,jsx}",
      "**/*.behavior.test.{js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
      },
    },
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      "css/no-invalid-properties": "off",
      "css/no-important": "off",
      "css/use-baseline": "off",
      "css/font-family-fallbacks": "off",
    },
  },
]);
