import { Home, Video, Settings, Brain, Database, Shield } from 'lucide-react';

export const SidebarLinks = [
  {
    imgURL: '/icons/home.svg',
    route: '/',
    label: 'Home',
    icon: Home
  },
  {
    imgURL: '/icons/home.svg',
    route: '/settings',
    label: 'Settings',
    icon: Settings
  },
  {
    label: 'Replay',
    route: '/replay',
    icon: Video
  }
];

export const SettingsTabList = [
  {
    value: 'Cameras',
    label: 'Camera Setup'
  },
  {
    value: 'System',
    label: 'System & AI'
  },
  {
    value: 'General',
    label: 'Notifications'
  }
];

export const systemSettingsNav = [
  {
    id: 'inference',
    label: 'AI Detection',
    icon: Brain,
    description: 'Choose detection quality and alert sensitivity'
  },
  {
    id: 'storage',
    label: 'Video Storage',
    icon: Database,
    description: 'Set where videos are saved and how long to keep them'
  },
  {
    id: 'access',
    label: 'User Access',
    icon: Shield,
    description: 'Manage user accounts and permissions'
  }
];
