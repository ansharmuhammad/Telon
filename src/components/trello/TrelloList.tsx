import React, { useRef, useEffect, useState } from 'react';
import { Card as CardType, List as ListType, Label as LabelType } from '@/types/trello';
import { TrelloCard } from './TrelloCard';
import { AddCardForm } from './AddCardForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { MoreHorizontal, Edit, Trash2, GripVertical, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { cn } from '@/lib/utils';

type TrelloListProps = {
  list: ListType;
  lists: ListType[];
  boardLabels: LabelType[];
  onCardClick: (card: CardType) => void;
  onAddCard: (listId: string, content: string, afterPosition?: number) => Promise<void>;
  onUpdateList: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onMoveList: (listId: string, direction: 'left' | 'right') => Promise<void>;
};

export const TrelloList = ({ list, lists, boardLabels, onCardClick, onAddCard, onUpdateList, onDeleteList, onMoveList }: TrelloListProps) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInlineAddForm, setShowInlineAddForm] = useState<number | null>(null);

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

  const listIndex = lists.findIndex(l => l.id === list.id);
  const canMoveLeft = listIndex > 0;
  const canMoveRight = listIndex < lists.length - 1;

  return (
    <>
      <Card ref={ref} className={cn(
        'w-72 flex-shrink-0 transition-colors',
        isDraggedOver ? 'bg-secondary' : 'bg-gray-100',
        isDragging && 'opacity-50'
      )}>
        <CardHeader className="p-3 flex flex-row items-center justify-between">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMoveList(list.id, 'left')} disabled={!canMoveLeft}><ArrowLeft className="mr-2 h-4 w-4" />Move Left</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveList(list.id, 'right')} disabled={!canMoveRight}><ArrowRight className="mr-2 h-4 w-4" />Move Right</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-1 pt-0 min-h-[2rem]">
          {list.cards.map((card, index) => (
            <div key={card.id} className="relative group/item">
              <TrelloCard
                card={card}
                onCardClick={onCardClick}
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
        </CardContent>
        <div className="p-1 pt-0">
          <AddCardForm listId={list.id} onAddCard={onAddCard} />
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the list and all its cards. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteList(list.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};