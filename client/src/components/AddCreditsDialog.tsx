import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AddCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreditsAdded: (newBalance: number) => void;
}

// ZHI pricing tiers from user requirements
const ZHI_TIERS = [
  {
    name: 'ZHI 1',
    description: 'Basic tier - Best for light usage',
    packages: [
      { price: 5, credits: 4275000 },
      { price: 10, credits: 8977500 },
      { price: 25, credits: 23512500 },
      { price: 50, credits: 51300000 },
      { price: 100, credits: 115425000 },
    ]
  },
  {
    name: 'ZHI 2',
    description: 'Standard tier - Balanced option',
    packages: [
      { price: 5, credits: 106840 },
      { price: 10, credits: 224360 },
      { price: 25, credits: 587625 },
      { price: 50, credits: 1282100 },
      { price: 100, credits: 2883400 },
    ]
  },
  {
    name: 'ZHI 3',
    description: 'Professional tier - For regular users',
    packages: [
      { price: 5, credits: 702000 },
      { price: 10, credits: 1474200 },
      { price: 25, credits: 3861000 },
      { price: 50, credits: 8424000 },
      { price: 100, credits: 18954000 },
    ]
  },
  {
    name: 'ZHI 4',
    description: 'Premium tier - Maximum value',
    packages: [
      { price: 5, credits: 6410255 },
      { price: 10, credits: 13461530 },
      { price: 25, credits: 35256400 },
      { price: 50, credits: 76923050 },
      { price: 100, credits: 173176900 },
    ]
  },
];

export function AddCreditsDialog({ open, onOpenChange, onCreditsAdded }: AddCreditsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCredits = async (credits: number, price: number, tierName: string) => {
    setIsLoading(true);
    
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        toast({
          title: "Not authenticated",
          description: "Please log in to purchase credits.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          amount: credits,
          description: `${tierName} - $${price} package`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add credits');
      }

      const data = await response.json();
      onCreditsAdded(data.credits);
      
      toast({
        title: "Credits added!",
        description: `${credits.toLocaleString()} credits added to your account.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to add credits",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            Choose a credit package from our ZHI tiers. Credits are used for AI operations like chat, rewrite, and content generation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {ZHI_TIERS.map((tier) => (
            <Card key={tier.name}>
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {tier.packages.map((pkg) => (
                    <Button
                      key={pkg.price}
                      variant="outline"
                      className="flex flex-col h-auto py-3"
                      onClick={() => handleAddCredits(pkg.credits, pkg.price, tier.name)}
                      disabled={isLoading}
                      data-testid={`button-add-credits-${tier.name.toLowerCase()}-${pkg.price}`}
                    >
                      <span className="font-bold text-lg">${pkg.price}</span>
                      <span className="text-xs text-muted-foreground">
                        {pkg.credits.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">credits</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
