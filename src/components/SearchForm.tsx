import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MapPin, Building2, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (businessType: string, location: string, radius: number) => Promise<void>;
  isLoading: boolean;
}

const businessTypes = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'auto_repair', label: 'Auto Repair' },
  { value: 'real_estate', label: 'Real Estate Agent' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'contractor', label: 'General Contractor' },
  { value: 'painter', label: 'Painter' },
  { value: 'cleaner', label: 'Cleaning Service' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'moving', label: 'Moving Company' },
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState([10]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType || !location) return;
    await onSearch(businessType, location, radius[0]);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Find Leads
        </CardTitle>
        <CardDescription>
          Search for local businesses with communication problems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business-type" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Business Type
            </Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="business-type">
                <SelectValue placeholder="Select a business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              City / Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Austin, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Radius */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Search Radius
              </Label>
              <span className="text-sm font-medium text-primary">
                {radius[0]} miles
              </span>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 mi</span>
              <span>50 mi</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={!businessType || !location || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching & Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Leads
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
