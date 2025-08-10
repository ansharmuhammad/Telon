import { Board, Card, List } from '@/types/trello';

export const mockCard: Card = {
  id: 'card-1',
  content: 'Test Card',
  description: 'This is a test card.',
  position: 1,
  list_id: 'list-1',
  is_completed: false,
  cover_config: null,
  labels: [],
  related_cards: [],
  checklists: [],
  attachments: [],
  comments: [],
  start_date: null,
  due_date: null,
};

export const mockList: List = {
  id: 'list-1',
  title: 'To Do',
  position: 1,
  board_id: 'board-1',
  cards: [mockCard],
};

export const mockBoard: Board = {
  id: 'board-1',
  name: 'Test Board',
  background_config: { type: 'color', color: '#0079bf' },
  is_closed: false,
  lists: [mockList],
  labels: [],
  members: [],
};