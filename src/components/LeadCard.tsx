import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Phone,
  Globe,
  MapPin,
  Star,
  Copy,
  Check,
  ChevronDown,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  problem_type: string | null;
  urgency_score: number | null;
  summary: string | null;
  outreach_message: string | null;
}

interface Review {
  id: string;
  text: string;
  rating: number | null;
  author_name: string | null;
}

interface Lead {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  analyses: Analysis[];
  reviews: Review[];
}

interface LeadCardProps {
  lead: Lead;
}

const getUrgencyColor = (score: number | null) => {
  if (!score) return 'bg-muted text-muted-foreground';
  if (score >= 7) return 'bg-destructive/20 text-destructive border-destructive/30';
  if (score >= 4) return 'bg-warning/20 text-warning border-warning/30';
  return 'bg-success/20 text-success border-success/30';
};

const getUrgencyLabel = (score: number | null) => {
  if (!score) return 'Unknown';
  if (score >= 7) return 'High Priority';
  if (score >= 4) return 'Medium Priority';
  return 'Low Priority';
};

const getRatingStars = (rating: number | null) => {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating
              ? 'fill-yellow-500 text-yellow-500'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
};

export function LeadCard({ lead }: LeadCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  const analysis = lead.analyses?.[0];

  const copyOutreachMessage = async () => {
    if (!analysis?.outreach_message) return;
    
    await navigator.clipboard.writeText(analysis.outreach_message);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Outreach message copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="animate-slide-up border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/30 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold leading-tight">{lead.name}</h3>
            {lead.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{lead.address}</span>
              </div>
            )}
          </div>
          {analysis?.urgency_score && (
            <Badge
              variant="outline"
              className={`shrink-0 ${getUrgencyColor(analysis.urgency_score)}`}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              {analysis.urgency_score}/10
            </Badge>
          )}
        </div>

        {/* Rating and Review Count */}
        <div className="flex items-center gap-4 pt-2">
          {getRatingStars(lead.rating)}
          {lead.review_count && (
            <span className="text-sm text-muted-foreground">
              ({lead.review_count} reviews)
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm transition-colors hover:bg-secondary/80"
            >
              <Phone className="h-3 w-3" />
              {lead.phone}
            </a>
          )}
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm transition-colors hover:bg-secondary/80"
            >
              <Globe className="h-3 w-3" />
              Website
            </a>
          )}
        </div>

        {/* Problem Badge */}
        {analysis?.problem_type && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              {analysis.problem_type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {getUrgencyLabel(analysis.urgency_score)}
            </span>
          </div>
        )}

        {/* AI Summary */}
        {analysis?.summary && (
          <div className="rounded-lg border border-border/50 bg-background/50 p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">AI Analysis: </span>
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Reviews Collapsible */}
        {lead.reviews && lead.reviews.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  View Reviews ({lead.reviews.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {lead.reviews.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-border/50 bg-background/50 p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {review.author_name && (
                      <span className="text-sm font-medium">{review.author_name}</span>
                    )}
                    {review.rating && (
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= review.rating!
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Copy Outreach Message Button */}
        {analysis?.outreach_message && (
          <Button
            onClick={copyOutreachMessage}
            variant="outline"
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Outreach Message
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
