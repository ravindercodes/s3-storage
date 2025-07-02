import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '../types';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (!path) return [{ name: 'Home', path: '' }];
    
    const parts = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ name: 'Home', path: '' }];
    
    let currentPath = '';
    parts.forEach((part) => {
      currentPath += `${part}/`;
      items.push({ name: part, path: currentPath });
    });
    
    return items;
  };

  const items = getBreadcrumbItems();

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600 mb-4">
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          <button
            onClick={() => onNavigate(item.path)}
            className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
              index === items.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {index === 0 && <Home className="w-4 h-4" />}
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}