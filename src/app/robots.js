const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing behind auth is useful to a crawler.
        disallow: ['/api/', '/dashboard', '/review', '/history', '/settings'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
