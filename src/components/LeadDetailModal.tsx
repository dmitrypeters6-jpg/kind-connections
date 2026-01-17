import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Phone,
  Globe,
  MapPin,
  Star,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Loader2,
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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

interface SavedLead {
  id: string;
  status: string;
  contacted_at: string | null;
  notes: string | null;
  cold_call_script: string | null;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function LeadDetailModal({ lead, isOpen, onClose, onSave }: LeadDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [savedLead, setSavedLead] = useState<SavedLead | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [coldScript, setColdScript] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [userServices, setUserServices] = useState<string[]>([]);

  useEffect(() => {
    if (lead && isOpen && user) {
      fetchSavedLead();
      fetchUserServices();
    }
  }, [lead, isOpen, user]);

  const fetchUserServices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('services')
      .eq('user_id', user.id)
      .single();
    
    if (data?.services) {
      setUserServices(data.services);
    }
  };

  const fetchSavedLead = async () => {
    if (!lead || !user) return;

    const { data } = await supabase
      .from('saved_leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('business_id', lead.id)
      .maybeSingle();

    if (data) {
      setSavedLead(data);
      setNotes(data.notes || '');
      setColdScript(data.cold_call_script);
    } else {
      setSavedLead(null);
      setNotes('');
      setColdScript(null);
    }
  };

  const handleSaveToSRM = async () => {
    if (!lead || !user) return;

    setIsLoading(true);
    try {
      if (savedLead) {
        // Update existing
        const { error } = await supabase
          .from('saved_leads')
          .update({ notes })
          .eq('id', savedLead.id);

        if (error) throw error;
        toast({ title: 'Lead updated!' });
      } else {
        // Insert new
        const { error } = await supabase
          .from('saved_leads')
          .insert({
            user_id: user.id,
            business_id: lead.id,
            status: 'new',
            notes,
          });

        if (error) throw error;
        toast({ title: 'Lead saved to CRM!' });
      }
      
      await fetchSavedLead();
      onSave();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to save lead.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkContacted = async () => {
    if (!savedLead || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_leads')
        .update({
          status: 'contacted',
          contacted_at: new Date().toISOString(),
        })
        .eq('id', savedLead.id);

      if (error) throw error;

      toast({ title: 'Marked as contacted!' });
      await fetchSavedLead();
      onSave();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!lead) return;

    const analysis = lead.analyses?.[0];
    
    setIsGeneratingScript(true);
    try {
      const response = await supabase.functions.invoke('generate-cold-script', {
        body: {
          business: {
            name: lead.name,
            phone: lead.phone,
            address: lead.address,
            problemType: analysis?.problem_type,
            summary: analysis?.summary,
          },
          userServices,
        },
      });

      if (response.error) throw response.error;

      const script = response.data?.script;
      if (script) {
        setColdScript(script);
        
        // Save script to saved_lead if exists
        if (savedLead) {
          await supabase
            .from('saved_leads')
            .update({ cold_call_script: script })
            .eq('id', savedLead.id);
        }

        toast({ title: 'Cold call script generated!' });
      }
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate script.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(null), 2000);
  };

  if (!lead) return null;

  const analysis = lead.analyses?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{lead.name}</DialogTitle>
              {lead.address && (
                <DialogDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {lead.address}
                </DialogDescription>
              )}
            </div>
            {analysis?.urgency_score && (
              <Badge
                variant="outline"
                className={`shrink-0 ${
                  analysis.urgency_score >= 7
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : analysis.urgency_score >= 4
                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                    : 'bg-green-500/20 text-green-500 border-green-500/30'
                }`}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Urgency: {analysis.urgency_score}/10
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="script">Cold Call Script</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="flex flex-wrap gap-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Phone className="h-4 w-4" />
                  {lead.phone}
                </a>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm transition-colors hover:bg-secondary/80"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              )}
            </div>

            {/* Rating */}
            {lead.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= lead.rating!
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{lead.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({lead.review_count} reviews)
                </span>
              </div>
            )}

            {/* Problem Analysis */}
            {analysis && (
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Communication Issue Detected
                </h4>
                {analysis.problem_type && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive">
                    {analysis.problem_type}
                  </Badge>
                )}
                {analysis.summary && (
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                )}
              </div>
            )}

            {/* Outreach Message */}
            {analysis?.outreach_message && (
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Quick Outreach Message
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(analysis.outreach_message!, 'outreach')}
                  >
                    {copied === 'outreach' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm">{analysis.outreach_message}</p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveToSRM} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : savedLead ? (
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                ) : (
                  <Bookmark className="mr-2 h-4 w-4" />
                )}
                {savedLead ? 'Update in CRM' : 'Save to CRM'}
              </Button>

              {savedLead && savedLead.status !== 'contacted' && (
                <Button variant="outline" onClick={handleMarkContacted} disabled={isLoading}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as Contacted
                </Button>
              )}

              {savedLead?.status === 'contacted' && (
                <Badge variant="secondary" className="py-2 px-3">
                  <Check className="mr-1 h-3 w-3" />
                  Contacted {savedLead.contacted_at && new Date(savedLead.contacted_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </TabsContent>

          {/* Cold Call Script Tab */}
          <TabsContent value="script" className="mt-4">
            <div className="space-y-4">
              {!coldScript ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <PhoneCall className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h4 className="font-medium mb-2">No Script Generated Yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a personalized cold call script based on this lead's 
                    communication issues and your services.
                  </p>
                  <Button onClick={handleGenerateScript} disabled={isGeneratingScript}>
                    {isGeneratingScript ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PhoneCall className="mr-2 h-4 w-4" />
                        Generate Cold Call Script
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Your Cold Call Script</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(coldScript, 'script')}
                      >
                        {copied === 'script' ? (
                          <Check className="mr-1 h-3 w-3" />
                        ) : (
                          <Copy className="mr-1 h-3 w-3" />
                        )}
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript}
                      >
                        {isGeneratingScript ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Regenerate'
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert rounded-lg border border-border/50 bg-card p-4 overflow-auto max-h-96">
                    <ReactMarkdown>{coldScript}</ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {lead.reviews && lead.reviews.length > 0 ? (
                lead.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-border/50 bg-card p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
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
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No reviews available
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
