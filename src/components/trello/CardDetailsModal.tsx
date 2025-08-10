import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isPast, differenceInHours, formatDistanceToNow } from 'date-fns';
import { Card as CardType, List as ListType, Label as LabelType, CoverConfig, ChecklistItem, Attachment as AttachmentType, Comment, BoardMember } from '@/types/trello';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Trash2, Image as CoverIcon, Paperclip, MoreVertical, Download, Edit, MessageSquare, AtSign } from 'lucide-react';
import { cn, getCoverStyle, getPublicUrl } from '@/lib/utils';
import { LabelPopover } from './LabelPopover';
import { RelatedCardsPopover } from './RelatedCardsPopover';
import { CoverPopover } from './CoverPopover';
import { ChecklistPopover } from './ChecklistPopover';
import { Checklist } from './Checklist';
import { Separator } from '../ui/separator';
import { DateTimePicker } from '../ui/datetime-picker';
import { AttachmentPopover } from './AttachmentPopover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommentRenderer } from './CommentRenderer';

const cardFormSchema = z.object({
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

const commentFormSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
});

type CardDetailsModalProps = {
  card: CardType;
  allCards: CardType[];
  lists: ListType[];
  boardLabels: LabelType[];
  boardMembers: BoardMember[];
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
  onAddAttachment: (cardId: string, file: File) => Promise<void>;
  onUpdateAttachment: (attachmentId: string, data: { file_name: string }) => Promise<void>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onAddComment: (cardId: string, content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
};

export const CardDetailsModal = (props: CardDetailsModalProps) => {
  const { card, allCards, lists, boardLabels, boardMembers, isOpen, onOpenChange, onUpdateCard, onDeleteCard, onMoveCard, onToggleLabelOnCard, onCreateLabel, onUpdateLabel, onAddRelation, onRemoveRelation, onSelectCard, onAddChecklist, onUpdateChecklist, onDeleteChecklist, onAddChecklistItem, onUpdateChecklistItem, onDeleteChecklistItem, onAddAttachment, onUpdateAttachment, onDeleteAttachment, onAddComment, onUpdateComment, onDeleteComment } = props;
  const { session } = useAuth();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [renamingAttachment, setRenamingAttachment] = useState<AttachmentType | null>(null);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);

  const cardForm = useForm<z.infer<typeof cardFormSchema>>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      content: card.content,
      description: card.description || '',
      start_date: card.start_date ? new Date(card.start_date) : null,
      due_date: card.due_date ? new Date(card.due_date) : null,
      list_id: card.list_id,
    }
  });

  const commentForm = useForm<z.infer<typeof commentFormSchema>>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    cardForm.reset({
      content: card.content,
      description: card.description || '',
      start_date: card.start_date ? new Date(card.start_date) : null,
      due_date: card.due_date ? new Date(card.due_date) : null,
      list_id: card.list_id,
    });
    setShowDates(!!(card.start_date || card.due_date));
  }, [card, cardForm.reset]);

  const onCardSubmit = async (values: z.infer<typeof cardFormSchema>) => {
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

  const onCommentSubmit = async (values: z.infer<typeof commentFormSchema>) => {
    let finalContent = values.content;
    const mentions: string[] = [];

    if (mentionedUsers.includes('everyone')) {
      mentions.push('@[Everyone](group:everyone)');
    }

    mentionedUsers.forEach(id => {
      if (id !== 'everyone') {
        const member = boardMembers.find(m => m.user_id === id);
        if (member) {
          const displayName = member.user.full_name || member.user.email || 'User';
          mentions.push(`@[${displayName}](user:${member.user_id})`);
        }
      }
    });

    if (mentions.length > 0) {
      finalContent += `\n\nMentions: ${mentions.join(' ')}`;
    }

    await onAddComment(card.id, finalContent);
    commentForm.reset({ content: '' });
    setMentionedUsers([]);
  };

  const onCommentUpdateSubmit = async (values: z.infer<typeof commentFormSchema>) => {
    if (!editingComment) return;
    await onUpdateComment(editingComment.id, values.content);
    setEditingComment(null);
    commentForm.reset();
  };

  const handleDelete = async () => {
    await onDeleteCard(card.id);
    setIsDeleteAlertOpen(false);
    onOpenChange(false);
  };

  const handleCoverChange = (coverConfig: CoverConfig) => {
    onUpdateCard(card.id, { cover_config: coverConfig });
  };

  const handleDownload = async (attachment: AttachmentType) => {
    const { data, error } = await supabase.storage.from('card-attachments').download(attachment.file_path);
    if (error) {
      showError('Failed to download file.');
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRenameSubmit = async () => {
    if (!renamingAttachment || !newAttachmentName.trim()) return;
    await onUpdateAttachment(renamingAttachment.id, { file_name: newAttachmentName.trim() });
    setRenamingAttachment(null);
  };

  const { style: coverStyle } = getCoverStyle(card.cover_config);
  const dueDate = cardForm.watch('due_date');
  const isCompleted = card.is_completed;
  const isOverdue = dueDate && !isCompleted && isPast(dueDate);
  const isDueSoon = dueDate && !isCompleted && !isPast(dueDate) && differenceInHours(dueDate, new Date()) < 24;
  const status = isCompleted ? { text: 'Complete', color: 'bg-green-100 text-green-800' } : isOverdue ? { text: 'Overdue', color: 'bg-red-100 text-red-800' } : isDueSoon ? { text: 'Due soon', color: 'bg-yellow-100 text-yellow-800' } : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[625px] p-0 flex flex-col max-h-[90vh]">
          {card.cover_config && <div style={coverStyle} className="h-32 w-full rounded-t-lg bg-cover bg-center flex-shrink-0" />}
          <div className="flex-grow overflow-y-auto">
            <div className="p-6 pt-4">
              <Form {...cardForm}>
                <form id="card-details-form" onSubmit={cardForm.handleSubmit(onCardSubmit)} className="space-y-4">
                  <DialogHeader className="pr-8">
                    <DialogTitle className="sr-only">Editing Card: {card.content}</DialogTitle>
                    <DialogDescription className="sr-only">Modify card details, add attachments, checklists, and more.</DialogDescription>
                    <div className="flex items-start gap-3">
                      <Checkbox id="card-completed-checkbox" checked={card.is_completed} onCheckedChange={(checked) => onUpdateCard(card.id, { is_completed: !!checked })} className="mt-2 h-5 w-5" />
                      <div className="flex-grow">
                        <FormField control={cardForm.control} name="content" render={({ field }) => (<FormItem><FormControl><Input {...field} className={cn("text-lg font-bold border-none shadow-none -ml-2", card.is_completed && "line-through text-muted-foreground")} /></FormControl>{cardForm.formState.errors.content && <p className="text-sm text-destructive ml-2">{cardForm.formState.errors.content.message}</p>}</FormItem>)} />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground pl-10">in list <span className="font-medium text-foreground">{lists.find(l => l.id === card.list_id)?.title}</span></div>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                      <div className="flex flex-wrap gap-4">
                        {card.labels.length > 0 && (<div><h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Labels</h3><div className="flex flex-wrap gap-1">{card.labels.map(label => (<div key={label.id} className="rounded-sm px-3 py-1.5 text-sm font-bold text-white" style={{backgroundColor: label.color}}>{label.name}</div>))}</div></div>)}
                        {card.related_cards.length > 0 && (<div><h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Related Cards</h3><div className="flex flex-wrap gap-1">{card.related_cards.map(rc => (<Button key={rc.id} variant="secondary" size="sm" onClick={() => onSelectCard(rc.id)}>{rc.content}</Button>))}</div></div>)}
                      </div>
                      {showDates && (<div><div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold uppercase text-muted-foreground">Dates</h3><Button type="button" variant="ghost" size="sm" className="text-xs h-auto py-1 px-2" onClick={() => { cardForm.setValue('start_date', null); cardForm.setValue('due_date', null); setShowDates(false); }}>Remove dates</Button></div><div className="grid grid-cols-1 gap-4"><FormField control={cardForm.control} name="start_date" render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Start date</FormLabel><DateTimePicker date={field.value} setDate={field.onChange} /></FormItem>)} /><FormField control={cardForm.control} name="due_date" render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Due date</FormLabel><div className="flex items-center gap-2"><div className="flex-grow"><DateTimePicker date={field.value} setDate={field.onChange} /></div>{status && (<span className={cn("px-3 py-1 rounded-md text-xs font-medium", status.color)}>{status.text}</span>)}</div>{cardForm.formState.errors.due_date && (<p className="text-sm text-destructive mt-1">{cardForm.formState.errors.due_date.message}</p>)}</FormItem>)} /></div></div>)}
                      <FormField control={cardForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Add a more detailed description..." /></FormControl></FormItem>)} />
                      {card.attachments && card.attachments.length > 0 && (<div className="space-y-3"><Separator /><div className="flex items-center gap-4"><Paperclip className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Attachments</h3></div><div className="space-y-2 pl-9">{card.attachments.map(attachment => (<div key={attachment.id} className="flex items-center gap-4 group"><a href={getPublicUrl('card-attachments', attachment.file_path)} target="_blank" rel="noopener noreferrer" className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center font-bold text-gray-500 text-sm hover:bg-gray-300">{attachment.file_type?.split('/')[1]?.toUpperCase().substring(0, 4) || 'FILE'}</a><div className="flex-grow"><a href={getPublicUrl('card-attachments', attachment.file_path)} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{attachment.file_name}</a><p className="text-xs text-muted-foreground">Added {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => handleDownload(attachment)}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem><DropdownMenuItem onClick={() => { setRenamingAttachment(attachment); setNewAttachmentName(attachment.file_name); }}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem><DropdownMenuItem onClick={() => onDeleteAttachment(attachment.id)} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>))}</div></div>)}
                      {card.checklists && card.checklists.length > 0 && (<div className="space-y-6"><Separator />{card.checklists.map(checklist => (<Checklist key={checklist.id} checklist={checklist} onUpdateChecklist={onUpdateChecklist} onDeleteChecklist={onDeleteChecklist} onAddChecklistItem={onAddChecklistItem} onUpdateChecklistItem={onUpdateChecklistItem} onDeleteChecklistItem={onDeleteChecklistItem} />))}</div>)}
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-4"><MessageSquare className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Comments</h3></div>
                        <div className="pl-9 space-y-4">
                          <Form {...commentForm}>
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8"><AvatarImage src={session?.user?.user_metadata?.avatar_url} /><AvatarFallback>{session?.user?.email?.[0].toUpperCase()}</AvatarFallback></Avatar>
                              <div className="flex-grow">
                                <FormField control={commentForm.control} name="content" render={({ field }) => (<FormItem><FormControl><Textarea {...field} placeholder="Write a comment..." className="min-h-[60px]" /></FormControl></FormItem>)} />
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <Button type="button" size="sm" onClick={commentForm.handleSubmit(editingComment ? onCommentUpdateSubmit : onCommentSubmit)}>{editingComment ? 'Save' : 'Comment'}</Button>
                                    {editingComment && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingComment(null); commentForm.reset(); }}>Cancel</Button>}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <AtSign className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onSelect={(e) => e.preventDefault()}>
                                      <DropdownMenuLabel>Mention</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuCheckboxItem
                                        checked={mentionedUsers.includes('everyone')}
                                        onCheckedChange={(checked) => {
                                          setMentionedUsers(prev => checked ? [...prev, 'everyone'] : prev.filter(id => id !== 'everyone'));
                                        }}
                                      >
                                        Everyone
                                      </DropdownMenuCheckboxItem>
                                      <DropdownMenuSeparator />
                                      {boardMembers.map(member => (
                                        <DropdownMenuCheckboxItem
                                          key={member.user_id}
                                          checked={mentionedUsers.includes(member.user_id)}
                                          onCheckedChange={(checked) => {
                                            setMentionedUsers(prev => checked ? [...prev, member.user_id] : prev.filter(id => id !== member.user_id));
                                          }}
                                        >
                                          {member.user.full_name || member.user.email}
                                        </DropdownMenuCheckboxItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </Form>
                          <div className="space-y-4">
                            {card.comments.map(comment => (
                              <div key={comment.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8"><AvatarImage src={comment.user?.avatar_url || undefined} /><AvatarFallback>{comment.user?.full_name?.[0] || 'U'}</AvatarFallback></Avatar>
                                <div className="flex-grow">
                                  <div className="flex items-baseline gap-2">
                                    <p className="font-semibold text-sm">{comment.user?.full_name || 'Anonymous'}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</p>
                                  </div>
                                  <div className="text-sm bg-gray-100 p-2 rounded-md mt-1">
                                    <CommentRenderer content={comment.content} />
                                  </div>
                                  {comment.user_id === session?.user?.id && (
                                    <div className="flex gap-2 mt-1">
                                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setEditingComment(comment); commentForm.setValue('content', comment.content); }}>Edit</Button>
                                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={() => onDeleteComment(comment.id)}>Delete</Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium mb-2">Add to card</h3>
                      <AttachmentPopover onAddAttachment={(file) => onAddAttachment(card.id, file)}><Button type="button" variant="secondary" className="w-full justify-start"><Paperclip className="mr-2 h-4 w-4" /> Attachment</Button></AttachmentPopover>
                      <CoverPopover card={card} onCoverChange={handleCoverChange}><Button type="button" variant="secondary" className="w-full justify-start"><CoverIcon className="mr-2 h-4 w-4" /> Cover</Button></CoverPopover>
                      <LabelPopover card={card} boardLabels={boardLabels} onToggleLabelOnCard={onToggleLabelOnCard} onCreateLabel={onCreateLabel} onUpdateLabel={onUpdateLabel} />
                      <ChecklistPopover onAddChecklist={(title) => onAddChecklist(card.id, title)} />
                      <RelatedCardsPopover card={card} allCards={allCards} onAddRelation={onAddRelation} onRemoveRelation={onRemoveRelation} />
                      {!showDates && <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => setShowDates(true)}><CalendarIcon className="mr-2 h-4 w-4" /> Dates</Button>}
                      <div>
                        <h3 className="text-sm font-medium my-2">Actions</h3>
                        <FormField control={cardForm.control} name="list_id" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Move card..." /></SelectTrigger></FormControl><SelectContent>{lists.map(list => (<SelectItem key={list.id} value={list.id}>Move to {list.title}</SelectItem>))}</SelectContent></Select></FormItem>)} />
                        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}><AlertDialogTrigger asChild><Button type="button" variant="destructive" className="w-full justify-start mt-2"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent><AlertDialogDescriptionComponent>This will permanently delete the card. This action cannot be undone.</AlertDialogDescriptionComponent></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </div>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>
          <DialogFooter className="p-6 border-t flex-shrink-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="card-details-form">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!renamingAttachment} onOpenChange={() => setRenamingAttachment(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Rename Attachment</AlertDialogTitleComponent><AlertDialogDescriptionComponent>Enter a new name for the file.</AlertDialogDescriptionComponent></AlertDialogHeader><Input value={newAttachmentName} onChange={(e) => setNewAttachmentName(e.target.value)} /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRenameSubmit}>Save</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};