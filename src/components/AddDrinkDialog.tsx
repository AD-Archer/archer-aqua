import { useState } from 'react';
import { DrinkType, DRINK_HYDRATION_MULTIPLIERS } from '@/types/water';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Droplet, Coffee, Wine, Grape, Zap, Milk, Battery } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDrink: (type: DrinkType, amount: number) => void;
}

const DRINK_OPTIONS: Array<{
  type: DrinkType;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { type: 'water', label: 'Water', icon: <Droplet className="h-5 w-5" />, color: 'primary' },
  { type: 'sports_drink', label: 'Sports', icon: <Zap className="h-5 w-5" />, color: 'primary' },
  { type: 'milk', label: 'Milk', icon: <Milk className="h-5 w-5" />, color: 'secondary' },
  { type: 'tea', label: 'Tea', icon: <Coffee className="h-5 w-5" />, color: 'secondary' },
  { type: 'juice', label: 'Juice', icon: <Grape className="h-5 w-5" />, color: 'accent' },
  { type: 'coffee', label: 'Coffee', icon: <Coffee className="h-5 w-5" />, color: 'muted' },
  { type: 'soda', label: 'Soda', icon: <Zap className="h-5 w-5" />, color: 'muted' },
  { type: 'energy_drink', label: 'Energy', icon: <Battery className="h-5 w-5" />, color: 'destructive' },
  { type: 'alcohol', label: 'Alcohol', icon: <Wine className="h-5 w-5" />, color: 'destructive' },
];

const AMOUNT_OPTIONS = [250, 330, 500, 750];

export function AddDrinkDialog({ open, onOpenChange, onAddDrink }: AddDrinkDialogProps) {
  const [selectedType, setSelectedType] = useState<DrinkType>('water');
  const [selectedAmount, setSelectedAmount] = useState(250);

  const handleAdd = () => {
    onAddDrink(selectedType, selectedAmount);
    onOpenChange(false);
  };

  const multiplier = DRINK_HYDRATION_MULTIPLIERS[selectedType];
  const hydrationValue = selectedAmount * multiplier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Drink</DialogTitle>
          <DialogDescription>
            Select the type and amount of your drink
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Drink Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Drink Type</label>
            <div className="grid grid-cols-3 gap-2">
              {DRINK_OPTIONS.map((option) => (
                <Button
                  key={option.type}
                  variant={selectedType === option.type ? 'default' : 'outline'}
                  className={cn(
                    "flex flex-col h-auto py-3 gap-1",
                    selectedType === option.type && "bg-gradient-water"
                  )}
                  onClick={() => setSelectedType(option.type)}
                >
                  {option.icon}
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNT_OPTIONS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? 'default' : 'outline'}
                  className={selectedAmount === amount ? "bg-gradient-water" : ""}
                  onClick={() => setSelectedAmount(amount)}
                >
                  {amount}ml
                </Button>
              ))}
            </div>
          </div>

          {/* Hydration Impact */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="text-sm font-medium">Hydration Impact</div>
            <div className="text-2xl font-bold">
              {hydrationValue > 0 ? '+' : ''}{hydrationValue.toFixed(0)}ml
            </div>
            <div className="text-xs text-muted-foreground">
              {multiplier === 1 ? 'Full hydration value' :
               multiplier > 0 ? `${(multiplier * 100).toFixed(0)}% hydration value` :
               'Dehydrating effect'}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAdd} className="flex-1 bg-gradient-water">
            Add Drink
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
