import { useRef, useEffect, useState } from 'react';
import { Card as CardType } from '@/types/trello';
import { Card, CardContent } from '@/components/ui/card';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

export const CardItem = ({ card }: { card: CardType }) => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <Card ref={ref} className={`bg-white ${isDragging ? 'opacity-50' : ''}`}>
      <CardContent className="p-3">
        {card.content}
      </CardContent>
    </Card>
  );
};