import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckSquare } from 'lucide-react';

type ChecklistPopoverProps = {
  onAddChecklist: (title: string) => void;
};

export const ChecklistPopover = ({ onAddChecklist }: ChecklistPopoverProps) => {
  const [title, setTitle] = useState('Checklist');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (title.trim()) {
      onAddChecklist(title.trim());
      setTitle('Checklist');
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" className="w-full justify-start">
          <CheckSquare className="mr-2 h-4 w-4" /> Checklist
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-medium text-center">Add checklist</p>
          <div className="space-y-2">
            <Label htmlFor="checklist-title">Title</Label>
            <Input
              id="checklist-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};