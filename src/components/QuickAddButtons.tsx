import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Droplet, Plus } from 'lucide-react';
import { VolumeUnit, formatVolume, DrinkType } from '@/types/water';
import { AddDrinkDialog } from './AddDrinkDialog';

interface QuickAddButtonsProps {
  onQuickAdd: (amount: number) => void;
  onAddDrink: (type: DrinkType, amount: number, customDrinkId?: string) => void;
  unit?: VolumeUnit;
}

export function QuickAddButtons({ onQuickAdd, onAddDrink, unit = 'ml' }: QuickAddButtonsProps) {
  const [drinkDialogOpen, setDrinkDialogOpen] = useState(false);

  const handleAddDrink = (type: DrinkType, amount: number, customDrinkId?: string) => {
    onAddDrink(type, amount, customDrinkId);
    setDrinkDialogOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <Button
          onClick={() => onQuickAdd(250)}
          variant="outline"
          className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
        >
          <Droplet className="h-6 w-6 text-primary mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">{formatVolume(250, unit)}</span>
          <span className="text-xs text-muted-foreground">Glass</span>
        </Button>
        
        <Button
          onClick={() => onQuickAdd(330)}
          variant="outline"
          className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
        >
          <Droplet className="h-7 w-7 text-primary mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">{formatVolume(330, unit)}</span>
          <span className="text-xs text-muted-foreground">Can</span>
        </Button>
        
        <Button
          onClick={() => onQuickAdd(500)}
          variant="outline"
          className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
        >
          <Droplet className="h-8 w-8 text-primary mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">{formatVolume(500, unit)}</span>
          <span className="text-xs text-muted-foreground">Bottle</span>
        </Button>
        
        <Button
          onClick={() => setDrinkDialogOpen(true)}
          variant="outline"
          className="flex flex-col h-24 hover:bg-secondary/10 hover:border-secondary transition-all group"
        >
          <Plus className="h-8 w-8 text-secondary mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">More</span>
          <span className="text-xs text-muted-foreground">Drinks</span>
        </Button>
      </div>

      {/* Add Drink Type Dialog */}
      <AddDrinkDialog
        open={drinkDialogOpen}
        onOpenChange={setDrinkDialogOpen}
        onAddDrink={handleAddDrink}
      />
    </>
  );
}
