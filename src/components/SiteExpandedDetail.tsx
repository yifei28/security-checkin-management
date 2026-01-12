/**
 * SiteExpandedDetail Component
 *
 * Displays expanded detail view for a site in the site management table.
 * Contains:
 * - Statistics cards (on-duty count, check-in rate)
 * - Map with site location and optional on-duty guards
 * - Weekly report generator
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Percent, MapPin, Settings } from 'lucide-react';
import type { Site, SiteDetailData, CheckinLocation } from '@/types';
import { sitesApi } from '@/api/sitesApi';
import SiteDetailMap from './SiteDetailMap';
import SiteReportGenerator from './SiteReportGenerator';
import LocationManagementDialog from './LocationManagementDialog';

interface SiteExpandedDetailProps {
  site: Site;
  details?: SiteDetailData;
  loading?: boolean;
}

export default function SiteExpandedDetail({
  site,
  details,
  loading = false,
}: SiteExpandedDetailProps) {
  const [showOnDutyMarkers, setShowOnDutyMarkers] = useState(true);
  const [locations, setLocations] = useState<CheckinLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  // Fetch locations for this site
  const fetchLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const response = await sitesApi.getLocations(site.id);
      if (response.success && response.data) {
        setLocations(response.data);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('[SiteExpandedDetail] Failed to load locations:', error);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, [site.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              在岗人数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {details?.onDutyCount || 0}/{details?.totalGuards || 0}
            </div>
            <p className="text-xs text-muted-foreground">人正在工作</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              打卡率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {details?.checkinRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">今日签到率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              签到地点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {locationsLoading ? '-' : locations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setLocationDialogOpen(true)}
              >
                <Settings className="h-3 w-3 mr-1" />
                管理地点
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Map Area */}
      <div className="bg-background rounded-lg p-4 border">
        <SiteDetailMap
          site={site}
          locations={locations}
          onDutyGuards={showOnDutyMarkers ? details?.onDutyGuards : []}
          showOnDutyMarkers={showOnDutyMarkers}
          onToggleOnDutyMarkers={() => setShowOnDutyMarkers(!showOnDutyMarkers)}
        />
      </div>

      {/* Report Generator */}
      <div className="bg-background rounded-lg p-4 border">
        <SiteReportGenerator site={site} />
      </div>

      {/* Location Management Dialog */}
      <LocationManagementDialog
        site={site}
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        onLocationsUpdated={fetchLocations}
      />
    </div>
  );
}
