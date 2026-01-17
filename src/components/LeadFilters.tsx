import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, SortAsc, X } from 'lucide-react';

interface LeadFiltersProps {
  urgencyFilter: string;
  setUrgencyFilter: (value: string) => void;
  problemFilter: string;
  setProblemFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  problemTypes: string[];
  totalCount: number;
  filteredCount: number;
}

export function LeadFilters({
  urgencyFilter,
  setUrgencyFilter,
  problemFilter,
  setProblemFilter,
  sortBy,
  setSortBy,
  problemTypes,
  totalCount,
  filteredCount,
}: LeadFiltersProps) {
  const hasFilters = urgencyFilter !== 'all' || problemFilter !== 'all';

  const clearFilters = () => {
    setUrgencyFilter('all');
    setProblemFilter('all');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Urgency Filter */}
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="high">High (7-10)</SelectItem>
            <SelectItem value="medium">Medium (4-6)</SelectItem>
            <SelectItem value="low">Low (1-3)</SelectItem>
          </SelectContent>
        </Select>

        {/* Problem Type Filter */}
        <Select value={problemFilter} onValueChange={setProblemFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Problem Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Problems</SelectItem>
            {problemTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency-desc">Urgency (High first)</SelectItem>
              <SelectItem value="urgency-asc">Urgency (Low first)</SelectItem>
              <SelectItem value="rating-asc">Rating (Low first)</SelectItem>
              <SelectItem value="rating-desc">Rating (High first)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {filteredCount} of {totalCount} leads
        </Badge>
        {hasFilters && (
          <span className="text-sm text-muted-foreground">
            (filtered)
          </span>
        )}
      </div>
    </div>
  );
}
