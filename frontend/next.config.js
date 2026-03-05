/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_URL: 'https://football-predictor-api-n9sl.onrender.com',
  },
}
module.exports = nextConfig
