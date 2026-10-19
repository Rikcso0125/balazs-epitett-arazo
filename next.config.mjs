/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // A szerveroldali PDF-készítés és az adatfájl fájlrendszerből olvas: Vercelen ezeket
  // a függvényekhez kell csomagolni
  outputFileTracingIncludes: {
    '/api/**/*': [
      './data/**/*',
      './public/template-assets/**/*',
      './public/uploads/**/*',
    ],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
