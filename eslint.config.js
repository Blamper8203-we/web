// ESLint flat config (ESLint 9+ standard). Reguły celowo minimalne na start:
// - Łapią realne bugi (no-debug, no-unused-vars, no-undef, eqeqeq)
// - Stylistyczne pomijamy (Prettier by je ogarniał, ale go nie mamy)
// - Reguły TS-u dostosowane do "recommended"
// - React/JSX-a11y świadomie pominięte (to osobny temat, łatwo nadpalić)
//
// Iteracja: zacznij ostrzeżenia, stopniowo zaostrzaj. `lint` skrypt z flagą
// --max-warnings 0 to "fail on any warning" — używaj ostrożnie.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // Bazowe rekomendacje
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Globalne ignores — node_modules, dist, .harness (ma własne standardy), etc.
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".vite/**",
      "android/**",
      "ios/**",
      "src-tauri/**",
      "scripts/debug/**",
      "scratch/**",
      "test-artifacts/**",
      "public/**",  // SVG assety, nie TS
      ".harness/**",
      ".opencode/**",
      ".mavis/**",
      // Historyczne backupy (nie ruszane, źródło starych wersji)
      "_backup_schematic_2026-06-04/**",
      ".module-backups/**",
      // Wygenerowane
      "dist-sw.js",
      "registerSW.js",
      // Konkretne śmieciowe pliki w root które nie są kodem
      "rrrrrr.svg",
      "testt.svg",
      "jesdt.svg",
      "parse_svg.py",
      "update_preview.py",
    ],
  },

  // Bazowe ustawienia dla wszystkich plików JS/TS
  {
    files: ["**/*.{js,ts,tsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2024,
        // Świadome globalne typy środowiska DINBoard
        "import.meta": "readonly",
        __TAURI__: "readonly",
      },
    },
    rules: {
      // === Realne bugi ===

      // console.log/debugger/alert zostawione w kodzie — typowy dev mistake.
      // W Fazie 0.1 sam dodałem debug console.log, więc to się przyda.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",

      // `==` vs `===` — w TS prawie zawsze chcemy `===` (poza null check)
      eqeqeq: ["error", "always", { null: "ignore" }],

      // Preferuj niemutowalne const
      "prefer-const": "warn",
      "no-var": "error",

      // Unikaj `with`
      "no-with": "error",

      // Zakaz podwójnych porównań które nie mają sensu
      "no-self-compare": "error",

      // Unikaj pustych bloków (czasem w hookach trzeba — wtedy w placeholderze)
      "no-empty": ["error", { allowEmptyCatch: true }],

      // Zakaz wycieków zmiennych globalnych
      "no-implicit-globals": "warn",
    },
  },

  // Pliki testowe — Vitest globals (describe, it, expect)
  {
    files: ["**/*.test.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      // console.log w testach OK (do debugowania)
      "no-console": "off",
    },
  },

  // Node.js scripts (smoke, build helpers) — process, Buffer, itd.
  {
    files: ["scripts/**/*.{js,mjs,cjs}", "**/*.{cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        // Buffer jest globalny w Node
        Buffer: "readonly",
      },
    },
    rules: {
      // console.log w skryptach OK
      "no-console": "off",
    },
  },

  // runtimeDiagnostics — cały moduł jest o kontrolowanym console output
  // (devLog/devWarn/devError są bramkowane przez IS_DEV). Pozwól na console.*.
  {
    files: ["src/lib/runtimeDiagnostics.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // TypeScript-specific — wyłącz niektóre które kolidują z naszym kodem
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Częste false-positives w naszym kodzie (mają sens w kontekście)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // any jest OK w granicach (np. testy, integracje z bibliotekami bez typów)
      "@typescript-eslint/no-explicit-any": "off",
      // this w TS czasem potrzebne (sub-klasy, event handlery)
      "@typescript-eslint/no-this-alias": "off",
      // Puste interfejsy są OK (np. type-only)
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },

  // React Hooks — wyłapuje brakujące zależności w useEffect/useMemo.
  // Reguła jest "warn" zamiast "error" bo mamy dużo istniejących
  // useEffect z niepełnymi deps (często świadomie, np. z funkcjami
  // tworzonymi inline). Stopniowo zaostrzamy.
  //
  // TECHNICAL DEBT: 14 warnings w `App.tsx` dla useCallback/useEffect, które
  // closure'ują obiekty z custom hooków (dialog, sheetPanel, history,
  // schematic). Te obiekty są stabilne w obrębie komponentu (custom hooki
  // zwracają stabilne referencje), ale lint ich nie widzi. Dodanie ich do
  // deps rekreowałoby useCallback przy każdym renderze. Do usunięcia
  // gdy obiekty z custom hooków będą stabilizowane przez useMemo.
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",  // prawdziwe bugi zawsze error
      "react-hooks/exhaustive-deps": "warn",  // warnings na start
    },
  },
);
