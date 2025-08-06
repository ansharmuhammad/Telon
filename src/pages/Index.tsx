import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Board as BoardType } from '@/types/trello';
import { useAuth } from '@/contexts/AuthContext';
import TrelloBoard from '@/components/trello/TrelloBoard';
import { Button } from '@/components/ui/button';
import { Header } from '../components/Header';

const Index = () => {
  const { session } = useAuth();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);

  const getBoardData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    let { data: boardData } = await supabase
      .from('boards')
      .select('id, name')
      .eq('user_id', session.user.id)
      .limit(1)
      .single();

    if (!boardData) {
      const { data: newBoard } = await supabase
        .from('boards')
        .insert({ name: 'My First Board', user_id: session.user.id })
        .select('id, name')
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
      .select(`id, name, lists (id, title, position, board_id, cards (id, content, position, list_id))`)
      .eq('id', boardData.id)
      .single();

    if (error) {
      console.error('Error fetching board:', error);
    } else if (fullBoardData) {
      fullBoardData.lists.sort((a, b) => a.position - b.position);
      fullBoardData.lists.forEach(list => list.cards.sort((a, b) => a.position - b.position));
      setBoard(fullBoardData as BoardType);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      getBoardData();
    }
  }, [session, getBoardData]);

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
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow p-4 md:p-6 overflow-hidden">
        <TrelloBoard initialBoard={board} />
      </main>
    </div>
  );
};

export default Index;