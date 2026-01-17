import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Target, Zap, Brain, Download, ArrowRight, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold">LeadScout AI</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-4 w-4" />
            AI-Powered Lead Discovery
          </div>
          
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Find Local Businesses
            <br />
            <span className="text-primary">Struggling to Communicate</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            LeadScout AI analyzes reviews to find businesses with communication problems—
            unanswered calls, missed appointments, slow responses. Perfect leads for agencies 
            offering communication solutions.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Finding Leads
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-card/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-2 text-muted-foreground">
              Three simple steps to find your next clients
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">1. Search</h3>
              <p className="text-muted-foreground">
                Enter a business type and location. We'll find businesses in your target area.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">2. Analyze</h3>
              <p className="text-muted-foreground">
                AI scans reviews for communication red flags: missed calls, slow responses, no-shows.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">3. Export</h3>
              <p className="text-muted-foreground">
                Get a ranked lead list with urgency scores, contact info, and ready-to-send outreach messages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/30 bg-primary/5 p-12">
            <h2 className="text-3xl font-bold">Ready to Find Hot Leads?</h2>
            <p className="mt-4 text-muted-foreground">
              Start discovering businesses that need your help today.
            </p>
            <Button size="lg" className="mt-8" onClick={() => navigate('/auth')}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span>LeadScout AI</span>
          </div>
          <p>© 2024 LeadScout AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
