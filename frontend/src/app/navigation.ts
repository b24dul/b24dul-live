import {
  Gamepad2,
  Home,
  MessageCircle,
  Play,
  Clapperboard,
  UserRound,
  Settings,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppRoute = {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  mobile?: boolean;
};

export const routes: readonly AppRoute[] = [
  {
    path: '/',
    label: 'Home',
    icon: Home,
    description: 'Welcome and platform overview',
    mobile: true,
  },
  {
    path: '/watch',
    label: 'Watch',
    icon: Play,
    description: 'Streaming destination',
    mobile: true,
  },
  {
    path: '/videos',
    label: 'Videos',
    icon: Clapperboard,
    description: 'Video archive destination',
  },
  { path: '/games', label: 'Games', icon: Gamepad2, description: 'Game Centre', mobile: true },
  {
    path: '/community',
    label: 'Community',
    icon: MessageCircle,
    description: 'Community destination',
    mobile: true,
  },
  { path: '/profile', label: 'Profile', icon: UserRound, description: 'Sign in and account' },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Local appearance controls',
  },
  { path: '/admin', label: 'Admin', icon: Shield, description: 'Restricted administration' },
];

const pick = (paths: string[]) => paths.map((path) => routes.find((route) => route.path === path)!);

/** The five links in the top bar. */
export const mainRoutes = pick(['/', '/watch', '/videos', '/games', '/community']);

/** Everything else: the phone menu and the page footer (Admin only for admins). */
export const moreRoutes = pick(['/profile', '/settings', '/admin']);

/** Finds a section by name (kept for links and tests). */
export function findDestination(term: string): AppRoute | undefined {
  const normalized = term.trim().toLowerCase();
  return routes.find(
    (route) =>
      route.label.toLowerCase() === normalized ||
      route.path.slice(1).toLowerCase() === normalized ||
      (normalized === 'game centre' && route.path === '/games'),
  );
}
