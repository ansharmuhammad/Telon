import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Card as CardType } from '@/types/trello';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  content: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  due_date: z.date().nullable(),
});

type CardDetailsModalProps = {
  card: CardType;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
};

export const CardDetailsModal = ({ card, isOpen, onOpenChange, onUpdateCard, onDeleteCard }: CardDetailsModalProps) => {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: card.content,
      description: card.description || '',
      start_date: card.start_date ? new Date(card.start_date) : null,
      due_date: card.due_date ? new Date(card.due_date) : null,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const updateData = {
      ...values,
      start_date: values.start_date ? values.start_date.toISOString() : null,
      due_date: values.due_date ? values.due_date.toISOString() : null,
    };
    await onUpdateCard(card.id, updateData);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await onDeleteCard(card.id);
    setIsDeleteAlertOpen(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              <Input {...form.register('content')} className="text-lg font-bold border-none shadow-none -ml-2" />
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea {...form.register('description')} placeholder="Add a more detailed description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !form.watch('start_date') && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('start_date') ? format(form.watch('start_date')!, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.watch('start_date')} onSelect={(date) => form.setValue('start_date', date || null)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">Due date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !form.watch('due_date') && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('due_date') ? format(form.watch('due_date')!, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.watch('due_date')} onSelect={(date) => form.setValue('due_date', date || null)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="submit">Save</Button>
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Card
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the card. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};