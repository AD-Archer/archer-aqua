import { Button } from '@/components/ui/button';
import { Droplet, Plus } from 'lucide-react';

interface QuickAddButtonsProps {
  onQuickAdd: (amount: number) => void;
  onCustomAdd: () => void;
}

export function QuickAddButtons({ onQuickAdd, onCustomAdd }: QuickAddButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Button
        onClick={() => onQuickAdd(250)}
        variant="outline"
        className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
      >
        <Droplet className="h-6 w-6 text-primary mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium">250ml</span>
        <span className="text-xs text-muted-foreground">Glass</span>
      </Button>
      
      <Button
        onClick={() => onQuickAdd(330)}
        variant="outline"
        className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
      >
        <Droplet className="h-7 w-7 text-primary mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium">330ml</span>
        <span className="text-xs text-muted-foreground">Can</span>
      </Button>
      
      <Button
        onClick={() => onQuickAdd(500)}
        variant="outline"
        className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group"
      >
        <Droplet className="h-8 w-8 text-primary mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium">500ml</span>
        <span className="text-xs text-muted-foreground">Bottle</span>
      </Button>
      
      <Button
        onClick={onCustomAdd}
        variant="outline"
        className="flex flex-col h-24 hover:bg-secondary/10 hover:border-secondary transition-all group"
      >
        <Plus className="h-8 w-8 text-secondary mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium">Custom</span>
        <span className="text-xs text-muted-foreground">Amount</span>
      </Button>
    </div>
  );
}
