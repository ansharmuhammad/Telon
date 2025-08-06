import { useState, useEffect } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  content: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  due_date: z.date().nullable(),
  is_completed: z.boolean(),
  list_id: z.string(),
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
  onUpdateCard: (cardId: string, data: Partial<Omit<CardType, 'id' | 'list_id'>>) => Promise<void>;
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
      is_completed: card.is_completed,
      list_id: card.list_id,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        content: card.content,
        description: card.description || '',
        start_date: card.start_date ? new Date(card.start_date) : null,
        due_date: card.due_date ? new Date(card.due_date) : null,
        is_completed: card.is_completed,
        list_id: card.list_id,
      });
      setShowDates(!!(card.start_date || card.due_date));
    }
  }, [isOpen, card, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { list_id, ...updateData } = values;
    
    const cardUpdatePayload = {
      ...updateData,
      start_date: values.start_date ? values.start_date.toISOString() : null,
      due_date: values.due_date ? values.due_date.toISOString() : null,
    };

    await onUpdateCard(card.id, cardUpdatePayload);

    if (list_id !== card.list_id) {
      await onMoveCard(card.id, list_id);
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    await onDeleteCard(card.id);
    setIsDeleteAlertOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="text-lg font-bold border-none shadow-none -ml-2" />
                    </FormControl>
                    {form.formState.errors.content && (
                      <p className="text-sm text-destructive ml-2">{form.formState.errors.content.message}</p>
                    )}
                  </FormItem>
                )}
              />
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder="Add a more detailed description..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {showDates && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Dates</label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setShowDates(false); form.setValue('start_date', null); form.setValue('due_date', null); }}>Remove</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Start date</FormLabel>
                            <Popover open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                              <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setStartDatePopoverOpen(false);}} initialFocus /><div className="p-2 border-t border-border"><Button variant="ghost" size="sm" className="w-full" onClick={() => {field.onChange(null); setStartDatePopoverOpen(false);}}>Clear</Button></div></PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Due date</FormLabel>
                            <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                              <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setDueDatePopoverOpen(false);}} initialFocus /><div className="p-2 border-t border-border"><Button variant="ghost" size="sm" className="w-full" onClick={() => {field.onChange(null); setDueDatePopoverOpen(false);}}>Clear</Button></div></PopoverContent>
                            </Popover>
                            {form.formState.errors.due_date && (<p className="text-sm text-destructive mt-1">{form.formState.errors.due_date.message}</p>)}
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">Add to card</h3>
                {!showDates && <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => setShowDates(true)}><CalendarIcon className="mr-2 h-4 w-4" /> Dates</Button>}
                
                <FormField
                  control={form.control}
                  name="is_completed"
                  render={({ field }) => (
                    <FormItem>
                      <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => field.onChange(!field.value)}>
                        <Checkbox checked={field.value} className="mr-2" /> {field.value ? 'Mark incomplete' : 'Mark complete'}
                      </Button>
                    </FormItem>
                  )}
                />

                <div>
                  <h3 className="text-sm font-medium my-2">Actions</h3>
                  <FormField
                    control={form.control}
                    name="list_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Move card..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lists.map(list => (<SelectItem key={list.id} value={list.id}>Move to {list.title}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
};