import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para despliegue estático (solo en producción)
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export',
    trailingSlash: true,
    distDir: 'dist',
  } : {}),
  
  // Configuración de imágenes para modo estático
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Deshabilitar telemetría y trace para evitar problemas
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'react-hot-toast',
      'zustand'
    ],
    // Deshabilitar trace para evitar errores de permisos
    disableOptimizedLoading: true,
  },

  // Telemetría se deshabilitó (deprecated en Next.js 15)
  
  // Deshabilitar generación de build traces para evitar errores de permisos
  generateBuildId: () => 'build',
  
  
  // Configuración de Webpack para better tree shaking
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Configuración TypeScript
  typescript: {
    // Permitir builds con errores de TypeScript en producción (solo warnings)
    ignoreBuildErrors: false,
  },
  
  // Configuración ESLint
  eslint: {
    // Permitir builds con warnings de ESLint (solo mostrar errores críticos)
    ignoreDuringBuilds: true,
  },
  
  // Configuración para archivos estáticos
  assetPrefix: '',
  basePath: '',
  
  // SWC minification is enabled by default in Next.js 15
  
  // Configuración de compresión
  compress: true,
  
  // Configuración para páginas de error personalizadas
  generateEtags: false,
};

export default nextConfig;
