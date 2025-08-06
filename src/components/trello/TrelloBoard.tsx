import { useState, useEffect } from 'react';
import { Board as BoardType, Card as CardType, List as ListType } from '@/types/trello';
import { Column } from './Column';
import { AddListForm } from './AddListForm';
import { supabase } from '@/integrations/supabase/client';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { showError, showSuccess } from '@/utils/toast';

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
              showError('Failed to move card.');
              setBoard(originalBoard);
            }
          });
      },
    });
  }, [board]);

  const handleAddCard = async (listId: string, content: string) => {
    const list = board.lists.find(l => l.id === listId);
    if (!list) return;

    const newPosition = list.cards.length > 0 ? Math.max(...list.cards.map(c => c.position)) + 1 : 1;

    const { data: newCard, error } = await supabase
      .from('cards')
      .insert({ list_id: listId, content, position: newPosition })
      .select()
      .single();

    if (error) {
      showError('Failed to add card: ' + error.message);
      return;
    }

    if (newCard) {
      setBoard(currentBoard => {
        const newBoard = JSON.parse(JSON.stringify(currentBoard));
        const targetList = newBoard.lists.find(l => l.id === listId);
        if (targetList) {
          targetList.cards.push(newCard);
        }
        return newBoard;
      });
      showSuccess('Card added!');
    }
  };

  const handleAddList = async (title: string) => {
    const newPosition = board.lists.length > 0 ? Math.max(...board.lists.map(l => l.position)) + 1 : 1;

    const { data: newList, error } = await supabase
      .from('lists')
      .insert({ board_id: board.id, title, position: newPosition })
      .select()
      .single();

    if (error) {
      showError('Failed to add list: ' + error.message);
      return;
    }

    if (newList) {
      setBoard(currentBoard => {
        const newBoard = JSON.parse(JSON.stringify(currentBoard));
        newBoard.lists.push({ ...newList, cards: [] });
        return newBoard;
      });
      showSuccess('List added!');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
      <div className="flex-grow flex gap-4 overflow-x-auto pb-4 items-start">
        {board.lists.map(list => (
          <Column key={list.id} list={list} onAddCard={handleAddCard} />
        ))}
        <AddListForm onAddList={handleAddList} />
      </div>
    </div>
  );
};

export default TrelloBoard;