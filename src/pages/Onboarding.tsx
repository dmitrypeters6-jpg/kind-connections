import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Target, Loader2, ArrowRight } from 'lucide-react';

const services = [
  { id: 'phone_systems', label: 'Phone Systems & VoIP', description: 'Business phone solutions' },
  { id: 'answering_service', label: 'Answering Services', description: '24/7 call answering' },
  { id: 'crm_software', label: 'CRM Software', description: 'Customer relationship management' },
  { id: 'marketing', label: 'Marketing & Advertising', description: 'Digital marketing services' },
  { id: 'seo', label: 'SEO & Local Search', description: 'Search engine optimization' },
  { id: 'reputation', label: 'Reputation Management', description: 'Online review management' },
  { id: 'scheduling', label: 'Scheduling Software', description: 'Appointment booking systems' },
  { id: 'chatbots', label: 'Chatbots & Live Chat', description: 'Automated customer support' },
  { id: 'sms_marketing', label: 'SMS Marketing', description: 'Text message campaigns' },
  { id: 'web_design', label: 'Web Design', description: 'Website development' },
  { id: 'social_media', label: 'Social Media Management', description: 'Social media marketing' },
  { id: 'other', label: 'Other Services', description: 'Custom solutions' },
];

export default function Onboarding() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleComplete = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: 'Select at least one service',
        description: 'Please select the services you offer to help personalize your experience.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          services: selectedServices,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Welcome to LeadScout AI!',
        description: 'Your profile has been set up successfully.',
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to LeadScout AI</h1>
          <p className="max-w-md text-muted-foreground">
            Tell us about the services you offer so we can personalize your lead 
            recommendations and cold call scripts.
          </p>
        </div>

        {/* Services Selection */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>What services do you offer?</CardTitle>
            <CardDescription>
              Select all that apply. This helps us generate better outreach messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                    selectedServices.includes(service.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border hover:bg-secondary/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label className="cursor-pointer font-medium">
                      {service.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={isLoading || selectedServices.length === 0}
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          You can update your services anytime in settings.
        </p>
      </div>
    </div>
  );
}
