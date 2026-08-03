const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap() {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    // The reviewer needs no account, so it is worth indexing in its own right.
    { url: `${siteUrl}/review`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ];
}
