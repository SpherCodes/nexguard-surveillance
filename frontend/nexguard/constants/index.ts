import {
  Home,
  Video,
  Settings,
} from 'lucide-react';

export const SidebarLinks = [
  {
    imgURL: '/icons/home.svg',
    route: '/',
    label: 'Home',
    icon: Home,
  },
  {
    imgURL: '/icons/home.svg',
    route: '/settings',
    label: 'Settings',
    icon: Settings,
  },
  {
    label: 'Events',
    route: '/events',
    icon: Video,
  }

];

export const SettingsTabList = [
  {
    value: 'Cameras',
    label: 'Cameras',
  },
  {
    value: 'Inference',
    label: 'Inference',
  },
  {
    value: 'System',
    label: 'System',
  },
  {
    value: 'General',
    label: 'General',
  }
]
