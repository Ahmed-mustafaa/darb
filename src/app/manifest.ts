import type { MetadataRoute } from 'next';

/** Lets parents add Darb to their phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Darb · درب',
    short_name: 'Darb',
    description: 'School transport, tracked live',
    start_url: '/parent',
    display: 'standalone',
    background_color: '#F1F3EF',
    theme_color: '#F2A800',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
