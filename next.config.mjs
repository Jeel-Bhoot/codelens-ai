/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Enabled via babel-plugin-react-compiler: auto-memoizes components so the
  // reviewer workspace stays smooth while tokens stream in at ~60fps.
  reactCompiler: true,

  // Monaco ships its own workers; keeping it out of the server bundle avoids
  // pulling ~4MB of editor code into the Node build.
  serverExternalPackages: ['monaco-editor'],

  async headers() {
    const csp = [
      "default-src 'self'",
      // Monaco compiles its tokenizer at runtime, hence 'unsafe-eval'.
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      // Live preview + Monaco run in sandboxed workers/frames.
      "worker-src 'self' blob:",
      "frame-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
