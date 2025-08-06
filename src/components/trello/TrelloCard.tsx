import { useRef, useEffect, useState } from 'react';
import { Card as CardType } from '@/types/trello';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CardDetailsModal } from './CardDetailsModal';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { AlignLeft, CalendarDays } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

type TrelloCardProps = {
  card: CardType;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
};

export const TrelloCard = ({ card, onUpdateCard, onDeleteCard }: TrelloCardProps) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const drag = draggable({
      element: el,
      getInitialData: () => ({ cardId: card.id, type: 'card' }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    const drop = dropTargetForElements({
      element: el,
      getData: () => ({ cardId: card.id, listId: card.list_id }),
      canDrop: ({ source }) => source.data.type === 'card' && source.data.cardId !== card.id,
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });

    return () => {
      drag();
      drop();
    };
  }, [card.id, card.list_id]);

  const handleCheck = (checked: boolean) => {
    onUpdateCard(card.id, { is_completed: checked });
  };

  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueSoon = dueDate && isToday(dueDate);

  const dueDateBadge = dueDate && (
    <span className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      card.is_completed ? "bg-green-100 text-green-800" :
      isOverdue ? "bg-red-100 text-red-800" :
      isDueSoon ? "bg-yellow-100 text-yellow-800" :
      "bg-transparent"
    )}>
      <CalendarDays className="h-3 w-3" />
      <span>{format(dueDate, 'MMM d')}</span>
    </span>
  );

  return (
    <>
      <Card
        ref={ref}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          'bg-white cursor-pointer hover:bg-gray-50 relative',
          isDragging && 'opacity-50',
          card.is_completed && 'bg-gray-50'
        )}
      >
        {isDraggedOver && <div className="absolute inset-0 bg-blue-200 opacity-50 rounded-md z-10" />}
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id={`card-check-${card.id}`}
              checked={card.is_completed}
              onCheckedChange={handleCheck}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            <p className={cn("flex-grow", card.is_completed && "line-through text-muted-foreground")}>{card.content}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2 pl-6">
            {card.description && (
              <AlignLeft className="h-4 w-4" />
            )}
            {dueDateBadge}
          </div>
        </CardContent>
      </Card>

      <CardDetailsModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        card={card}
        onUpdateCard={onUpdateCard}
        onDeleteCard={onDeleteCard}
      />
    </>
  );
};