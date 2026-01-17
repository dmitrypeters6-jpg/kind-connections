import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, MapPin, Building2, ArrowRight, Loader2 } from 'lucide-react';

interface Search {
  id: string;
  business_type: string;
  location: string;
  radius: number;
  status: string;
  created_at: string;
}

interface RecentSearchesProps {
  searches: Search[];
  onRerun: (search: Search) => void;
  onViewResults: (searchId: string) => void;
  isLoading: boolean;
}

const formatBusinessType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function RecentSearches({ searches, onRerun, onViewResults, isLoading }: RecentSearchesProps) {
  if (searches.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Recent Searches
          </CardTitle>
          <CardDescription>
            Your search history will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No searches yet. Start by searching for leads above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Recent Searches
        </CardTitle>
        <CardDescription>
          Re-run or view results from previous searches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {searches.slice(0, 5).map((search) => (
          <div
            key={search.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-background"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{formatBusinessType(search.business_type)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{search.location}</span>
                <span>•</span>
                <span>{search.radius} miles</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              {search.status === 'completed' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewResults(search.id)}
                >
                  View Results
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRerun(search)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Re-run'
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
