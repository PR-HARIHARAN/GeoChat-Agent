import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DataPanelProps {
  title: string;
  data?: {
    totalBuildings?: number;
    damagedBuildings?: number;
    sviScore?: number;
    floodRisk?: 'Low' | 'Medium' | 'High';
    analysisComplete?: boolean;
  };
}

const DataPanel: React.FC<DataPanelProps> = ({ title, data }) => {
  const damagePercentage = data?.totalBuildings && data?.damagedBuildings 
    ? (data.damagedBuildings / data.totalBuildings) * 100 
    : 0;

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'High': return 'bg-destructive text-destructive-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSviColor = (score?: number) => {
    if (!score) return 'bg-muted';
    if (score > 0.75) return 'bg-destructive';
    if (score > 0.5) return 'bg-warning';
    if (score > 0.25) return 'bg-accent';
    return 'bg-secondary';
  };

  return (
    <div className="bg-transparent border-none shadow-none">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-medium text-foreground">{title}</span>
          {data?.analysisComplete && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Complete
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
        {data ? (
          <>
            {/* Building Damage Stats */}
            {data.totalBuildings && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Building Damage</span>
                  <span className="text-foreground font-medium">
                    {data.damagedBuildings?.toLocaleString()} / {data.totalBuildings.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={damagePercentage} 
                  className="h-2 bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  {damagePercentage.toFixed(1)}% of buildings affected
                </p>
              </div>
            )}

            {/* Social Vulnerability Index */}
            {data.sviScore !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Social Vulnerability Index</span>
                  <Badge className={getSviColor(data.sviScore)}>
                    {(data.sviScore * 100).toFixed(0)}%
                  </Badge>
                </div>
                <Progress 
                  value={data.sviScore * 100} 
                  className="h-2 bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  {data.sviScore > 0.75 ? 'Very High' : 
                   data.sviScore > 0.5 ? 'High' : 
                   data.sviScore > 0.25 ? 'Moderate' : 'Low'} vulnerability
                </p>
              </div>
            )}

            {/* Flood Risk Assessment */}
            {data.floodRisk && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Flood Risk Level</span>
                  <Badge className={getRiskColor(data.floodRisk)}>
                    {data.floodRisk}
                  </Badge>
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Key Insights:</p>
              <ul className="text-xs text-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  High concentration of damage in vulnerable areas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-accent rounded-full"></div>
                  Correlation between SVI and impact severity
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-secondary rounded-full"></div>
                  Infrastructure resilience varies by region
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Run an analysis query to see detailed results here
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default DataPanel;