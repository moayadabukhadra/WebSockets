/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];
    return config;
  },
  webSocketServerOptions: {
    path: '/socket.io',
  }
};

module.exports = nextConfig; 