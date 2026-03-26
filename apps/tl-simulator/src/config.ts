/**
 * Runtime configuration — resolved from Vite env variables.
 *
 * In development:  defaults to http://localhost:8000
 * In production:   reads VITE_SERVER_URL from .env.production
 *
 * Usage:  import { SERVER_URL, ASSET_BASE } from '@/config';
 */
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

/**
 * Base URL for static image assets (character cards, action cards, etc.)
 *
 * In development:  empty string (served from local /assets/)
 * In production:   jsDelivr CDN via GitHub repo
 *
 * Usage:  `${ASSET_BASE}/assets/xxx.png`
 */
export const ASSET_BASE =
  import.meta.env.VITE_ASSET_BASE || '/assets';
