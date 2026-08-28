import { Card, CardContent, CardHeader } from "@freenary/ui/components/card";
import { Skeleton } from "@freenary/ui/components/skeleton";

export const SettingsPageSkeleton = () => (
  <div aria-busy="true" className="flex flex-1 flex-col gap-6 p-4">
    <output className="sr-only">Loading settings</output>
    <div aria-hidden="true" className="flex flex-1 flex-col gap-6">
      {/* Budget flow preview card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
      {/* Budgeting profile card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px]" />
        </CardContent>
      </Card>
      {/* Categories card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    </div>
  </div>
);
