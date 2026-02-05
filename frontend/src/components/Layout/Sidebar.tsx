import React from 'react';
import { useStore } from '../../store/useStore';

interface SidebarProps {
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { sidebarCollapsed } = useStore();

  return (
    <div
      className={`bg-gray-800 border-r border-gray-700 transition-all duration-200 ${
        sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
      }`}
    >
      {children}
    </div>
  );
};