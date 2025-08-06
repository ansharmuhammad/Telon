import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Board as BoardType, BackgroundConfig } from '@/types/trello';
import { useAuth } from '@/contexts/AuthContext';
import TrelloBoard from '@/components/trello/TrelloBoard';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { showError, showSuccess } from '@/utils/toast';
import { Home } from 'lucide-react';

const BoardPage = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);

  const getBoardData = useCallback(async () => {
    if (!session?.user || !boardId) return;
    setLoading(true);

    const { data: fullBoardData, error } = await supabase
      .from('boards')
      .select(`
        id, 
        name, 
        background_config,
        user_id,
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
      .eq('id', boardId)
      .single();

    if (error || !fullBoardData) {
      showError('Could not load board or you do not have access.');
      navigate('/dashboard');
      return;
    }
    
    if (fullBoardData.user_id !== session.user.id) {
      showError('You do not have permission to view this board.');
      navigate('/dashboard');
      return;
    }

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
    setLoading(false);
  }, [session, boardId, navigate]);

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
    return <div className="flex items-center justify-center h-screen">Loading your board...</div>;
  }

  if (!board) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">We couldn't load your board. Please try again.</p>
        <Link to="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
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

export default BoardPage;