import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/constants';

export default function manifest() {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0f1e',
    theme_color: '#0a0f1e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
