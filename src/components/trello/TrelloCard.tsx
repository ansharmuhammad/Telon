import { useRef, useEffect, useState } from 'react';
import { Card as CardType } from '@/types/trello';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { AlignLeft, CalendarDays, CheckSquare, Paperclip } from 'lucide-react';
import { format, isPast, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCoverStyle } from '@/lib/utils';

type TrelloCardProps = {
  card: CardType;
  onCardClick: (card: CardType) => void;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
};

export const TrelloCard = ({ card, onCardClick, onUpdateCard }: TrelloCardProps) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleCheck = async (checked: boolean) => {
    await onUpdateCard(card.id, { is_completed: checked });
  };

  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !card.is_completed;
  const isDueSoon = dueDate && !isPast(dueDate) && differenceInHours(dueDate, new Date()) < 24 && !card.is_completed;

  const dueDateBadge = dueDate && (
    <span className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      card.is_completed ? "bg-green-100 text-green-800" :
      isOverdue ? "bg-red-100 text-red-800" :
      isDueSoon ? "bg-yellow-100 text-yellow-800" :
      "bg-gray-200"
    )}>
      <CalendarDays className="h-3 w-3" />
      <span>{format(dueDate, 'MMM d')}</span>
    </span>
  );

  const totalChecklistItems = card.checklists?.reduce((sum, cl) => sum + cl.items.length, 0) || 0;
  const completedChecklistItems = card.checklists?.reduce((sum, cl) => sum + cl.items.filter(i => i.is_completed).length, 0) || 0;

  const checklistBadge = totalChecklistItems > 0 && (
    <span className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      completedChecklistItems === totalChecklistItems ? "bg-green-100 text-green-800" : "bg-gray-200"
    )}>
      <CheckSquare className="h-3 w-3" />
      <span>{completedChecklistItems}/{totalChecklistItems}</span>
    </span>
  );

  const { style: coverStyle, isDark } = getCoverStyle(card.cover_config);
  const hasFullCover = card.cover_config?.size === 'full';

  return (
    <Card
      ref={ref}
      onClick={() => onCardClick(card)}
      className={cn(
        'bg-white cursor-pointer hover:bg-gray-50 relative group',
        isDragging && 'opacity-50',
        card.is_completed && !hasFullCover && 'bg-gray-50',
        hasFullCover && 'bg-transparent border-none shadow-none'
      )}
    >
      {isDraggedOver && <div className="absolute inset-0 bg-blue-200 opacity-50 rounded-md z-10" />}
      
      {card.cover_config && !hasFullCover && (
        <div
          style={coverStyle}
          className="h-8 rounded-t-md bg-cover bg-center"
        />
      )}

      {hasFullCover && (
        <div
          style={coverStyle}
          className="h-28 rounded-md flex items-end p-3 bg-cover bg-center relative"
        >
          <p className={cn("font-semibold break-words relative z-10", isDark ? 'text-white' : 'text-gray-900')}>{card.content}</p>
          
          <div className={cn(
            "absolute inset-0 rounded-md transition-colors",
            card.is_completed ? "bg-black/50" : "bg-black/20 opacity-0 group-hover:opacity-100"
          )} />
          <Checkbox
            id={`card-check-cover-${card.id}`}
            checked={card.is_completed}
            onCheckedChange={(checked) => handleCheck(Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-2 right-2 z-20 border-white/50 text-white data-[state=checked]:bg-green-500 data-[state=checked]:border-green-600",
              !card.is_completed && "opacity-0 group-hover:opacity-100"
            )}
          />
        </div>
      )}

      <div className={cn(hasFullCover ? 'hidden' : 'p-3')}>
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map(label => (
              <div
                key={label.id}
                className="h-2 rounded-sm w-10"
                style={{ backgroundColor: label.color }}
                title={label.name || ''}
              />
            ))}
          </div>
        )}
        <div className="flex items-start gap-2">
          <Checkbox
            id={`card-check-${card.id}`}
            checked={card.is_completed}
            onCheckedChange={(checked) => handleCheck(Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          <p className={cn("flex-grow", card.is_completed && "line-through text-muted-foreground")}>{card.content}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2 pl-6">
          {card.description && (
            <AlignLeft className="h-4 w-4" />
          )}
          {card.attachments && card.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              <span>{card.attachments.length}</span>
            </span>
          )}
          {dueDateBadge}
          {checklistBadge}
        </div>
      </div>
    </Card>
  );
};