/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/aichatbotbwanabet/**',
      },
    ],
  },
  // Bonus Center OPS CONSOLE (2026-10-22): a static page at /ops, never framed,
  // never indexed, never cached by a shared cache.
  async rewrites() {
    return [{ source: '/ops', destination: '/ops/index.html' }];
  },
  async headers() {
    const ops = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ];
    return [
      { source: '/ops', headers: ops },
      { source: '/ops/:path*', headers: ops },
      { source: '/api/ops/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
}

module.exports = nextConfig
