import { useState, useEffect } from 'react';
import { DrinkType, DRINK_HYDRATION_MULTIPLIERS, DRINK_COLORS, CustomDrinkType, VolumeUnit, formatVolume, mlToOz, ozToMl } from '@/types/water';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Droplet, Coffee, Wine, Grape, Zap, Milk, Battery, Settings, Plus, AlertTriangle, 
  Droplets, Sparkles, GlassWater, Apple, Citrus, Cherry, Beer, Leaf, Carrot,
  FlaskConical, Glasses, IceCream, Cookie, Cake, CupSoda, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCustomDrinks, getUnitPreference, saveCustomDrink } from '@/lib/storage';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';

interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDrink: (type: DrinkType, amount: number, customDrinkId?: string) => void | Promise<void>;
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

// Available icons for custom drinks
const CUSTOM_DRINK_ICONS: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'Droplet', icon: Droplet },
  { name: 'Droplets', icon: Droplets },
  { name: 'GlassWater', icon: GlassWater },
  { name: 'Coffee', icon: Coffee },
  { name: 'Wine', icon: Wine },
  { name: 'Beer', icon: Beer },
  { name: 'Milk', icon: Milk },
  { name: 'Grape', icon: Grape },
  { name: 'Apple', icon: Apple },
  { name: 'Citrus', icon: Citrus },
  { name: 'Cherry', icon: Cherry },
  { name: 'Carrot', icon: Carrot },
  { name: 'Leaf', icon: Leaf },
  { name: 'Zap', icon: Zap },
  { name: 'Battery', icon: Battery },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'CupSoda', icon: CupSoda },
  { name: 'IceCream', icon: IceCream },
  { name: 'Cookie', icon: Cookie },
  { name: 'Cake', icon: Cake },
  { name: 'Sparkles', icon: Sparkles },
];

