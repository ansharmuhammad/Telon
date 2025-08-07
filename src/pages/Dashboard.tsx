import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { BackgroundConfig } from '@/types/trello';
import { getBackgroundThumbnailStyle } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BoardSummary = {
  id: string;
  name: string;
  background_config: BackgroundConfig;
  is_closed: boolean;
};

const Dashboard = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState('');

  const fetchBoards = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, background_config, is_closed')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch boards.');
      console.error(error);
    } else {
      setBoards(data as BoardSummary[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim() || !session?.user) return;

    const { data: newBoard, error } = await supabase
      .from('boards')
      .insert({ name: newBoardName.trim(), user_id: session.user.id })
      .select('id')
      .single();

    if (error) {
      showError('Failed to create board.');
    } else if (newBoard) {
      await supabase.from('lists').insert([
        { board_id: newBoard.id, title: 'To Do', position: 1 },
        { board_id: newBoard.id, title: 'In Progress', position: 2 },
        { board_id: newBoard.id, title: 'Done', position: 3 },
      ]);
      showSuccess('Board created!');
      setNewBoardName('');
      navigate(`/board/${newBoard.id}`);
    }
  };

  const handleReopenBoard = async (boardId: string) => {
    const { error } = await supabase
      .from('boards')
      .update({ is_closed: false })
      .eq('id', boardId);

    if (error) {
      showError('Failed to re-open board.');
    } else {
      showSuccess('Board re-opened!');
      fetchBoards();
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      showError('Failed to delete board.');
    } else {
      showSuccess('Board permanently deleted.');
      fetchBoards();
    }
  };

  const openBoards = boards.filter(b => !b.is_closed);
  const closedBoards = boards.filter(b => b.is_closed);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
            <Button onClick={() => supabase.auth.signOut()}>Logout</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">My Boards</TabsTrigger>
            <TabsTrigger value="closed">Closed Boards</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="pt-4">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create a new board</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateBoard} className="flex gap-2">
                  <Input
                    placeholder="New board name..."
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                  />
                  <Button type="submit" disabled={!newBoardName.trim()}>
                    <Plus className="h-4 w-4 mr-2" /> Create
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loading ? (
              <p>Loading boards...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {openBoards.map((board) => {
                  const boardStyle = getBackgroundThumbnailStyle(board.background_config);
                  return (
                    <Link to={`/board/${board.id}`} key={board.id}>
                      <Card className="h-32 flex flex-col justify-end p-4 text-white font-bold bg-gray-700 bg-cover bg-center hover:opacity-90 transition-opacity relative"
                        style={boardStyle}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg" />
                        <span className="relative z-10">{board.name}</span>
                      </Card>
                    </Link>
                  );
                })}
                {openBoards.length === 0 && <p>You don't have any boards yet. Create one above!</p>}
              </div>
            )}
          </TabsContent>
          <TabsContent value="closed" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Closed Boards</CardTitle>
                <p className="text-sm text-muted-foreground">You can re-open or permanently delete closed boards.</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Loading boards...</p>
                ) : (
                  <div className="space-y-4">
                    {closedBoards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <span className="font-medium">{board.name}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => handleReopenBoard(board.id)}>Re-open</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive">Delete Permanently</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the board and all of its data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBoard(board.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    {closedBoards.length === 0 && <p className="text-center text-muted-foreground py-4">You have no closed boards.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;