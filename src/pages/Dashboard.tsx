import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { SearchForm } from '@/components/SearchForm';
import { RecentSearches } from '@/components/RecentSearches';
import { LeadCard } from '@/components/LeadCard';
import { LeadFilters } from '@/components/LeadFilters';
import { ExportButton } from '@/components/ExportButton';
import { generateMockBusinesses, MockBusiness } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Search {
  id: string;
  business_type: string;
  location: string;
  radius: number;
  status: string;
  created_at: string;
}

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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searches, setSearches] = useState<Search[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchInfo, setCurrentSearchInfo] = useState({ businessType: '', location: '' });
  const [viewingResults, setViewingResults] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [problemFilter, setProblemFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency-desc');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSearches();
    }
  }, [user]);

  const fetchSearches = async () => {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching searches:', error);
    } else {
      setSearches(data || []);
    }
  };

  const fetchLeadsForSearch = async (searchId: string): Promise<Lead[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        analyses (*),
        reviews (*)
      `)
      .eq('search_id', searchId);

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }

    // Transform the data to match our Lead interface
    return (data || []).map((business) => ({
      id: business.id,
      name: business.name,
      address: business.address,
      phone: business.phone,
      website: business.website,
      rating: business.rating ? Number(business.rating) : null,
      review_count: business.review_count,
      analyses: Array.isArray(business.analyses) ? business.analyses : (business.analyses ? [business.analyses] : []),
      reviews: Array.isArray(business.reviews) ? business.reviews : (business.reviews ? [business.reviews] : [])
    }));
  };

  const handleSearch = async (businessType: string, location: string, radius: number) => {
    if (!user) return;

    setIsSearching(true);
    setProgress(0);
    setProgressText('Creating search...');
    setCurrentSearchInfo({ businessType, location });

    try {
      // Create search record
      const { data: searchData, error: searchError } = await supabase
        .from('searches')
        .insert({
          user_id: user.id,
          business_type: businessType,
          location: location,
          radius: radius,
          status: 'processing'
        })
        .select()
        .single();

      if (searchError) throw searchError;

      setProgress(10);
      setProgressText('Searching for real businesses via Firecrawl...');

      // Try to fetch real businesses using Firecrawl
      let businesses: MockBusiness[] = [];
      let useRealData = false;

      try {
        const searchResponse = await supabase.functions.invoke('search-businesses', {
          body: {
            businessType,
            location,
            limit: 10
          }
        });

        if (searchResponse.data?.success && searchResponse.data?.businesses?.length > 0) {
          businesses = searchResponse.data.businesses;
          useRealData = true;
          console.log('Using real data from Firecrawl:', businesses.length, 'businesses');
        } else {
          console.log('Firecrawl returned no results, falling back to mock data');
          businesses = generateMockBusinesses(businessType, location, 10);
        }
      } catch (firecrawlError) {
        console.error('Firecrawl error, falling back to mock data:', firecrawlError);
        businesses = generateMockBusinesses(businessType, location, 10);
      }

      setProgress(20);
      setProgressText(useRealData ? 'Saving real businesses to database...' : 'Saving businesses to database...');

      // Insert businesses
      const businessInserts = businesses.map(b => ({
        search_id: searchData.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        website: b.website,
        rating: b.rating,
        review_count: b.reviewCount
      }));

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert(businessInserts)
        .select();

      if (businessError) throw businessError;

      setProgress(30);
      setProgressText('Saving reviews...');

      // Insert reviews for each business
      const reviewInserts: { business_id: string; text: string; rating: number | null; author_name: string | null }[] = [];
      businesses.forEach((mock, index) => {
        if (mock.reviews && businessData[index]) {
          mock.reviews.forEach(review => {
            reviewInserts.push({
              business_id: businessData[index].id,
              text: review.text,
              rating: review.rating,
              author_name: review.authorName
            });
          });
        }
      });

      if (reviewInserts.length > 0) {
        const { error: reviewError } = await supabase
          .from('reviews')
          .insert(reviewInserts);

        if (reviewError) throw reviewError;
      }

      setProgress(40);
      setProgressText('Analyzing reviews with AI...');

      // Analyze each business with AI
      const analysisPromises = businessData.map(async (business, index) => {
        const mockBusiness = businesses[index];
        
        try {
          const response = await supabase.functions.invoke('analyze-reviews', {
            body: {
              business: {
                name: business.name,
                reviews: mockBusiness?.reviews || []
              }
            }
          });

          if (response.error) {
            console.error('Analysis error:', response.error);
            return null;
          }

          const analysis = response.data?.analysis;
          if (analysis) {
            const { error: analysisError } = await supabase
              .from('analyses')
              .insert({
                business_id: business.id,
                problem_type: analysis.problemType,
                urgency_score: analysis.urgencyScore,
                summary: analysis.summary,
                outreach_message: analysis.outreachMessage
              });

            if (analysisError) {
              console.error('Error saving analysis:', analysisError);
            }
          }

          // Update progress
          const progressIncrement = 50 / businessData.length;
          setProgress(prev => Math.min(prev + progressIncrement, 90));
          setProgressText(`Analyzing ${index + 1} of ${businessData.length} businesses...`);

          return analysis;
        } catch (err) {
          console.error('Analysis failed for business:', business.name, err);
          return null;
        }
      });

      await Promise.all(analysisPromises);

      setProgress(95);
      setProgressText('Finalizing...');

      // Update search status
      await supabase
        .from('searches')
        .update({ status: 'completed' })
        .eq('id', searchData.id);

      setProgress(100);
      setProgressText('Complete!');

      // Fetch the complete leads with analyses
      const completeLeads = await fetchLeadsForSearch(searchData.id);
      setLeads(completeLeads);
      setViewingResults(true);

      // Refresh searches list
      await fetchSearches();

      toast({
        title: 'Search complete!',
        description: `Found ${completeLeads.length} leads with AI analysis.`
      });

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
      setProgress(0);
      setProgressText('');
    }
  };

  const handleViewResults = async (searchId: string) => {
    const search = searches.find(s => s.id === searchId);
    if (search) {
      setCurrentSearchInfo({
        businessType: search.business_type,
        location: search.location
      });
    }

    const fetchedLeads = await fetchLeadsForSearch(searchId);
    setLeads(fetchedLeads);
    setViewingResults(true);
  };

  const handleRerun = async (search: Search) => {
    await handleSearch(search.business_type, search.location, search.radius);
  };

  const handleBackToDashboard = () => {
    setViewingResults(false);
    setLeads([]);
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Apply urgency filter
    if (urgencyFilter !== 'all') {
      result = result.filter(lead => {
        const score = lead.analyses?.[0]?.urgency_score;
        if (!score) return false;
        if (urgencyFilter === 'high') return score >= 7;
        if (urgencyFilter === 'medium') return score >= 4 && score < 7;
        if (urgencyFilter === 'low') return score < 4;
        return true;
      });
    }

    // Apply problem filter
    if (problemFilter !== 'all') {
      result = result.filter(lead => {
        const problemType = lead.analyses?.[0]?.problem_type;
        return problemType === problemFilter;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const aScore = a.analyses?.[0]?.urgency_score || 0;
      const bScore = b.analyses?.[0]?.urgency_score || 0;
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;

      switch (sortBy) {
        case 'urgency-desc':
          return bScore - aScore;
        case 'urgency-asc':
          return aScore - bScore;
        case 'rating-asc':
          return aRating - bRating;
        case 'rating-desc':
          return bRating - aRating;
        default:
          return 0;
      }
    });

    return result;
  }, [leads, urgencyFilter, problemFilter, sortBy]);

  // Get unique problem types for filter
  const problemTypes = useMemo(() => {
    const types = new Set<string>();
    leads.forEach(lead => {
      const problemType = lead.analyses?.[0]?.problem_type;
      if (problemType) types.add(problemType);
    });
    return Array.from(types);
  }, [leads]);

  if (authLoading) {
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
        {/* Loading overlay */}
        {isSearching && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-2xl">
              <div className="flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse-glow">
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold">Analyzing Leads</h3>
                <p className="text-sm text-muted-foreground">{progressText}</p>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>
        )}

        {viewingResults ? (
          /* Results View */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleBackToDashboard}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">
                    {currentSearchInfo.businessType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} in {currentSearchInfo.location}
                  </h1>
                  <p className="text-muted-foreground">
                    {leads.length} leads found
                  </p>
                </div>
              </div>
              <ExportButton leads={filteredLeads} searchInfo={currentSearchInfo} />
            </div>

            <LeadFilters
              urgencyFilter={urgencyFilter}
              setUrgencyFilter={setUrgencyFilter}
              problemFilter={problemFilter}
              setProblemFilter={setProblemFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              problemTypes={problemTypes}
              totalCount={leads.length}
              filteredCount={filteredLeads.length}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>

            {filteredLeads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No leads match your current filters.
                </p>
                <Button variant="link" onClick={() => {
                  setUrgencyFilter('all');
                  setProblemFilter('all');
                }}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Dashboard View */
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold">
                  Find Your Next <span className="text-primary">Hot Leads</span>
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Discover local businesses struggling with communication—and offer them a solution.
                </p>
              </div>
              <SearchForm onSearch={handleSearch} isLoading={isSearching} />
            </div>
            <div>
              <RecentSearches
                searches={searches}
                onRerun={handleRerun}
                onViewResults={handleViewResults}
                isLoading={isSearching}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
