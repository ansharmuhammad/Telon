import { useRef, useEffect, useState } from 'react';
import { Card as CardType } from '@/types/trello';
import { Card, CardContent } from '@/components/ui/card';
import { CardDetailsModal } from './CardDetailsModal';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { AlignLeft, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

type TrelloCardProps = {
  card: CardType;
  onUpdateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
};

export const TrelloCard = ({ card, onUpdateCard, onDeleteCard }: TrelloCardProps) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ cardId: card.id }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [card.id]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'MMM d');
  };

  const startDate = formatDate(card.start_date);
  const dueDate = formatDate(card.due_date);

  return (
    <>
      <Card
        ref={ref}
        onClick={() => setIsModalOpen(true)}
        className={`bg-white cursor-pointer hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''}`}
      >
        <CardContent className="p-3">
          <p className="mb-2">{card.content}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {card.description && (
              <div className="flex items-center gap-1">
                <AlignLeft className="h-3 w-3" />
              </div>
            )}
            {(startDate || dueDate) && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>
                  {startDate}
                  {startDate && dueDate && ' - '}
                  {dueDate}
                </span>
              </div>
            )}
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