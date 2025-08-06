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
    return monitorForElements({
      onDrop: async ({ source, location }) => {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const type = source.data.type as 'card' | 'list';

        if (type === 'card') {
          handleCardDrop(source.data, destination.data);
        } else if (type === 'list') {
          handleListDrop(source.data, destination.data);
        }
      },
    });
  }, [board]);

  const handleCardDrop = async (sourceData: Record<string, unknown>, destData: Record<string, unknown>) => {
    const cardId = sourceData.cardId as string;
    const destListId = destData.listId as string;
    const destCardId = destData.cardId as string | undefined;

    if (cardId === destCardId) return;

    const originalBoard = JSON.parse(JSON.stringify(board));
    let movedCard: CardType | undefined;

    const tempBoard = JSON.parse(JSON.stringify(board));
    for (const list of tempBoard.lists) {
      const cardIndex = list.cards.findIndex((c: CardType) => c.id === cardId);
      if (cardIndex > -1) {
        [movedCard] = list.cards.splice(cardIndex, 1);
        break;
      }
    }

    if (!movedCard) return;

    const destList = tempBoard.lists.find((l: ListType) => l.id === destListId);
    if (!destList) return;

    const destIndex = destCardId ? destList.cards.findIndex((c: CardType) => c.id === destCardId) : destList.cards.length;
    destList.cards.splice(destIndex, 0, movedCard);

    const cardBefore = destList.cards[destIndex - 1];
    const cardAfter = destList.cards[destIndex + 1];
    const posBefore = cardBefore ? cardBefore.position : 0;
    const posAfter = cardAfter ? cardAfter.position : (posBefore + 2);
    const newPosition = (posBefore + posAfter) / 2;

    movedCard.position = newPosition;
    movedCard.list_id = destListId;

    setBoard(tempBoard);

    const { error } = await supabase.from('cards').update({ list_id: destListId, position: newPosition }).eq('id', cardId);
    if (error) {
      showError('Failed to move card.');
      setBoard(originalBoard);
    }
  };

  const handleListDrop = async (sourceData: Record<string, unknown>, destData: Record<string, unknown>) => {
    const sourceListId = sourceData.listId as string;
    const destListId = destData.listId as string;

    if (sourceListId === destListId) return;

    const originalBoard = JSON.parse(JSON.stringify(board));
    const tempBoard = JSON.parse(JSON.stringify(board));

    const sourceListIndex = tempBoard.lists.findIndex((l: ListType) => l.id === sourceListId);
    const [movedList] = tempBoard.lists.splice(sourceListIndex, 1);

    const destListIndex = tempBoard.lists.findIndex((l: ListType) => l.id === destListId);
    tempBoard.lists.splice(destListIndex, 0, movedList);

    const listBefore = tempBoard.lists[destListIndex - 1];
    const listAfter = tempBoard.lists[destListIndex + 1];
    const posBefore = listBefore ? listBefore.position : 0;
    const posAfter = listAfter ? listAfter.position : (posBefore + 2);
    const newPosition = (posBefore + posAfter) / 2;

    movedList.position = newPosition;

    setBoard(tempBoard);

    const { error } = await supabase.from('lists').update({ position: newPosition }).eq('id', sourceListId);
    if (error) {
      showError('Failed to move list.');
      setBoard(originalBoard);
    }
  };

  const handleAddCard = async (listId: string, content: string) => {
    const list = board.lists.find(l => l.id === listId);
    if (!list) return;
    const newPosition = list.cards.length > 0 ? Math.max(...list.cards.map(c => c.position)) + 1 : 1;
    const { data: newCard, error } = await supabase.from('cards').insert({ list_id: listId, content, position: newPosition }).select('*').single();
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

  const handleUpdateCard = async (cardId: string, data: Partial<CardType>) => {
    const { error } = await supabase.from('cards').update(data).eq('id', cardId);
    if (error) {
      showError('Failed to update card.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...data } : c) })) }));
      if (data.is_completed !== undefined) {
        showSuccess(data.is_completed ? 'Task completed!' : 'Task marked as not completed.');
      } else {
        showSuccess('Card updated!');
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const listId = board.lists.find(l => l.cards.some(c => c.id === cardId))?.id;
    if (!listId) return;

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