import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', 
  basePath: '/Prototipo_MapaGeoespacial_SP',
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;
