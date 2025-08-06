import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Board as BoardType, BackgroundConfig } from '@/types/trello';
import { useAuth } from '@/contexts/AuthContext';
import TrelloBoard from '@/components/trello/TrelloBoard';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { showError, showSuccess } from '@/utils/toast';

const Index = () => {
  const { session } = useAuth();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);

  const getBoardData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    let { data: boardData } = await supabase
      .from('boards')
      .select('id, name, background_config')
      .eq('user_id', session.user.id)
      .limit(1)
      .single();

    if (!boardData) {
      const { data: newBoard } = await supabase
        .from('boards')
        .insert({ name: 'My First Board', user_id: session.user.id })
        .select('id, name, background_config')
        .single();
      
      if (newBoard) {
        boardData = newBoard;
        const { data: lists } = await supabase.from('lists').insert([
            { board_id: boardData.id, title: 'To Do', position: 1 },
            { board_id: boardData.id, title: 'In Progress', position: 2 },
            { board_id: boardData.id, title: 'Done', position: 3 },
        ]).select('id').order('position');

        if (lists && lists.length > 0) {
            await supabase.from('cards').insert({
                list_id: lists[0].id,
                content: 'This is your first task!',
                position: 1
            });
        }
      }
    }

    if (!boardData) {
        console.error('Could not create or find a board.');
        setLoading(false);
        return;
    }

    const { data: fullBoardData, error } = await supabase
      .from('boards')
      .select(`
        id, 
        name, 
        background_config,
        labels (*),
        lists (
          id, title, position, board_id,
          cards (
            *,
            card_labels ( labels (*) ),
            relations_as_card1:card_relations!card1_id(card2_id, card2:cards!card2_id(id, content, list:lists(title))),
            relations_as_card2:card_relations!card2_id(card1_id, card1:cards!card1_id(id, content, list:lists(title)))
          )
        )
      `)
      .eq('id', boardData.id)
      .single();

    if (error) {
      console.error('Error fetching board:', error);
      setBoard(null);
    } else if (fullBoardData) {
      const boardWithMappedData: BoardType = {
        ...fullBoardData,
        lists: fullBoardData.lists.map(list => ({
          ...list,
          cards: list.cards.map((card: any) => {
            const related_as_1 = card.relations_as_card1.map((r: any) => ({ id: r.card2.id, content: r.card2.content, list_title: r.card2.list.title }));
            const related_as_2 = card.relations_as_card2.map((r: any) => ({ id: r.card1.id, content: r.card1.content, list_title: r.card1.list.title }));
            return { ...card, labels: card.card_labels.map((cl: any) => cl.labels).filter(Boolean), related_cards: [...related_as_1, ...related_as_2] }
          }).sort((a, b) => a.position - b.position)
        })).sort((a, b) => a.position - b.position)
      };
      setBoard(boardWithMappedData);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      getBoardData();
    }
  }, [session, getBoardData]);

  const handleBackgroundChange = async (newConfig: BackgroundConfig) => {
    if (!board) return;
    const oldConfig = board.background_config;
    setBoard(b => b ? { ...b, background_config: newConfig } : null);

    const { error } = await supabase
      .from('boards')
      .update({ background_config: newConfig })
      .eq('id', board.id);

    if (error) {
      showError('Failed to update background.');
      setBoard(b => b ? { ...b, background_config: oldConfig } : null);
    } else {
      showSuccess('Background updated!');
    }
  };

  const backgroundStyle = board?.background_config
    ? { backgroundImage: `url(${board.background_config.fullUrl})` }
    : {};

  if (loading) {
    return <div className="p-8 text-center">Loading your board...</div>;
  }

  if (!board) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">We couldn't load your board. Please try again.</p>
        <Button onClick={getBoardData}>Reload Board</Button>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex flex-col bg-gray-50 bg-cover bg-center"
      style={backgroundStyle}
    >
      <Header board={board} onBackgroundChange={handleBackgroundChange} />
      <main className="flex-grow p-4 md:p-6 overflow-hidden">
        <TrelloBoard initialBoard={board} />
      </main>
    </div>
  );
};

export default Index;