import {
  Compass,
  Gamepad2,
  Home,
  MessageCircle,
  Play,
  Clapperboard,
  Wrench,
  Trophy,
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
  { path: '/', label: 'Home', icon: Home, description: 'Welcome and platform overview', mobile: true },
  { path: '/explore', label: 'Explore', icon: Compass, description: 'Find the sections of B24DUL', mobile: true },
  { path: '/watch', label: 'Watch', icon: Play, description: 'Streaming destination', mobile: true },
  { path: '/videos', label: 'Videos', icon: Clapperboard, description: 'Video archive destination' },
  { path: '/games', label: 'Games', icon: Gamepad2, description: 'Game Centre', mobile: true },
  { path: '/community', label: 'Community', icon: MessageCircle, description: 'Community destination', mobile: true },
  { path: '/tools', label: 'Tools', icon: Wrench, description: 'Planned utilities' },
  { path: '/competitions', label: 'Competitions', icon: Trophy, description: 'Challenges and rankings' },
  { path: '/profile', label: 'Profile', icon: UserRound, description: 'Guest profile information' },
  { path: '/settings', label: 'Settings', icon: Settings, description: 'Local appearance controls' },
  { path: '/admin', label: 'Admin', icon: Shield, description: 'Restricted administration' },
];

export const mobileRoutes = routes.filter((route) => route.mobile);

export function findDestination(term: string): AppRoute | undefined {
  const normalized = term.trim().toLowerCase();
  return routes.find(
    (route) =>
      route.label.toLowerCase() === normalized ||
      route.path.slice(1).toLowerCase() === normalized ||
      (normalized === 'game centre' && route.path === '/games'),
  );
}
