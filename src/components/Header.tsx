import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  earthEngineStatus?: 'loading' | 'connected' | 'error' | 'checking';
}

const Header: React.FC<HeaderProps> = ({ earthEngineStatus = 'loading' }) => {
  const getRealTimeDataBadgeClass = () => {
    switch (earthEngineStatus) {
      case 'connected':
        return 'bg-green-500/10 text-green-600 border-green-500/30 text-xs px-2 py-0.5';
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/30 text-xs px-2 py-0.5';
      case 'checking':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs px-2 py-0.5';
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs px-2 py-0.5';
    }
  };

  return (
    <div className="bg-transparent border-none shadow-none h-16 flex items-center px-4">
      <div className="flex items-center justify-between w-full gap-4 flex-wrap">
        
        {/* Left Section - Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-gradient-ocean flex items-center justify-center flex-shrink-0">
            <div className="w-5 h-5 text-white font-bold">🌊</div>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              Geospatial Disaster Analysis
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Natural disaster impact assessment and vulnerability analysis
            </p>
          </div>
        </div>

        {/* Right Section - Badges + Settings */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/30 text-xs px-2 py-0.5"
          >
            Google Earth Engine
          </Badge>
          <Badge
            variant="outline"
            className={getRealTimeDataBadgeClass()}
          >
            Real-time Data
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Settings
          </Button>
        </div>
        
      </div>
    </div>
  );
};

export default Header;
