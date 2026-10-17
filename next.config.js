/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hosts allowed to load Next.js dev assets when the dev server is reached
  // through a proxy or tunnel (cloud preview, LAN/IPad testing, ngrok, ...).
  // Without this, Next blocks cross-origin dev resources and the page renders
  // without hydrating, so no button responds.
  //
  // Comma-separated hostnames, e.g.
  //   ALLOWED_DEV_ORIGINS=192.168.1.20:3000,my-tunnel.example.com npm run dev
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

module.exports = nextConfig;
