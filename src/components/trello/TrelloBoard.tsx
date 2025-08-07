import { useState, useEffect, useMemo } from 'react';
import { Board as BoardType, Card as CardType, List as ListType, Label as LabelType } from '@/types/trello';
import { TrelloList } from './TrelloList';
import { AddListForm } from './AddListForm';
import { CardDetailsModal } from './CardDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { showError, showSuccess } from '@/utils/toast';

type TrelloBoardProps = {
  initialBoard: BoardType;
  modalCardId: string | null;
  onModalOpenChange: (isOpen: boolean, cardId?: string) => void;
};

const TrelloBoard = ({ initialBoard, modalCardId, onModalOpenChange }: TrelloBoardProps) => {
  const [board, setBoard] = useState(initialBoard);

  const allCards = useMemo(() => board.lists.flatMap(l => l.cards), [board.lists]);
  const modalCard = useMemo(() => allCards.find(c => c.id === modalCardId) || null, [allCards, modalCardId]);

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

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
    await handleMoveCard(cardId, destListId, destCardId);
  };

  const handleListDrop = async (sourceData: Record<string, unknown>, destData: Record<string, unknown>) => {
    const sourceListId = sourceData.listId as string;
    const destListId = destData.listId as string;

    if (sourceListId === destListId) return;
    await handleMoveList(sourceListId, undefined, destListId);
  };

  const handleMoveCard = async (cardId: string, newListId: string, beforeCardId?: string) => {
    const originalBoard = JSON.parse(JSON.stringify(board));
    let cardToMove: CardType | undefined;
    let sourceListId: string | undefined;

    const tempBoard = JSON.parse(JSON.stringify(board));
    for (const list of tempBoard.lists) {
      const cardIndex = list.cards.findIndex((c: CardType) => c.id === cardId);
      if (cardIndex > -1) {
        sourceListId = list.id;
        [cardToMove] = list.cards.splice(cardIndex, 1);
        break;
      }
    }

    if (!cardToMove || !sourceListId) return;

    const destList = tempBoard.lists.find((l: ListType) => l.id === newListId);
    if (!destList) return;

    const destIndex = beforeCardId ? destList.cards.findIndex((c: CardType) => c.id === beforeCardId) : destList.cards.length;
    destList.cards.splice(destIndex, 0, cardToMove);

    const cardBefore = destList.cards[destIndex - 1];
    const cardAfter = destList.cards[destIndex + 1];
    const posBefore = cardBefore ? cardBefore.position : 0;
    const posAfter = cardAfter ? cardAfter.position : (posBefore + 2);
    const newPosition = (posBefore + posAfter) / 2;

    cardToMove.position = newPosition;
    cardToMove.list_id = newListId;

    setBoard(tempBoard);

    const { error } = await supabase.from('cards').update({ list_id: newListId, position: newPosition }).eq('id', cardId);
    if (error) {
      showError('Failed to move card.');
      setBoard(originalBoard);
    }
  };

  const handleMoveList = async (listId: string, direction?: 'left' | 'right', targetListId?: string) => {
    const originalBoard = JSON.parse(JSON.stringify(board));
    const lists = [...board.lists].sort((a, b) => a.position - b.position);
    const currentIndex = lists.findIndex(l => l.id === listId);
    if (currentIndex === -1) return;

    let targetIndex: number;
    if (direction) {
      if (direction === 'left' && currentIndex === 0) return;
      if (direction === 'right' && currentIndex === lists.length - 1) return;
      targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    } else if (targetListId) {
      targetIndex = lists.findIndex(l => l.id === targetListId);
    } else {
      return;
    }
    
    const tempBoard = JSON.parse(JSON.stringify(board));
    const tempLists = tempBoard.lists.sort((a: ListType, b: ListType) => a.position - b.position);
    const [movedList] = tempLists.splice(currentIndex, 1);
    tempLists.splice(targetIndex, 0, movedList);
    tempBoard.lists = tempLists;

    const listBefore = tempBoard.lists[targetIndex - 1];
    const listAfter = tempBoard.lists[targetIndex + 1];
    const posBefore = listBefore ? listBefore.position : 0;
    const posAfter = listAfter ? listAfter.position : (posBefore + 2);
    const newPosition = (posBefore + posAfter) / 2;
    
    movedList.position = newPosition;
    setBoard(tempBoard);

    const { error } = await supabase.from('lists').update({ position: newPosition }).eq('id', listId);
    if (error) {
      showError('Failed to move list.');
      setBoard(originalBoard);
    }
  };

  const handleAddCard = async (listId: string, content: string, afterPosition?: number) => {
    const list = board.lists.find(l => l.id === listId);
    if (!list) return;

    let newPosition: number;

    if (afterPosition !== undefined) {
      const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);
      const afterIndex = sortedCards.findIndex(c => c.position === afterPosition);
      
      const cardBefore = sortedCards[afterIndex];
      const cardAfter = sortedCards[afterIndex + 1];

      const posBefore = cardBefore ? cardBefore.position : 0;
      const posAfter = cardAfter ? cardAfter.position : (posBefore + 2);
      newPosition = (posBefore + posAfter) / 2;
    } else {
      newPosition = list.cards.length > 0 ? Math.max(...list.cards.map(c => c.position)) + 1 : 1;
    }

    const { data: newCard, error } = await supabase.from('cards').insert({ list_id: listId, content, position: newPosition, is_completed: false }).select('*').single();
    if (error) {
      showError('Failed to add card: ' + error.message);
    } else if (newCard) {
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, {...newCard, labels: [], related_cards: []}].sort((a, b) => a.position - b.position) } : l) }));
      showSuccess('Card added!');
    }
  };

  const handleAddList = async (title: string) => {
    const newPosition = board.lists.length > 0 ? Math.max(...board.lists.map(l => l.position)) + 1 : 1;
    const { data: newList, error } = await supabase.from('lists').insert({ board_id: board.id, title, position: newPosition }).select().single();
    if (error) {
      showError('Failed to add list: ' + error.message);
    } else if (newList) {
      setBoard(b => ({ ...b, lists: [...b.lists, { ...newList, cards: [] }].sort((a,b) => a.position - b.position) }));
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

  const handleCreateLabel = async (name: string, color: string) => {
    const { data: newLabel, error } = await supabase.from('labels').insert({ board_id: board.id, name, color }).select().single();
    if (error) {
      showError('Failed to create label.');
    } else if (newLabel) {
      setBoard(b => ({ ...b, labels: [...b.labels, newLabel] }));
      showSuccess('Label created!');
    }
  };

  const handleUpdateLabel = async (labelId: string, data: Partial<Pick<LabelType, 'name' | 'color'>>) => {
    const { error } = await supabase.from('labels').update(data).eq('id', labelId);
    if (error) {
      showError('Failed to update label.');
    } else {
      setBoard(b => ({ ...b, labels: b.labels.map(l => l.id === labelId ? { ...l, ...data } : l) }));
      showSuccess('Label updated!');
    }
  };

  const handleToggleLabelOnCard = async (cardId: string, labelId: string) => {
    const card = board.lists.flatMap(l => l.cards).find(c => c.id === cardId);
    if (!card) return;
    const isApplied = card.labels.some(l => l.id === labelId);
    
    const originalBoard = JSON.parse(JSON.stringify(board));
    const tempBoard = JSON.parse(JSON.stringify(board));
    const cardToUpdate = tempBoard.lists.flatMap((l: ListType) => l.cards).find((c: CardType) => c.id === cardId);
    
    if (isApplied) {
      cardToUpdate.labels = cardToUpdate.labels.filter((l: LabelType) => l.id !== labelId);
    } else {
      const labelToAdd = tempBoard.labels.find((l: LabelType) => l.id === labelId);
      if (labelToAdd) cardToUpdate.labels.push(labelToAdd);
    }
    setBoard(tempBoard);

    const { error } = isApplied
      ? await supabase.from('card_labels').delete().match({ card_id: cardId, label_id: labelId })
      : await supabase.from('card_labels').insert({ card_id: cardId, label_id: labelId });

    if (error) {
      showError('Failed to update label on card.');
      setBoard(originalBoard);
    }
  };

  const handleAddRelation = async (card1Id: string, card2Id: string) => {
    const [id1, id2] = [card1Id, card2Id].sort();
    const { error } = await supabase.from('card_relations').insert({ card1_id: id1, card2_id: id2 });

    if (error) {
      showError('Failed to add related card.');
    } else {
      const card1 = allCards.find(c => c.id === card1Id);
      const card2 = allCards.find(c => c.id === card2Id);
      if (!card1 || !card2) return;

      const newBoard = { ...board };
      const updateCard = (card: CardType, relatedCard: CardType) => {
        const list = newBoard.lists.find(l => l.id === card.list_id);
        if (!list) return;
        const cardIndex = list.cards.findIndex(c => c.id === card.id);
        if (cardIndex === -1) return;
        list.cards[cardIndex].related_cards.push({ id: relatedCard.id, content: relatedCard.content, list_title: newBoard.lists.find(l => l.id === relatedCard.list_id)?.title || '' });
      };
      
      updateCard(card1, card2);
      updateCard(card2, card1);
      
      setBoard(newBoard);
      showSuccess('Related card added.');
    }
  };

  const handleRemoveRelation = async (card1Id: string, card2Id: string) => {
    const [id1, id2] = [card1Id, card2Id].sort();
    const { error } = await supabase.from('card_relations').delete().match({ card1_id: id1, card2_id: id2 });

    if (error) {
      showError('Failed to remove related card.');
    } else {
      const newBoard = { ...board };
      const updateCard = (cardId: string, relatedCardId: string) => {
        const card = allCards.find(c => c.id === cardId);
        if (!card) return;
        const list = newBoard.lists.find(l => l.id === card.list_id);
        if (!list) return;
        const cardIndex = list.cards.findIndex(c => c.id === card.id);
        if (cardIndex === -1) return;
        list.cards[cardIndex].related_cards = list.cards[cardIndex].related_cards.filter(rc => rc.id !== relatedCardId);
      };

      updateCard(card1Id, card2Id);
      updateCard(card2Id, card1Id);

      setBoard(newBoard);
      showSuccess('Related card removed.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex gap-4 overflow-x-auto pb-4 items-start">
        {board.lists.sort((a, b) => a.position - b.position).map(list => (
          <TrelloList
            key={list.id}
            list={list}
            lists={board.lists.sort((a, b) => a.position - b.position)}
            boardLabels={board.labels}
            onCardClick={(card) => onModalOpenChange(true, card.id)}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            onMoveList={handleMoveList}
          />
        ))}
        <AddListForm onAddList={handleAddList} />
      </div>
      {modalCard && (
        <CardDetailsModal
          key={modalCard.id}
          isOpen={!!modalCardId}
          onOpenChange={(isOpen) => onModalOpenChange(isOpen)}
          card={modalCard}
          allCards={allCards}
          lists={board.lists}
          boardLabels={board.labels}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onMoveCard={handleMoveCard}
          onToggleLabelOnCard={handleToggleLabelOnCard}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onAddRelation={handleAddRelation}
          onRemoveRelation={handleRemoveRelation}
          onSelectCard={(cardId) => onModalOpenChange(true, cardId)}
        />
      )}
    </div>
  );
};

export default TrelloBoard;