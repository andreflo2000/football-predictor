/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_URL: 'https://football-predictor-api-n9sl.onrender.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://njjxnkbqfpkqxzyzctlm.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qanhua2JxZnBrcXh6eXpjdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTc2NjgsImV4cCI6MjA4ODEzMzY2OH0.zroQdLRj0vPmNjkgGhGUz-3aEI2FEQ9Y0Oo9_eZ-zPE',
  },
}
module.exports = nextConfig
