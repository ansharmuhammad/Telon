import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Card as CardType, List as ListType } from '@/types/trello';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, CheckSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  content: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  due_date: z.date().nullable(),
}).refine(data => {
  if (data.start_date && data.due_date) {
    return data.due_date >= data.start_date;
  }
  return true;
}, {
  message: "Due date cannot be earlier than start date.",
  path: ["due_date"],
});

type CardDetailsModalProps = {
  card: CardType;
  lists: ListType[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onMoveCard: (cardId: string, newListId: string) => Promise<void>;
};

export const CardDetailsModal = ({ card, lists, isOpen, onOpenChange, onUpdateCard, onDeleteCard, onMoveCard }: CardDetailsModalProps) => {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [showDates, setShowDates] = useState(!!(card.start_date || card.due_date));

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
  };

  const handleMove = (newListId: string) => {
    if (newListId !== card.list_id) {
      onMoveCard(card.id, newListId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="pr-8">
              <Input {...form.register('content')} className="text-lg font-bold border-none shadow-none -ml-2" />
            </DialogTitle>
            {form.formState.errors.content && (
              <p className="text-sm text-destructive -mt-2 ml-2">{form.formState.errors.content.message}</p>
            )}
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea {...form.register('description')} placeholder="Add a more detailed description..." />
              </div>
              {showDates && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Dates</label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowDates(false); form.setValue('start_date', null); form.setValue('due_date', null); }}>Remove</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Start date</label>
                      <Popover open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                        <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !form.watch('start_date') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{form.watch('start_date') ? format(form.watch('start_date')!, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.watch('start_date')} onSelect={(date) => {form.setValue('start_date', date || null); setStartDatePopoverOpen(false);}} initialFocus /><div className="p-2 border-t border-border"><Button variant="ghost" size="sm" className="w-full" onClick={() => {form.setValue('start_date', null); setStartDatePopoverOpen(false);}}>Clear</Button></div></PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Due date</label>
                      <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                        <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !form.watch('due_date') && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{form.watch('due_date') ? format(form.watch('due_date')!, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.watch('due_date')} onSelect={(date) => {form.setValue('due_date', date || null); setDueDatePopoverOpen(false);}} initialFocus /><div className="p-2 border-t border-border"><Button variant="ghost" size="sm" className="w-full" onClick={() => {form.setValue('due_date', null); setDueDatePopoverOpen(false);}}>Clear</Button></div></PopoverContent>
                      </Popover>
                      {form.formState.errors.due_date && (<p className="text-sm text-destructive mt-1">{form.formState.errors.due_date.message}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-2">Add to card</h3>
              {!showDates && <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => setShowDates(true)}><CalendarIcon className="mr-2 h-4 w-4" /> Dates</Button>}
              <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => onUpdateCard(card.id, { is_completed: !card.is_completed })}>
                <Checkbox checked={card.is_completed} className="mr-2" /> {card.is_completed ? 'Mark incomplete' : 'Mark complete'}
              </Button>
              <div>
                <h3 className="text-sm font-medium my-2">Actions</h3>
                <Select onValueChange={handleMove} defaultValue={card.list_id}>
                  <SelectTrigger><SelectValue placeholder="Move card..." /></SelectTrigger>
                  <SelectContent>
                    {lists.map(list => (<SelectItem key={list.id} value={list.id}>Move to {list.title}</SelectItem>))}
                  </SelectContent>
                </Select>
                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                  <AlertDialogTrigger asChild><Button type="button" variant="destructive" className="w-full justify-start mt-2"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the card. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};