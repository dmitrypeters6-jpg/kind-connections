import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  problem_type: string | null;
  urgency_score: number | null;
  summary: string | null;
  outreach_message: string | null;
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
}

interface ExportButtonProps {
  leads: Lead[];
  searchInfo: {
    businessType: string;
    location: string;
  };
}

export function ExportButton({ leads, searchInfo }: ExportButtonProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (leads.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Run a search first to get leads to export.',
        variant: 'destructive',
      });
      return;
    }

    // CSV headers
    const headers = [
      'Business Name',
      'Address',
      'Phone',
      'Website',
      'Rating',
      'Review Count',
      'Problem Type',
      'Urgency Score',
      'AI Summary',
      'Outreach Message',
    ];

    // Convert leads to CSV rows
    const rows = leads.map((lead) => {
      const analysis = lead.analyses?.[0];
      return [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${(lead.address || '').replace(/"/g, '""')}"`,
        `"${lead.phone || ''}"`,
        `"${lead.website || ''}"`,
        lead.rating?.toString() || '',
        lead.review_count?.toString() || '',
        `"${(analysis?.problem_type || '').replace(/"/g, '""')}"`,
        analysis?.urgency_score?.toString() || '',
        `"${(analysis?.summary || '').replace(/"/g, '""')}"`,
        `"${(analysis?.outreach_message || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = `leadscout-${searchInfo.businessType}-${searchInfo.location.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export successful!',
      description: `${leads.length} leads exported to CSV`,
    });
  };

  return (
    <Button onClick={exportToCSV} variant="outline" disabled={leads.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV ({leads.length})
    </Button>
  );
}
