-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create searches table
CREATE TABLE public.searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_type TEXT NOT NULL,
  location TEXT NOT NULL,
  radius INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  rating INTEGER,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analyses table
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  problem_type TEXT,
  urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 10),
  summary TEXT,
  outreach_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Searches policies
CREATE POLICY "Users can view their own searches"
ON public.searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches"
ON public.searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches"
ON public.searches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
ON public.searches FOR DELETE
USING (auth.uid() = user_id);

-- Businesses policies (access through search ownership)
CREATE POLICY "Users can view businesses from their searches"
ON public.businesses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.searches
    WHERE searches.id = businesses.search_id
    AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert businesses for their searches"
ON public.businesses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.searches
    WHERE searches.id = businesses.search_id
    AND searches.user_id = auth.uid()
  )
);

-- Reviews policies (access through business/search ownership)
CREATE POLICY "Users can view reviews from their businesses"
ON public.reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.searches ON searches.id = businesses.search_id
    WHERE businesses.id = reviews.business_id
    AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert reviews for their businesses"
ON public.reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.searches ON searches.id = businesses.search_id
    WHERE businesses.id = reviews.business_id
    AND searches.user_id = auth.uid()
  )
);

-- Analyses policies (access through business/search ownership)
CREATE POLICY "Users can view analyses from their businesses"
ON public.analyses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.searches ON searches.id = businesses.search_id
    WHERE businesses.id = analyses.business_id
    AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert analyses for their businesses"
ON public.analyses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.searches ON searches.id = businesses.search_id
    WHERE businesses.id = analyses.business_id
    AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update analyses for their businesses"
ON public.analyses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    JOIN public.searches ON searches.id = businesses.search_id
    WHERE businesses.id = analyses.business_id
    AND searches.user_id = auth.uid()
  )
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();