export function AddDrinkDialog({ open, onOpenChange, onAddDrink }: AddDrinkDialogProps) {
  const [selectedType, setSelectedType] = useState<DrinkType>('water');
  const [selectedAmount, setSelectedAmount] = useState(250);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCustomDrinkId, setSelectedCustomDrinkId] = useState<string | null>(null);
  const [customDrinks, setCustomDrinks] = useState<CustomDrinkType[]>([]);
  const [unit, setUnit] = useState<VolumeUnit>('ml');
  
  // Create custom drink dialog state
  const [isCreateDrinkOpen, setIsCreateDrinkOpen] = useState(false);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkColor, setNewDrinkColor] = useState('#3b82f6');
  const [newDrinkMultiplier, setNewDrinkMultiplier] = useState([1.0]);
  const [newDrinkIcon, setNewDrinkIcon] = useState('GlassWater');

  useEffect(() => {
    if (open) {
      setCustomDrinks(getCustomDrinks());
      setUnit(getUnitPreference());
    }
  }, [open]);

  const handleAdd = async () => {
    // Use custom amount if provided, otherwise use selected amount
    let amountToAdd = selectedAmount;
    if (customAmount) {
      const customValue = parseFloat(customAmount);
      if (!isNaN(customValue) && customValue > 0) {
        // Convert to ml if in oz
        amountToAdd = unit === 'oz' ? ozToMl(customValue) : customValue;
      }
    }

    try {
      if (selectedType === 'custom' && selectedCustomDrinkId) {
        await onAddDrink(selectedType, amountToAdd, selectedCustomDrinkId);
      } else {
        await onAddDrink(selectedType, amountToAdd);
      }

      // Reset state
      setCustomAmount('');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add drink';
      toast.error(message);
    }
  };

  const handleSelectCustomDrink = (drinkId: string) => {
    setSelectedType('custom');
    setSelectedCustomDrinkId(drinkId);
  };
  
  const handleCreateCustomDrink = () => {
    if (!newDrinkName.trim()) {
      toast.error('Please enter a drink name');
      return;
    }

    const newDrink: CustomDrinkType = {
      id: `custom_${Date.now()}`,
      name: newDrinkName.trim(),
      color: newDrinkColor,
      hydrationMultiplier: newDrinkMultiplier[0],
      icon: newDrinkIcon,
    };

    saveCustomDrink(newDrink);
    setCustomDrinks([...customDrinks, newDrink]);
    toast.success(`Custom drink "${newDrink.name}" created!`);
    
    // Reset form
    setNewDrinkName('');
    setNewDrinkColor('#3b82f6');
    setNewDrinkMultiplier([1.0]);
    setNewDrinkIcon('GlassWater');
    setIsCreateDrinkOpen(false);
    
    // Auto-select the new drink
    handleSelectCustomDrink(newDrink.id);
  };

  const getMultiplier = () => {
    if (selectedType === 'custom' && selectedCustomDrinkId) {
      const customDrink = customDrinks.find(d => d.id === selectedCustomDrinkId);
      return customDrink?.hydrationMultiplier || 1.0;
    }
    return DRINK_HYDRATION_MULTIPLIERS[selectedType as Exclude<DrinkType, 'custom'>] || 1.0;
  };

  const multiplier = getMultiplier();
  
  // Calculate amount to display (use custom amount if provided)
  const displayAmount = customAmount ? (unit === 'oz' ? ozToMl(parseFloat(customAmount) || 0) : parseFloat(customAmount) || 0) : selectedAmount;
  const hydrationValue = displayAmount * multiplier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>Add Drink</DialogTitle>
            <DialogDescription>
              Select drink type and amount.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 space-y-6 py-4">
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

          {/* Custom Drinks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Custom Drinks</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={() => setIsCreateDrinkOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create New
              </Button>
            </div>
            
            {customDrinks.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {customDrinks.map((drink) => {
                  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[drink.icon] || GlassWater;
                  return (
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
                      <div style={{ color: drink.color }}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="text-xs truncate max-w-full">{drink.name}</span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No custom drinks yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => setIsCreateDrinkOpen(true)}
                >
                  Create your first custom drink
                </Button>
              </div>
            )}
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label>Amount</Label>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNT_OPTIONS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
                  className={selectedAmount === amount && !customAmount ? "bg-gradient-water" : ""}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                >
                  {formatVolume(amount, unit)}
                </Button>
              ))}
            </div>
            
            {/* Custom Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount-input">Or enter custom amount ({unit})</Label>
              <Input
                id="custom-amount-input"
                type="number"
                placeholder={`e.g., ${unit === 'ml' ? '350' : '12'}`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>

          {/* Hydration Impact */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="text-sm font-medium">Hydration Impact</div>
            <div className="text-2xl font-bold">
              {hydrationValue > 0 ? '+' : ''}{formatVolume(hydrationValue, unit)}
            </div>
            <div className="text-xs text-muted-foreground">
              {multiplier === 1 ? 'Full hydration value' :
               multiplier > 0 ? `${(multiplier * 100).toFixed(0)}% hydration value` :
               'Dehydrating effect'}
            </div>
          </div>
        </div>

        {/* Fixed Footer Buttons */}
        <div className="flex gap-2 p-6 pt-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => void handleAdd()} className="flex-1 bg-gradient-water">
            Add Drink
          </Button>
        </div>
      </DialogContent>
      
      {/* Create Custom Drink Dialog */}
      <Dialog open={isCreateDrinkOpen} onOpenChange={setIsCreateDrinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Drink</DialogTitle>
            <DialogDescription>
              Add a new drink type with custom hydration value
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-drink-name">Drink Name</Label>
              <Input
                id="new-drink-name"
                placeholder="e.g., Herbal Tea, Smoothie, Kombucha"
                value={newDrinkName}
                onChange={(e) => setNewDrinkName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomDrink()}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-7 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                {CUSTOM_DRINK_ICONS.map(({ name, icon: Icon }) => (
                  <Button
                    key={name}
                    type="button"
                    variant={newDrinkIcon === name ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "h-10 w-10 p-0",
                      newDrinkIcon === name && "ring-2 ring-primary"
                    )}
                    onClick={() => setNewDrinkIcon(name)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-drink-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="new-drink-color"
                  type="color"
                  value={newDrinkColor}
                  onChange={(e) => setNewDrinkColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={newDrinkColor}
                  onChange={(e) => setNewDrinkColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hydration Multiplier: {newDrinkMultiplier[0].toFixed(2)}x</Label>
              <Slider
                value={newDrinkMultiplier}
                onValueChange={setNewDrinkMultiplier}
                min={-0.5}
                max={1.5}
                step={0.05}
                className="w-full"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {newDrinkMultiplier[0] < 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span>Dehydrating effect</span>
                  </>
                ) : newDrinkMultiplier[0] < 0.5 ? (
                  <>
                    <Droplet className="h-3 w-3 text-blue-400" />
                    <span>Low hydration (&lt; 50%)</span>
                  </>
                ) : newDrinkMultiplier[0] < 0.9 ? (
                  <>
                    <Droplet className="h-3 w-3 text-blue-500" />
                    <span>Moderate hydration (50-90%)</span>
                  </>
                ) : newDrinkMultiplier[0] < 1.1 ? (
                  <>
                    <Droplets className="h-3 w-3 text-primary" />
                    <span>Full hydration (90-110%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    <span>Enhanced hydration (&gt; 110%)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateDrinkOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateCustomDrink} className="flex-1 bg-gradient-water">
              Create Drink
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
