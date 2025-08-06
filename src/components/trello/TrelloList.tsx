import { useRef, useEffect, useState } from 'react';
import { Card as CardType, List as ListType } from '@/types/trello';
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
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

type TrelloListProps = {
  list: ListType;
  onAddCard: (listId: string, content: string) => Promise<void>;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onUpdateList: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
};

export const TrelloList = ({ list, onAddCard, onUpdateCard, onDeleteCard, onUpdateList, onDeleteList }: TrelloListProps) => {
  const ref = useRef(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ listId: list.id }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [list.id]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onUpdateList(list.id, title);
      setIsEditing(false);
    }
  };

  return (
    <>
      <Card ref={ref} className={`w-72 flex-shrink-0 transition-colors ${isDraggedOver ? 'bg-secondary' : 'bg-gray-100'}`}>
        <CardHeader className="p-3 flex flex-row items-center justify-between">
          {isEditing ? (
            <form onSubmit={handleTitleSubmit} className="flex-grow">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="h-8"
              />
            </form>
          ) : (
            <CardTitle className="text-base font-medium cursor-pointer" onClick={() => setIsEditing(true)}>
              {list.title}
            </CardTitle>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-1 pt-0 min-h-[2rem]">
          {list.cards.map(card => (
            <TrelloCard
              key={card.id}
              card={card}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
            />
          ))}
        </CardContent>
        <div className="p-1 pt-0">
          <AddCardForm listId={list.id} onAddCard={onAddCard} />
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the list and all its cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteList(list.id)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};