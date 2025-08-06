import { useRef, useEffect, useState } from 'react';
import { List as ListType } from '@/types/trello';
import { CardItem } from './CardItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

export const Column = ({ list }: { list: ListType }) => {
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
      <CardHeader>
        <CardTitle>{list.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 min-h-[4rem]">
        {list.cards.map(card => (
          <CardItem key={card.id} card={card} />
        ))}
      </CardContent>
    </Card>
  );
};