import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BoardPage from '@/pages/BoardPage';
import { supabase } from '@/integrations/supabase/client';
import { mockBoard } from './mocks/trello';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Supabase client
const singleMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
    })),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '123' } } } }),
    },
  },
}));

const queryClient = new QueryClient();

const renderBoardPage = (boardId: string) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/board/${boardId}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/board/:boardId" element={<BoardPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('BoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockClear();
  });

  it('should render the board name and lists when data is fetched successfully', async () => {
    singleMock.mockResolvedValue({
      data: mockBoard,
      error: null,
    });

    renderBoardPage(mockBoard.id);

    await waitFor(() => {
      expect(screen.getByText(mockBoard.name)).toBeInTheDocument();
    });

    expect(screen.getByText(mockBoard.lists[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockBoard.lists[0].cards[0].content)).toBeInTheDocument();
  });

  it('should show the "Board is closed" message for a closed board', async () => {
    const closedBoard = { ...mockBoard, is_closed: true };
    singleMock.mockResolvedValue({
      data: closedBoard,
      error: null,
    });

    renderBoardPage(closedBoard.id);

    await waitFor(() => {
      expect(screen.getByText('Board is closed')).toBeInTheDocument();
    });
  });

  it('should navigate to dashboard if fetching board fails', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'Error fetching board' },
    });

    renderBoardPage('invalid-id');

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});