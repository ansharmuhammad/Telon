import { useState, useEffect } from 'react';
import { Board as BoardType, Card as CardType, List as ListType } from '@/types/trello';
import { TrelloList } from './TrelloList';
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
    // DND logic remains the same
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const cardId = source.data.cardId as string;
        const destListId = destination.data.listId as string;

        let sourceListId = '';
        board.lists.forEach(list => {
          if (list.cards.find(c => c.id === cardId)) {
            sourceListId = list.id;
          }
        });

        if (!sourceListId || sourceListId === destListId) return;

        const originalBoard = { ...board };
        setBoard(currentBoard => {
          const newBoard = JSON.parse(JSON.stringify(currentBoard));
          const sourceList = newBoard.lists.find(l => l.id === sourceListId)!;
          const destList = newBoard.lists.find(l => l.id === destListId)!;
          const cardIndex = sourceList.cards.findIndex(c => c.id === cardId);
          const [movedCard] = sourceList.cards.splice(cardIndex, 1);
          movedCard.list_id = destListId;
          destList.cards.push(movedCard);
          return newBoard;
        });

        supabase.from('cards').update({ list_id: destListId }).eq('id', cardId)
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
    const { data: newCard, error } = await supabase.from('cards').insert({ list_id: listId, content, position: newPosition }).select().single();
    if (error) {
      showError('Failed to add card: ' + error.message);
    } else if (newCard) {
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l) }));
      showSuccess('Card added!');
    }
  };

  const handleAddList = async (title: string) => {
    const newPosition = board.lists.length > 0 ? Math.max(...board.lists.map(l => l.position)) + 1 : 1;
    const { data: newList, error } = await supabase.from('lists').insert({ board_id: board.id, title, position: newPosition }).select().single();
    if (error) {
      showError('Failed to add list: ' + error.message);
    } else if (newList) {
      setBoard(b => ({ ...b, lists: [...b.lists, { ...newList, cards: [] }] }));
      showSuccess('List added!');
    }
  };

  const handleUpdateCard = async (cardId: string, content: string) => {
    const { error } = await supabase.from('cards').update({ content }).eq('id', cardId);
    if (error) {
      showError('Failed to update card.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, content } : c) })) }));
      showSuccess('Card updated!');
    }
  };

  const handleDeleteCard = async (cardId: string, listId: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (error) {
      showError('Failed to delete card.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l) }));
      showSuccess('Card deleted.');
    }
  };

  const handleUpdateList = async (listId: string, title: string) => {
    const { error } = await supabase.from('lists').update({ title }).eq('id', listId);
    if (error) {
      showError('Failed to update list title.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }));
      showSuccess('List updated!');
    }
  };

  const handleDeleteList = async (listId: string) => {
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (error) {
      showError('Failed to delete list.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.filter(l => l.id !== listId) }));
      showSuccess('List deleted.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">{board.name}</h1>
      <div className="flex-grow flex gap-4 overflow-x-auto pb-4 items-start">
        {board.lists.map(list => (
          <TrelloList
            key={list.id}
            list={list}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
          />
        ))}
        <AddListForm onAddList={handleAddList} />
      </div>
    </div>
  );
};

export default TrelloBoard;