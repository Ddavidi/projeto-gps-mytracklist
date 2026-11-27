import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Sem esta regra o ESLint não enxerga variáveis usadas só no JSX (ex.: <CatIcon />)
      // e acusa "não usada" — remover por causa disso quebra a tela.
      'react/jsx-uses-vars': 'error',
      // Acusa componente usado no JSX que não existe (ex.: <CatIcon /> sem definição).
      'react/jsx-no-undef': 'error',
    },
  },
  {
    // Testes (Vitest com globals: describe, it, expect...)
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
  {
    // Contextos exportam o Provider junto com o hook (useAuth, usePlayer...): padrão do projeto.
    // A regra só afeta o hot reload em desenvolvimento, não o app publicado.
    files: ['src/context/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
