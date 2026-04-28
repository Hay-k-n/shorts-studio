/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "**.heygen.com" },
      { hostname: "**.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
