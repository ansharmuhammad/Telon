import { useState, useEffect, useMemo } from 'react';
import { Board as BoardType, Card as CardType, List as ListType, Label as LabelType, ChecklistItem, Comment } from '@/types/trello';
import { TrelloList } from './TrelloList';
import { AddListForm } from './AddListForm';
import { CardDetailsModal } from './CardDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

type TrelloBoardProps = {
  initialBoard: BoardType;
  modalCardId: string | null;
  onModalOpenChange: (isOpen: boolean, cardId?: string) => void;
};

const TrelloBoard = ({ initialBoard, modalCardId, onModalOpenChange }: TrelloBoardProps) => {
  const [board, setBoard] = useState(initialBoard);
  const { session } = useAuth();
  const channel = useMemo<RealtimeChannel>(() => supabase.channel(`board-channel:${initialBoard.id}`), [initialBoard.id]);

  useEffect(() => {
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`TrelloBoard subscribed to channel for broadcasting.`);
      }
    });
    return () => {
      supabase.removeChannel(subscription);
    }
  }, [channel]);

  const broadcastUpdate = () => {
    channel.send({
      type: 'broadcast',
      event: 'board-update',
      payload: { sender: session?.user.id }
    });
  };

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
    } else {
      broadcastUpdate();
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
    } else {
      broadcastUpdate();
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
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, {...newCard, labels: [], related_cards: [], checklists: [], attachments: [], comments: []}].sort((a, b) => a.position - b.position) } : l) }));
      showSuccess('Card added!');
      broadcastUpdate();
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
      broadcastUpdate();
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
      broadcastUpdate();
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
      broadcastUpdate();
    }
  };

  const handleUpdateList = async (listId: string, title: string) => {
    const { error } = await supabase.from('lists').update({ title }).eq('id', listId);
    if (error) {
      showError('Failed to update list title.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }));
      showSuccess('List updated!');
      broadcastUpdate();
    }
  };

  const handleDeleteList = async (listId: string) => {
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (error) {
      showError('Failed to delete list.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.filter(l => l.id !== listId) }));
      showSuccess('List deleted.');
      broadcastUpdate();
    }
  };

  const handleCreateLabel = async (name: string, color: string) => {
    const { data: newLabel, error } = await supabase.from('labels').insert({ board_id: board.id, name, color }).select().single();
    if (error) {
      showError('Failed to create label.');
    } else if (newLabel) {
      setBoard(b => ({ ...b, labels: [...b.labels, newLabel] }));
      showSuccess('Label created!');
      broadcastUpdate();
    }
  };

  const handleUpdateLabel = async (labelId: string, data: Partial<Pick<LabelType, 'name' | 'color'>>) => {
    const { error } = await supabase.from('labels').update(data).eq('id', labelId);
    if (error) {
      showError('Failed to update label.');
    } else {
      setBoard(b => ({ ...b, labels: b.labels.map(l => l.id === labelId ? { ...l, ...data } : l) }));
      showSuccess('Label updated!');
      broadcastUpdate();
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
    } else {
      broadcastUpdate();
    }
  };

  const handleAddRelation = async (card1Id: string, card2Id: string) => {
    const [id1, id2] = [card1Id, card2Id].sort();
    const { error } = await supabase.from('card_relations').insert({ card1_id: id1, card2_id: id2 });

    if (error) {
      showError('Failed to add related card.');
    } else {
      showSuccess('Related card added.');
      broadcastUpdate();
    }
  };

  const handleRemoveRelation = async (card1Id: string, card2Id: string) => {
    const [id1, id2] = [card1Id, card2Id].sort();
    const { error } = await supabase.from('card_relations').delete().match({ card1_id: id1, card2_id: id2 });

    if (error) {
      showError('Failed to remove related card.');
    } else {
      showSuccess('Related card removed.');
      broadcastUpdate();
    }
  };

  const handleAddChecklist = async (cardId: string, title: string) => {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;
    const newPosition = card.checklists.length > 0 ? Math.max(...card.checklists.map(cl => cl.position)) + 1 : 1;
    const { data, error } = await supabase.from('checklists').insert({ card_id: cardId, title, position: newPosition }).select().single();
    if (error) {
      showError('Failed to add checklist.');
    } else {
      const newChecklist = { ...data, items: [] };
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, checklists: [...c.checklists, newChecklist].sort((a,b) => a.position - b.position) } : c) })) }));
      showSuccess('Checklist added!');
      broadcastUpdate();
    }
  };

  const handleUpdateChecklist = async (checklistId: string, title: string) => {
    const { error } = await supabase.from('checklists').update({ title }).eq('id', checklistId);
    if (error) {
      showError('Failed to update checklist.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, title } : cl) })) })) }));
      showSuccess('Checklist updated!');
      broadcastUpdate();
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    const { error } = await supabase.from('checklists').delete().eq('id', checklistId);
    if (error) {
      showError('Failed to delete checklist.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, checklists: c.checklists.filter(cl => cl.id !== checklistId) })) })) }));
      showSuccess('Checklist deleted.');
      broadcastUpdate();
    }
  };

  const handleAddChecklistItem = async (checklistId: string, content: string) => {
    const checklist = allCards.flatMap(c => c.checklists).find(cl => cl.id === checklistId);
    if (!checklist) return;
    const newPosition = checklist.items.length > 0 ? Math.max(...checklist.items.map(i => i.position)) + 1 : 1;
    const { data, error } = await supabase.from('checklist_items').insert({ checklist_id: checklistId, content, position: newPosition }).select().single();
    if (error) {
      showError('Failed to add item.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, checklists: c.checklists.map(cl => cl.id === checklistId ? { ...cl, items: [...cl.items, data].sort((a,b) => a.position - b.position) } : cl) })) })) }));
      broadcastUpdate();
    }
  };

  const handleUpdateChecklistItem = async (itemId: string, itemData: Partial<Pick<ChecklistItem, 'content' | 'is_completed'>>) => {
    const { error } = await supabase.from('checklist_items').update(itemData).eq('id', itemId);
    if (error) {
      showError('Failed to update item.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, checklists: c.checklists.map(cl => ({ ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, ...itemData } : i) })) })) })) }));
      broadcastUpdate();
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
    if (error) {
      showError('Failed to delete item.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, checklists: c.checklists.map(cl => ({ ...cl, items: cl.items.filter(i => i.id !== itemId) })) })) })) }));
      broadcastUpdate();
    }
  };

  const handleAddAttachment = async (cardId: string, file: File) => {
    if (!session?.user) return;
    
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${session.user.id}/${cardId}/${Date.now()}_${cleanFileName}`;
    
    const { error: uploadError } = await supabase.storage.from('card-attachments').upload(filePath, file);
    if (uploadError) {
      console.error("Upload error:", uploadError);
      showError(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: newAttachment, error: dbError } = await supabase.from('card_attachments').insert({ card_id: cardId, file_path: filePath, file_name: file.name, file_type: file.type }).select().single();
    if (dbError) {
      showError('Failed to save attachment details.');
      await supabase.storage.from('card-attachments').remove([filePath]);
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, attachments: [...c.attachments, newAttachment] } : c) })) }));
      showSuccess('Attachment added!');
      broadcastUpdate();
    }
  };

  const handleUpdateAttachment = async (attachmentId: string, data: { file_name: string }) => {
    const { error } = await supabase.from('card_attachments').update(data).eq('id', attachmentId);
    if (error) {
      showError('Failed to update attachment.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, attachments: c.attachments.map(a => a.id === attachmentId ? { ...a, ...data } : a) })) })) }));
      showSuccess('Attachment renamed!');
      broadcastUpdate();
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const attachment = allCards.flatMap(c => c.attachments).find(a => a.id === attachmentId);
    if (!attachment) return;

    const { error: storageError } = await supabase.storage.from('card-attachments').remove([attachment.file_path]);
    if (storageError) {
      showError('Failed to delete file from storage.');
      return;
    }

    const { error: dbError } = await supabase.from('card_attachments').delete().eq('id', attachmentId);
    if (dbError) {
      showError('Failed to delete attachment record.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, attachments: c.attachments.filter(a => a.id !== attachmentId) })) })) }));
      showSuccess('Attachment deleted.');
      broadcastUpdate();
    }
  };

  const handleAddComment = async (cardId: string, content: string) => {
    if (!session?.user) return;

    const userMentionRegex = /@\[(.*?)\]\(user:(.*?)\)/g;
    const everyoneMentionRegex = /@\[Everyone\]\(group:everyone\)/g;
    const mentionedUserIds = new Set<string>();
    let match;

    while ((match = userMentionRegex.exec(content)) !== null) {
      mentionedUserIds.add(match[2]);
    }

    if (everyoneMentionRegex.test(content)) {
      board.members.forEach(member => {
        mentionedUserIds.add(member.user_id);
      });
    }
    
    const { data: insertedComment, error } = await supabase
      .from('card_comments')
      .insert({ card_id: cardId, user_id: session.user.id, content })
      .select()
      .single();

    if (error) {
      showError('Failed to add comment.');
      return;
    }

    const finalMentionedIds = Array.from(mentionedUserIds).filter(id => id !== session.user.id);

    const notifications = finalMentionedIds.map(userId => ({
      user_id: userId,
      actor_id: session.user.id,
      type: 'COMMENT_MENTION',
      data: {
        boardId: board.id,
        boardName: board.name,
        cardId: cardId,
        cardContent: allCards.find(c => c.id === cardId)?.content || '',
        actorName: session.user.user_metadata?.full_name || session.user.email || 'Someone'
      }
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    const newCommentForUI: Comment = {
      ...insertedComment,
      user: {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email,
        avatar_url: session.user.user_metadata?.avatar_url,
      }
    };

    setBoard(b => ({
      ...b,
      lists: b.lists.map(l => ({
        ...l,
        cards: l.cards.map(c => 
          c.id === cardId 
            ? { ...c, comments: [newCommentForUI, ...c.comments] } 
            : c
        )
      }))
    }));
    broadcastUpdate();
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    const { data, error } = await supabase.from('card_comments').update({ content }).eq('id', commentId).select('*, user:users(id, full_name, avatar_url)').single();
    if (error) {
      showError('Failed to update comment.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, comments: c.comments.map(com => com.id === commentId ? data as Comment : com) })) })) }));
      broadcastUpdate();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('card_comments').delete().eq('id', commentId);
    if (error) {
      showError('Failed to delete comment.');
    } else {
      setBoard(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => ({ ...c, comments: c.comments.filter(com => com.id !== commentId) })) })) }));
      showSuccess('Comment deleted.');
      broadcastUpdate();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex gap-4 overflow-x-auto pb-4 items-start">
        <AnimatePresence>
          {board.lists.sort((a, b) => a.position - b.position).map(list => (
            <TrelloList
              key={list.id}
              list={list}
              lists={board.lists.sort((a, b) => a.position - b.position)}
              onCardClick={(card) => onModalOpenChange(true, card.id)}
              onAddCard={handleAddCard}
              onUpdateCard={handleUpdateCard}
              onUpdateList={handleUpdateList}
              onDeleteList={handleDeleteList}
              onMoveList={handleMoveList}
            />
          ))}
        </AnimatePresence>
        <AddListForm onAddList={handleAddList} />
      </div>
      <AnimatePresence>
        {modalCard && (
          <CardDetailsModal
            key={modalCard.id}
            isOpen={!!modalCardId}
            onOpenChange={(isOpen) => onModalOpenChange(isOpen)}
            card={modalCard}
            allCards={allCards}
            lists={board.lists}
            boardLabels={board.labels}
            boardMembers={board.members}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
            onToggleLabelOnCard={handleToggleLabelOnCard}
            onCreateLabel={handleCreateLabel}
            onUpdateLabel={handleUpdateLabel}
            onAddRelation={handleAddRelation}
            onRemoveRelation={handleRemoveRelation}
            onSelectCard={(cardId) => onModalOpenChange(true, cardId)}
            onAddChecklist={handleAddChecklist}
            onUpdateChecklist={handleUpdateChecklist}
            onDeleteChecklist={handleDeleteChecklist}
            onAddChecklistItem={handleAddChecklistItem}
            onUpdateChecklistItem={handleUpdateChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
            onAddAttachment={handleAddAttachment}
            onUpdateAttachment={handleUpdateAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrelloBoard;