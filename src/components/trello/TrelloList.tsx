import React, { useRef, useEffect, useState } from 'react';
import { Card as CardType, List as ListType } from '@/types/trello';
import { TrelloCard } from './TrelloCard';
import { AddCardForm } from './AddCardForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, GripVertical, ArrowLeft, ArrowRight, Plus, ListChecks } from 'lucide-react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type TrelloListProps = {
  list: ListType;
  lists: ListType[];
  onCardClick: (card: CardType) => void;
  onAddCard: (listId: string, content: string, afterPosition?: number) => Promise<void>;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onUpdateList: (listId: string, title: string) => Promise<void>;
  onUpdateListLimit: (listId: string, limit: number | null) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onMoveList: (listId: string, direction: 'left' | 'right') => Promise<void>;
};

const MotionCard = motion(Card);

export const TrelloList = ({ list, lists, onCardClick, onAddCard, onUpdateCard, onUpdateList, onUpdateListLimit, onDeleteList, onMoveList }: TrelloListProps) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInlineAddForm, setShowInlineAddForm] = useState<number | null>(null);
  const [limit, setLimit] = useState<string | number>(list.card_limit || '');
  const [isLimitPopoverOpen, setIsLimitPopoverOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const drag = draggable({
      element: el,
      getInitialData: () => ({ listId: list.id, type: 'list' }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    const drop = dropTargetForElements({
      element: el,
      getData: () => ({ listId: list.id }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });

    return () => {
      drag();
      drop();
    };
  }, [list.id]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onUpdateList(list.id, title);
      setIsEditing(false);
    }
  };

  const handleLimitSave = () => {
    const newLimit = limit === '' ? null : parseInt(String(limit), 10);
    if (newLimit !== null && (isNaN(newLimit) || newLimit < 0)) return;
    onUpdateListLimit(list.id, newLimit);
    setIsLimitPopoverOpen(false);
  };

  const listIndex = lists.findIndex(l => l.id === list.id);
  const canMoveLeft = listIndex > 0;
  const canMoveRight = listIndex < lists.length - 1;
  const isOverLimit = list.card_limit !== null && list.cards.length > list.card_limit;

  return (
    <>
      <MotionCard 
        ref={ref}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'w-72 flex-shrink-0',
          isDraggedOver ? 'bg-secondary' : 'bg-muted',
          isDragging && 'opacity-50'
        )}
      >
        <CardHeader className={cn("p-3 flex flex-row items-center justify-between", isOverLimit && "bg-yellow-300/50 dark:bg-yellow-800/30")}>
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
          {isEditing ? (
            <form onSubmit={handleTitleSubmit} className="flex-grow mx-2">
              <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setIsEditing(false)} className="h-8" />
            </form>
          ) : (
            <CardTitle className="text-base font-medium cursor-pointer flex-grow mx-2" onClick={() => setIsEditing(true)}>
              {list.title}
            </CardTitle>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
              <Popover modal={true} open={isLimitPopoverOpen} onOpenChange={setIsLimitPopoverOpen}>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}><ListChecks className="mr-2 h-4 w-4" />Set card limit</DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`limit-${list.id}`}>Card Limit</Label>
                      <Input id={`limit-${list.id}`} type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit" min="0" />
                    </div>
                    <div className="flex justify-between">
                      <Button onClick={handleLimitSave}>Save</Button>
                      {list.card_limit !== null && (
                        <Button variant="outline" onClick={() => { setLimit(''); onUpdateListLimit(list.id, null); setIsLimitPopoverOpen(false); }}>Remove Limit</Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMoveList(list.id, 'left')} disabled={!canMoveLeft}><ArrowLeft className="mr-2 h-4 w-4" />Move Left</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveList(list.id, 'right')} disabled={!canMoveRight}><ArrowRight className="mr-2 h-4 w-4" />Move Right</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-1 pt-0 min-h-[2rem]">
          <AnimatePresence>
            {list.cards.map((card, index) => (
              <div key={card.id} className="relative group/item">
                <TrelloCard
                  card={card}
                  onCardClick={onCardClick}
                  onUpdateCard={onUpdateCard}
                />
                {showInlineAddForm === index ? (
                  <div className="py-1">
                    <AddCardForm
                      listId={list.id}
                      onAddCard={async (listId, content) => {
                        await onAddCard(listId, content, card.position);
                        setShowInlineAddForm(null);
                      }}
                      forceShow={true}
                      onCancel={() => setShowInlineAddForm(null)}
                    />
                  </div>
                ) : (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full h-6 w-6 shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInlineAddForm(index);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </CardContent>
        <div className="p-1 pt-0">
          <AddCardForm listId={list.id} onAddCard={onAddCard} />
        </div>
      </MotionCard>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the list and all its cards. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteList(list.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};