-- Add credits to profiles
ALTER TABLE public.profiles ADD COLUMN credits INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN services TEXT[];
ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Create saved_leads table for CRM
CREATE TABLE public.saved_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  contacted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cold_call_script TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Enable RLS
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;

-- Saved leads policies
CREATE POLICY "Users can view their own saved leads"
ON public.saved_leads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved leads"
ON public.saved_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved leads"
ON public.saved_leads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved leads"
ON public.saved_leads FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updating saved_leads timestamps
CREATE TRIGGER update_saved_leads_updated_at
BEFORE UPDATE ON public.saved_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Admin can view all profiles (for credit management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));