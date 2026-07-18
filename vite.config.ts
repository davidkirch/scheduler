import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    alias: {
      // ponytail: the package's prebuilt dist require()s core-js modules it never
      // declared as a dependency, so it fails to bundle. Its shipped TS source is
      // clean, so compile that instead of installing core-js. Drop if the lib
      // ever fixes its build.
      'react-schedule-selector': 'react-schedule-selector/src/lib/index.ts',
    },
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
