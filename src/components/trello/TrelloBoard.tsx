import { useState, useEffect } from 'react';
import { Board as BoardType, Card as CardType } from '@/types/trello';
import { Column } from './Column';
import { supabase } from '@/integrations/supabase/client';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/monitor/adapter';

type TrelloBoardProps = {
  initialBoard: BoardType;
};

const TrelloBoard = ({ initialBoard }: TrelloBoardProps) => {
  const [board, setBoard] = useState(initialBoard);

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const cardId = source.data.cardId as string;
        const destListId = destination.data.listId as string;

        let sourceListId = '';
        let cardToMove: CardType | undefined;
        board.lists.forEach(list => {
          const card = list.cards.find(c => c.id === cardId);
          if (card) {
            cardToMove = card;
            sourceListId = list.id;
          }
        });

        if (!cardToMove || sourceListId === destListId) return;

        const originalBoard = board;

        setBoard(currentBoard => {
          const newBoard = JSON.parse(JSON.stringify(currentBoard));
          const sourceList = newBoard.lists.find(l => l.id === sourceListId);
          const destList = newBoard.lists.find(l => l.id === destListId);
          if (!sourceList || !destList) return currentBoard;

          const cardIndex = sourceList.cards.findIndex(c => c.id === cardId);
          const [movedCard] = sourceList.cards.splice(cardIndex, 1);
          
          movedCard.list_id = destListId;
          destList.cards.push(movedCard);
          
          return newBoard;
        });

        supabase
          .from('cards')
          .update({ list_id: destListId })
          .eq('id', cardId)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to move card:', error);
              setBoard(originalBoard);
            }
          });
      },
    });
  }, [board]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.lists.map(list => (
          <Column key={list.id} list={list} />
        ))}
      </div>
    </div>
  );
};

export default TrelloBoard;