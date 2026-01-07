/**
 * SpotCheckList Component
 *
 * Displays a list of spot checks for a work session with status indicators
 */

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle, MapPin } from 'lucide-react';
import type { SpotCheck } from '../types';
import {
  SpotCheckStatus,
  SpotCheckStatusDisplayNames,
  SpotCheckStatusColors,
  SpotCheckTriggerType,
  SpotCheckTriggerTypeDisplayNames,
} from '../types';

interface SpotCheckListProps {
  spotChecks: SpotCheck[];
  loading?: boolean;
}

// Helper function to parse timestamp as Beijing time
const parseBeijingTime = (timestamp: string): Date => {
  return new Date(timestamp);
};

// Format time as HH:mm
const formatTime = (timestamp: string): string => {
  return parseBeijingTime(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get status icon
const getStatusIcon = (status: SpotCheckStatus) => {
  switch (status) {
    case SpotCheckStatus.PASSED:
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case SpotCheckStatus.MISSED:
      return <XCircle className="h-4 w-4 text-red-600" />;
    case SpotCheckStatus.PENDING:
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

// Get status badge styling
const getStatusBadgeClass = (status: SpotCheckStatus): string => {
  const colors = SpotCheckStatusColors[status] || SpotCheckStatusColors[SpotCheckStatus.PENDING];
  return `${colors.bg} ${colors.text} ${colors.border}`;
};

export default function SpotCheckList({ spotChecks, loading }: SpotCheckListProps) {
  // Sort spot checks by createdAt ascending (oldest first)
  const sortedSpotChecks = [...spotChecks].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3 p-2 bg-muted/30 rounded animate-pulse">
            <div className="h-4 w-4 bg-muted rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2 w-16 bg-muted rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!sortedSpotChecks || sortedSpotChecks.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无抽查记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        抽查记录 ({sortedSpotChecks.length}次)
      </div>
      {sortedSpotChecks.map((spotCheck, index) => (
        <div
          key={spotCheck.id}
          className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon(spotCheck.status as SpotCheckStatus)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                第{index + 1}次抽查
              </span>
              <Badge variant="outline" className="text-xs">
                {SpotCheckTriggerTypeDisplayNames[spotCheck.triggerType as SpotCheckTriggerType] || '未知'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>
                  触发: {formatTime(spotCheck.createdAt)}
                  {' → '}
                  截止: {formatTime(spotCheck.deadline)}
                </span>
              </div>
              {spotCheck.completedAt && (
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>完成: {formatTime(spotCheck.completedAt)}</span>
                </div>
              )}
              {spotCheck.latitude && spotCheck.longitude && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {spotCheck.latitude.toFixed(4)}, {spotCheck.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {spotCheck.failReason && (
                <div className="flex items-center space-x-1 text-red-600">
                  <XCircle className="h-3 w-3" />
                  <span>{spotCheck.failReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            <Badge className={getStatusBadgeClass(spotCheck.status as SpotCheckStatus)}>
              {SpotCheckStatusDisplayNames[spotCheck.status as SpotCheckStatus] || '未知'}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
