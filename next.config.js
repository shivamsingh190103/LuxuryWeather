const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline"
  },
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/[^/]+\/api\/weather(?:\?.*)?$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "weather-bff-cache",
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 10 * 60
        },
        networkTimeoutSeconds: 4
      }
    },
    {
      urlPattern: /^https:\/\/api\.openweathermap\.org\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "openweather-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 10 * 60
        },
        networkTimeoutSeconds: 5
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 60 * 60 * 24 * 365
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

module.exports = withPWA(nextConfig);
