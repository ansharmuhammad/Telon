import { useRef, useEffect, useState } from 'react';
import { List as ListType } from '@/types/trello';
import { CardItem } from './CardItem';
import { AddCardForm } from './AddCardForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

type ColumnProps = {
  list: ListType;
  onAddCard: (listId: string, content: string) => Promise<void>;
};

export const Column = ({ list, onAddCard }: ColumnProps) => {
  const ref = useRef(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

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

  return (
    <Card ref={ref} className={`w-72 flex-shrink-0 transition-colors ${isDraggedOver ? 'bg-secondary' : 'bg-gray-100'}`}>
      <CardHeader className="p-3">
        <CardTitle className="text-base">{list.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-1 pt-0 min-h-[2rem]">
        {list.cards.map(card => (
          <CardItem key={card.id} card={card} />
        ))}
      </CardContent>
      <div className="p-1 pt-0">
        <AddCardForm listId={list.id} onAddCard={onAddCard} />
      </div>
    </Card>
  );
};