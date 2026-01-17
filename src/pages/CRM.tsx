import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { LeadDetailModal } from '@/components/LeadDetailModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  Star,
  Check,
  Clock,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  analyses: {
    problem_type: string | null;
    urgency_score: number | null;
    summary: string | null;
    outreach_message: string | null;
  } | {
    problem_type: string | null;
    urgency_score: number | null;
    summary: string | null;
    outreach_message: string | null;
  }[];
  reviews: {
    id: string;
    text: string;
    rating: number | null;
    author_name: string | null;
  } | {
    id: string;
    text: string;
    rating: number | null;
    author_name: string | null;
  }[];
}

interface SavedLead {
  id: string;
  user_id: string;
  business_id: string;
  status: string;
  contacted_at: string | null;
  notes: string | null;
  cold_call_script: string | null;
  created_at: string;
  businesses: Business;
}

export default function CRM() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchSavedLeads();
    }
  }, [user, authLoading, navigate]);

  const fetchSavedLeads = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_leads')
        .select(`
          *,
          businesses (
            *,
            analyses (*),
            reviews (*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedLeads(data || []);
    } catch (error) {
      console.error('Error fetching saved leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch saved leads.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('saved_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast({ title: 'Lead removed from CRM' });
      fetchSavedLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove lead.',
        variant: 'destructive',
      });
    }
  };

  const openLeadModal = (savedLead: SavedLead) => {
    setSelectedLead(savedLead);
    setIsModalOpen(true);
  };

  const filteredLeads = savedLeads.filter(lead => {
    const matchesSearch = 
      lead.businesses.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.businesses.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: savedLeads.length,
    new: savedLeads.filter(l => l.status === 'new').length,
    contacted: savedLeads.filter(l => l.status === 'contacted').length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Briefcase className="h-8 w-8 text-primary" />
              My CRM
            </h1>
            <p className="text-muted-foreground">Track and manage your saved leads</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>Total Leads</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>New Leads</CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{stats.new}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>Contacted</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.contacted}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Grid */}
        {filteredLeads.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No leads saved yet</h3>
              <p className="text-muted-foreground mb-4">
                Start searching for leads and save them to your CRM.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Find Leads
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((savedLead) => {
              const business = savedLead.businesses;
              const analysis = business.analyses?.[0];

              return (
                <Card
                  key={savedLead.id}
                  className="border-border/50 bg-card/50 cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg"
                  onClick={() => openLeadModal(savedLead)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg leading-tight">{business.name}</CardTitle>
                        {business.address && (
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {business.address}
                          </CardDescription>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          savedLead.status === 'contacted'
                            ? 'bg-green-500/20 text-green-500 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                        }
                      >
                        {savedLead.status === 'contacted' ? (
                          <Check className="mr-1 h-3 w-3" />
                        ) : (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {savedLead.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Rating */}
                    {business.rating && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= business.rating!
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm">{business.rating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Problem Badge */}
                    {analysis?.problem_type && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {analysis.problem_type}
                        </Badge>
                        {analysis.urgency_score && (
                          <span className="text-xs text-muted-foreground">
                            Urgency: {analysis.urgency_score}/10
                          </span>
                        )}
                      </div>
                    )}

                    {/* Contact Info */}
                    {business.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {business.phone}
                      </div>
                    )}

                    {/* Notes preview */}
                    {savedLead.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        Notes: {savedLead.notes}
                      </p>
                    )}

                    {/* Delete button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteLead(savedLead.id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Lead Detail Modal */}
        {selectedLead && (
          <LeadDetailModal
            lead={{
              id: selectedLead.businesses.id,
              name: selectedLead.businesses.name,
              address: selectedLead.businesses.address,
              phone: selectedLead.businesses.phone,
              website: selectedLead.businesses.website,
              rating: selectedLead.businesses.rating ? Number(selectedLead.businesses.rating) : null,
              review_count: selectedLead.businesses.review_count,
              analyses: Array.isArray(selectedLead.businesses.analyses) 
                ? selectedLead.businesses.analyses 
                : selectedLead.businesses.analyses ? [selectedLead.businesses.analyses] : [],
              reviews: Array.isArray(selectedLead.businesses.reviews)
                ? selectedLead.businesses.reviews
                : selectedLead.businesses.reviews ? [selectedLead.businesses.reviews] : [],
            }}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedLead(null);
            }}
            onSave={fetchSavedLeads}
          />
        )}
      </main>
    </div>
  );
}
