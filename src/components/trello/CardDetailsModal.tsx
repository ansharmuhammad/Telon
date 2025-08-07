import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isPast, differenceInHours } from 'date-fns';
import { Card as CardType, List as ListType, Label as LabelType, CoverConfig, Checklist as ChecklistType, ChecklistItem } from '@/types/trello';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Trash2, Link2, Image as CoverIcon } from 'lucide-react';
import { cn, getCoverStyle } from '@/lib/utils';
import { LabelPopover } from './LabelPopover';
import { RelatedCardsPopover } from './RelatedCardsPopover';
import { CoverPopover } from './CoverPopover';
import { ChecklistPopover } from './ChecklistPopover';
import { Checklist } from './Checklist';
import { Separator } from '../ui/separator';
import { DateTimePicker } from '../ui/datetime-picker';

const formSchema = z.object({
  content: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  start_date: z.date().nullable(),
  due_date: z.date().nullable(),
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
  allCards: CardType[];
  lists: ListType[];
  boardLabels: LabelType[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateCard: (cardId: string, data: Partial<Omit<CardType, 'id' | 'list_id' | 'labels' | 'related_cards'>>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onMoveCard: (cardId: string, newListId: string) => Promise<void>;
  onToggleLabelOnCard: (cardId: string, labelId: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onUpdateLabel: (labelId: string, data: Partial<Pick<LabelType, 'name' | 'color'>>) => Promise<void>;
  onAddRelation: (card1Id: string, card2Id: string) => Promise<void>;
  onRemoveRelation: (card1Id: string, card2Id: string) => Promise<void>;
  onSelectCard: (cardId: string) => void;
  onAddChecklist: (cardId: string, title: string) => Promise<void>;
  onUpdateChecklist: (checklistId: string, title: string) => Promise<void>;
  onDeleteChecklist: (checklistId: string) => Promise<void>;
  onAddChecklistItem: (checklistId: string, content: string) => Promise<void>;
  onUpdateChecklistItem: (itemId: string, data: Partial<Pick<ChecklistItem, 'content' | 'is_completed'>>) => Promise<void>;
  onDeleteChecklistItem: (itemId: string) => Promise<void>;
};

export const CardDetailsModal = (props: CardDetailsModalProps) => {
  const { card, allCards, lists, boardLabels, isOpen, onOpenChange, onUpdateCard, onDeleteCard, onMoveCard, onToggleLabelOnCard, onCreateLabel, onUpdateLabel, onAddRelation, onRemoveRelation, onSelectCard, onAddChecklist, onUpdateChecklist, onDeleteChecklist, onAddChecklistItem, onUpdateChecklistItem, onDeleteChecklistItem } = props;
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [showDates, setShowDates] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: card.content,
      description: card.description || '',
      start_date: card.start_date ? new Date(card.start_date) : null,
      due_date: card.due_date ? new Date(card.due_date) : null,
      list_id: card.list_id,
    }
  });

  useEffect(() => {
    form.reset({
      content: card.content,
      description: card.description || '',
      start_date: card.start_date ? new Date(card.start_date) : null,
      due_date: card.due_date ? new Date(card.due_date) : null,
      list_id: card.list_id,
    });
    setShowDates(!!(card.start_date || card.due_date));
  }, [card, form.reset]);

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

  const handleCoverChange = (coverConfig: CoverConfig) => {
    onUpdateCard(card.id, { cover_config: coverConfig });
  };

  const { style: coverStyle } = getCoverStyle(card.cover_config);

  const dueDate = form.watch('due_date');
  const isCompleted = card.is_completed;
  const isOverdue = dueDate && !isCompleted && isPast(dueDate);
  const isDueSoon = dueDate && !isCompleted && !isPast(dueDate) && differenceInHours(dueDate, new Date()) < 24;

  const getStatus = () => {
    if (isCompleted) return { text: 'Complete', color: 'bg-green-100 text-green-800' };
    if (isOverdue) return { text: 'Overdue', color: 'bg-red-100 text-red-800' };
    if (isDueSoon) return { text: 'Due soon', color: 'bg-yellow-100 text-yellow-800' };
    return null;
  };
  const status = getStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] p-0">
        {card.cover_config && (
          <div style={coverStyle} className="h-32 w-full rounded-t-lg bg-cover bg-center" />
        )}
        <div className="p-6 pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader className="pr-8">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="card-completed-checkbox"
                    checked={card.is_completed}
                    onCheckedChange={(checked) => onUpdateCard(card.id, { is_completed: !!checked })}
                    className="mt-2 h-5 w-5"
                  />
                  <div className="flex-grow">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} className={cn("text-lg font-bold border-none shadow-none -ml-2", card.is_completed && "line-through text-muted-foreground")} />
                          </FormControl>
                          {form.formState.errors.content && (
                            <p className="text-sm text-destructive ml-2">{form.formState.errors.content.message}</p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground pl-10">
                  in list <span className="font-medium text-foreground">{lists.find(l => l.id === card.list_id)?.title}</span>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="flex flex-wrap gap-4">
                    {card.labels.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Labels</h3>
                        <div className="flex flex-wrap gap-1">
                          {card.labels.map(label => (
                            <div key={label.id} className="rounded-sm px-3 py-1.5 text-sm font-bold text-white" style={{backgroundColor: label.color}}>
                              {label.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {card.related_cards.length > 0 && (
                       <div>
                        <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Related Cards</h3>
                        <div className="flex flex-wrap gap-1">
                          {card.related_cards.map(rc => (
                            <Button key={rc.id} variant="secondary" size="sm" onClick={() => onSelectCard(rc.id)}>{rc.content}</Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {showDates && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold uppercase text-muted-foreground">Dates</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto py-1 px-2"
                          onClick={() => {
                            form.setValue('start_date', null);
                            form.setValue('due_date', null);
                            setShowDates(false);
                          }}
                        >
                          Remove dates
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Start date</FormLabel>
                              <DateTimePicker date={field.value} setDate={field.onChange} />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="due_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Due date</FormLabel>
                              <div className="flex items-center gap-2">
                                <div className="flex-grow">
                                  <DateTimePicker date={field.value} setDate={field.onChange} />
                                </div>
                                {status && (
                                  <span className={cn("px-3 py-1 rounded-md text-xs font-medium", status.color)}>
                                    {status.text}
                                  </span>
                                )}
                              </div>
                              {form.formState.errors.due_date && (<p className="text-sm text-destructive mt-1">{form.formState.errors.due_date.message}</p>)}
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

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
                  
                  {card.checklists && card.checklists.length > 0 && (
                    <div className="space-y-6">
                      <Separator />
                      {card.checklists.map(checklist => (
                        <Checklist
                          key={checklist.id}
                          checklist={checklist}
                          onUpdateChecklist={onUpdateChecklist}
                          onDeleteChecklist={onDeleteChecklist}
                          onAddChecklistItem={onAddChecklistItem}
                          onUpdateChecklistItem={onUpdateChecklistItem}
                          onDeleteChecklistItem={onDeleteChecklistItem}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium mb-2">Add to card</h3>
                  <CoverPopover card={card} onCoverChange={handleCoverChange}>
                    <Button type="button" variant="secondary" className="w-full justify-start">
                      <CoverIcon className="mr-2 h-4 w-4" /> Cover
                    </Button>
                  </CoverPopover>
                  <LabelPopover 
                    card={card}
                    boardLabels={boardLabels}
                    onToggleLabelOnCard={onToggleLabelOnCard}
                    onCreateLabel={onCreateLabel}
                    onUpdateLabel={onUpdateLabel}
                  />
                  <ChecklistPopover onAddChecklist={(title) => onAddChecklist(card.id, title)} />
                  <RelatedCardsPopover
                    card={card}
                    allCards={allCards}
                    onAddRelation={onAddRelation}
                    onRemoveRelation={onRemoveRelation}
                  />
                  {!showDates && <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => setShowDates(true)}><CalendarIcon className="mr-2 h-4 w-4" /> Dates</Button>}
                  
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
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};