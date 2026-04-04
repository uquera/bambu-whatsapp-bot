import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Prefijo separado para no colisionar con /_next/ del admin (centro-bambu-demo)
  // en el mismo dominio bajo nginx
  assetPrefix: process.env.NODE_ENV === "production" ? "/_bot" : "",
};

export default nextConfig;
