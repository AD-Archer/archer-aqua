import { useState, useEffect } from 'react';
import { DrinkType, DRINK_HYDRATION_MULTIPLIERS, DRINK_COLORS, CustomDrinkType } from '@/types/water';
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
import { getCustomDrinks } from '@/lib/storage';

interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDrink: (type: DrinkType, amount: number, customDrinkId?: string) => void;
}

const DRINK_OPTIONS: Array<{
  type: DrinkType;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { type: 'water', label: 'Water', icon: <Droplet className="h-5 w-5" />, color: DRINK_COLORS.water },
  { type: 'sports_drink', label: 'Sports', icon: <Zap className="h-5 w-5" />, color: DRINK_COLORS.sports_drink },
  { type: 'milk', label: 'Milk', icon: <Milk className="h-5 w-5" />, color: DRINK_COLORS.milk },
  { type: 'tea', label: 'Tea', icon: <Coffee className="h-5 w-5" />, color: DRINK_COLORS.tea },
  { type: 'juice', label: 'Juice', icon: <Grape className="h-5 w-5" />, color: DRINK_COLORS.juice },
  { type: 'coffee', label: 'Coffee', icon: <Coffee className="h-5 w-5" />, color: DRINK_COLORS.coffee },
  { type: 'soda', label: 'Soda', icon: <Zap className="h-5 w-5" />, color: DRINK_COLORS.soda },
  { type: 'energy_drink', label: 'Energy', icon: <Battery className="h-5 w-5" />, color: DRINK_COLORS.energy_drink },
  { type: 'alcohol', label: 'Alcohol', icon: <Wine className="h-5 w-5" />, color: DRINK_COLORS.alcohol },
];

const AMOUNT_OPTIONS = [250, 330, 500, 750];

export function AddDrinkDialog({ open, onOpenChange, onAddDrink }: AddDrinkDialogProps) {
  const [selectedType, setSelectedType] = useState<DrinkType>('water');
  const [selectedAmount, setSelectedAmount] = useState(250);
  const [selectedCustomDrinkId, setSelectedCustomDrinkId] = useState<string | null>(null);
  const [customDrinks, setCustomDrinks] = useState<CustomDrinkType[]>([]);

  useEffect(() => {
    if (open) {
      setCustomDrinks(getCustomDrinks());
    }
  }, [open]);

  const handleAdd = () => {
    if (selectedType === 'custom' && selectedCustomDrinkId) {
      onAddDrink(selectedType, selectedAmount, selectedCustomDrinkId);
    } else {
      onAddDrink(selectedType, selectedAmount);
    }
    onOpenChange(false);
  };

  const handleSelectCustomDrink = (drinkId: string) => {
    setSelectedType('custom');
    setSelectedCustomDrinkId(drinkId);
  };

  const getMultiplier = () => {
    if (selectedType === 'custom' && selectedCustomDrinkId) {
      const customDrink = customDrinks.find(d => d.id === selectedCustomDrinkId);
      return customDrink?.hydrationMultiplier || 1.0;
    }
    return DRINK_HYDRATION_MULTIPLIERS[selectedType as Exclude<DrinkType, 'custom'>] || 1.0;
  };

  const multiplier = getMultiplier();
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
                  variant={selectedType === option.type && !selectedCustomDrinkId ? 'default' : 'outline'}
                  className={cn(
                    "flex flex-col h-auto py-3 gap-1 relative overflow-hidden",
                    selectedType === option.type && !selectedCustomDrinkId && "border-2"
                  )}
                  style={{
                    borderColor: selectedType === option.type && !selectedCustomDrinkId ? option.color : undefined,
                    backgroundColor: selectedType === option.type && !selectedCustomDrinkId ? `${option.color}15` : undefined,
                  }}
                  onClick={() => {
                    setSelectedType(option.type);
                    setSelectedCustomDrinkId(null);
                  }}
                >
                  <div style={{ color: option.color }}>
                    {option.icon}
                  </div>
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Drinks */}
          {customDrinks.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Custom Drinks</label>
              <div className="grid grid-cols-3 gap-2">
                {customDrinks.map((drink) => (
                  <Button
                    key={drink.id}
                    variant={selectedCustomDrinkId === drink.id ? 'default' : 'outline'}
                    className={cn(
                      "flex flex-col h-auto py-3 gap-1 relative overflow-hidden",
                      selectedCustomDrinkId === drink.id && "border-2"
                    )}
                    style={{
                      borderColor: selectedCustomDrinkId === drink.id ? drink.color : undefined,
                      backgroundColor: selectedCustomDrinkId === drink.id ? `${drink.color}15` : undefined,
                    }}
                    onClick={() => handleSelectCustomDrink(drink.id)}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: drink.color }}
                    />
                    <span className="text-xs">{drink.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

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
