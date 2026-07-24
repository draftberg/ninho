import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    // Padrão do Next.js é 1MB — pequeno demais pra fotos de comprovante/nota
    // enviadas em Importar extrato (mesmo redimensionadas no navegador).
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
