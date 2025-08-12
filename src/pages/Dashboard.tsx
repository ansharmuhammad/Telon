import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { BackgroundConfig } from '@/types/trello';
import { getBackgroundThumbnailStyle, cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { NotificationBell } from '@/components/layout/NotificationBell';
import { UserNav } from '@/components/layout/UserNav';
import { Skeleton } from '@/components/ui/skeleton';
import GridPattern from '@/components/ui/grid-pattern';

type BoardSummary = {
  id: string;
  name: string;
  background_config: BackgroundConfig;
  is_closed: boolean;
  last_viewed_at: string | null;
};

const Dashboard = () => {
  const { session } = useAuth();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [templates, setTemplates] = useState<Omit<BoardSummary, 'last_viewed_at' | 'is_closed'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Omit<BoardSummary, 'last_viewed_at' | 'is_closed'> | null>(null);
  const [newBoardNameFromTemplate, setNewBoardNameFromTemplate] = useState('');

  const fetchBoards = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, background_config, is_closed, last_viewed_at, board_members!inner(user_id)')
      .eq('board_members.user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch boards.');
      console.error(error);
    } else {
      setBoards(data as BoardSummary[]);
    }
    setLoading(false);
  }, [session]);

  const fetchTemplates = useCallback(async () => {
    setTemplateLoading(true);
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, background_config')
      .is('user_id', null)
      .order('name', { ascending: true });

    if (error) {
      showError('Failed to fetch templates.');
    } else {
      setTemplates(data as Omit<BoardSummary, 'last_viewed_at' | 'is_closed'>[]);
    }
    setTemplateLoading(false);
  }, []);

  useEffect(() => {
    fetchBoards();
    fetchTemplates();
  }, [fetchBoards, fetchTemplates]);

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !newBoardNameFromTemplate.trim() || isCreating) return;
    setIsCreating(true);

    const { error } = await supabase.rpc('clone_board', {
      template_board_id: selectedTemplate.id,
      new_board_name: newBoardNameFromTemplate.trim()
    });

    if (error) {
      showError(`Failed to create board from template: ${error.message}`);
    } else {
      showSuccess(`Board '${newBoardNameFromTemplate.trim()}' created!`);
      fetchBoards();
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
      setNewBoardNameFromTemplate('');
    }
    setIsCreating(false);
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
  const recentBoards = [...boards]
    .filter(b => !b.is_closed && b.last_viewed_at)
    .sort((a, b) => new Date(b.last_viewed_at!).getTime() - new Date(a.last_viewed_at!).getTime())
    .slice(0, 4);

  const BoardCard = ({ board }: { board: Omit<BoardSummary, 'is_closed' | 'last_viewed_at'> }) => {
    const boardStyle = getBackgroundThumbnailStyle(board.background_config);
    return (
      <Card className="h-32 flex flex-col justify-end p-4 text-white font-bold bg-gray-700 bg-cover bg-center hover:opacity-90 transition-opacity relative" style={boardStyle}>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg" />
        <span className="relative z-10">{board.name}</span>
      </Card>
    );
  };

  return (
    <div className="relative min-h-screen bg-background">
      <GridPattern width={40} height={40} x={-1} y={-1} className={cn("[mask-image:radial-gradient(ellipse_at_center,white,transparent_90%)]")} />
      <header className="bg-white shadow-sm dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img src="/telon_logo_48x48.png" alt="TELON Logo" className="h-10 w-10" />
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <UserNav />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? <Skeleton className="h-48 w-full mb-12" /> : recentBoards.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">Recent Boards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentBoards.map(board => (
                <Link to={`/board/${board.id}`} key={board.id}><BoardCard board={board} /></Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Start with a template</h2>
          {templateLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {templates.map(template => (
                <button key={template.id} onClick={() => { setSelectedTemplate(template); setIsTemplateDialogOpen(true); setNewBoardNameFromTemplate(template.name.replace(' Template', '')); }}>
                  <BoardCard board={template} />
                </button>
              ))}
            </div>
          )}
        </section>

        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">All My Boards</TabsTrigger>
            <TabsTrigger value="closed">Closed Boards</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="pt-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Card className="h-32 flex items-center justify-center border-dashed hover:border-primary hover:text-primary transition-colors">
                  <Link to="#" onClick={(e) => { e.preventDefault(); const el = document.getElementById('new-board-name'); if (el) el.focus(); }} className="text-center text-muted-foreground">
                    <Plus className="h-8 w-8 mx-auto mb-2" />
                    Create new board
                  </Link>
                </Card>
                {openBoards.map((board) => (
                  <Link to={`/board/${board.id}`} key={board.id}><BoardCard board={board} /></Link>
                ))}
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
                  <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-4">
                    {closedBoards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted">
                        <span className="font-medium">{board.name}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => handleReopenBoard(board.id)}>Re-open</Button>
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete Permanently</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the board and all of its data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBoard(board.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create board from '{selectedTemplate?.name}'</DialogTitle>
            <DialogDescription>What would you like to name your new board?</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFromTemplate}>
            <Input
              id="new-board-name-from-template"
              placeholder="Board name"
              value={newBoardNameFromTemplate}
              onChange={(e) => setNewBoardNameFromTemplate(e.target.value)}
              className="mt-4"
              autoFocus
            />
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-board-name-from-template" onClick={handleCreateFromTemplate} disabled={!newBoardNameFromTemplate.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;