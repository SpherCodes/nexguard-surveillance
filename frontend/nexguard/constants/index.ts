import {
  Home,
  Video,
  Settings,
  Brain,
  Database,
  Shield,
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
    value: 'System',
    label: 'System',
  },
  {
    value: 'General',
    label: 'General',
  }
]

 export const systemSettingsNav = [
  { id: 'inference', label: 'Inference', icon: Brain },
  { id: 'storage', label: 'Storage', icon: Database },
  { id: 'access', label: 'Access Control', icon: Shield },
];
