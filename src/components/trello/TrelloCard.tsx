import { useRef, useEffect, useState } from 'react';
import { Card as CardType } from '@/types/trello';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { AlignLeft, CalendarDays } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { getCoverStyle } from '@/lib/utils';

type TrelloCardProps = {
  card: CardType;
  onCardClick: (card: CardType) => void;
};

export const TrelloCard = ({ card, onCardClick }: TrelloCardProps) => {
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
    const { error } = await supabase.from('cards').update({ is_completed: checked }).eq('id', card.id);
    if (error) {
      showError('Failed to update task status.');
    }
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
      
      {card.cover_config && (
        <div
          style={coverStyle}
          className={cn(
            'bg-cover bg-center',
            hasFullCover ? 'h-28 rounded-md flex items-end p-3' : 'h-8 rounded-t-md'
          )}
        >
          {hasFullCover && (
            <p className={cn("font-semibold break-words", isDark ? 'text-white' : 'text-gray-900')}>{card.content}</p>
          )}
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
          {dueDateBadge}
        </div>
      </div>
    </Card>
  );
};