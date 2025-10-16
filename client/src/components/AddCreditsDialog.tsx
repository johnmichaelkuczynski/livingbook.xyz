import { useState, useEffect } from 'react';
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
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

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

// Payment form component
function PaymentForm({ 
  credits, 
  price, 
  tierName, 
  onSuccess, 
  onCancel 
}: { 
  credits: number; 
  price: number; 
  tierName: string; 
  onSuccess: (newBalance: number) => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Add credits after successful payment
        // SECURITY: Only send paymentIntentId - server reads credits from Stripe metadata
        const sessionToken = localStorage.getItem('sessionToken');
        const response = await fetch('/api/credits/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Payment successful!",
            description: `${credits.toLocaleString()} credits added to your account.`,
          });
          onSuccess(data.credits);
        } else {
          throw new Error('Failed to add credits after payment');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Payment processing failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="text-sm text-gray-600">You're purchasing:</div>
        <div className="text-lg font-bold">{credits.toLocaleString()} credits</div>
        <div className="text-sm text-gray-600">{tierName} - ${price}</div>
      </div>
      
      <PaymentElement />
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? "Processing..." : `Pay $${price}`}
        </Button>
      </div>
    </form>
  );
}

export function AddCreditsDialog({ open, onOpenChange, onCreditsAdded }: AddCreditsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<{
    credits: number;
    price: number;
    tierName: string;
  } | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);

  // Map tier names to IDs for server validation
  const getTierId = (tierName: string): string => {
    return tierName.toLowerCase().replace(' ', '-');
  };

  const handleSelectPackage = async (credits: number, price: number, tierName: string) => {
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

      // Runtime check for Stripe configuration
      const stripe = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
        ? await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
        : null;
        
      if (!stripe) {
        toast({
          title: "Payment unavailable",
          description: "Stripe is not configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }
      
      // Store stripe instance for Elements component
      setStripeInstance(stripe);

      // SECURITY: Only send tier ID and package price - server looks up actual values
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          tierId: getTierId(tierName),
          packagePrice: price,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setSelectedPackage({ credits, price, tierName });
      
    } catch (error) {
      toast({
        title: "Failed to start payment",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (newBalance: number) => {
    onCreditsAdded(newBalance);
    setClientSecret(null);
    setSelectedPackage(null);
    setStripeInstance(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setClientSecret(null);
    setSelectedPackage(null);
    setStripeInstance(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clientSecret ? 'Complete Payment' : 'Add Credits'}</DialogTitle>
          <DialogDescription>
            {clientSecret 
              ? 'Enter your payment details to complete the purchase.'
              : 'Choose a credit package from our ZHI tiers. Credits are used for AI operations like chat, rewrite, and content generation.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {clientSecret && selectedPackage && stripeInstance ? (
          <Elements stripe={stripeInstance} options={{ clientSecret }}>
            <PaymentForm
              credits={selectedPackage.credits}
              price={selectedPackage.price}
              tierName={selectedPackage.tierName}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        ) : (
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
                        onClick={() => handleSelectPackage(pkg.credits, pkg.price, tier.name)}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
