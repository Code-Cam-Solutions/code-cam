import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    /*
     * O CodeCam é aberto por QR Code, em celular, muitas vezes na rede da
     * escola. Duas coisas decorrem disso e explicam a configuração abaixo.
     *
     * Instalável: uma vez na tela de início, o app abre sem barra de endereços
     * e sem depender de reencontrar o link — que é como um app de estudo
     * precisa ser aberto todo dia.
     *
     * Utilizável com rede ruim: o casco entra em cache na instalação, e as
     * respostas de leitura da API ficam guardadas. Sem internet, o material já
     * consultado continua legível — inclusive os cartões da revisão. O que
     * escreve (login, scan, revisão) nunca é servido de cache: uma resposta
     * antiga a uma escrita seria pior do que um erro honesto.
     */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo-codecam.svg", "apple-touch-icon.png"],

      manifest: {
        name: "CodeCam — estudo acessível com IA",
        short_name: "CodeCam",
        description:
          "Fotografe seus materiais de estudo e transforme-os em resumos, tópicos e flashcards acessíveis.",
        lang: "pt-BR",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0e0e13",
        theme_color: "#0e0e13",
        categories: ["education", "productivity"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          // Ícone separado para o recorte adaptativo do Android: a máscara do
          // sistema corta os cantos, e o logotipo do ícone comum ficaria
          // decepado. Este traz o desenho dentro dos 80% centrais seguros.
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "Escanear material", short_name: "Escanear", url: "/camera" },
          { name: "Revisão do dia", short_name: "Revisar", url: "/flashcards" },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // O app é uma SPA: qualquer rota desconhecida devolve o index, que é o
        // que faz um endereço colado direto na barra funcionar offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            // Leitura da API. Rede primeiro, cache como rede de segurança: o
            // dado fresco vence sempre que houver conexão, e os três segundos
            // de espera são o limite antes de o app parecer travado.
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              /\/(contents|folders|study|stats|search)/.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "codecam-api",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // A OpenDyslexic vem de CDN e quase nunca muda. Cache primeiro
            // evita que quem depende dela veja a fonte trocar a cada carga.
            urlPattern: ({ url }) => url.origin === "https://cdn.jsdelivr.net",
            handler: "CacheFirst",
            options: {
              cacheName: "codecam-fontes",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        // Desligado em desenvolvimento: um service worker servindo módulo em
        // cache é a forma mais eficiente de tornar o HMR incompreensível.
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 5173,
  },

  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separa dependências estáveis do código da aplicação para melhor cache no navegador.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          icons: ["lucide-react"],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/test/**", "**/*.d.ts", "**/*.config.*", "src/main.tsx"],
    },
  },
});
