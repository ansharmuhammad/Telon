import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrelloCard } from '@/components/trello/TrelloCard';
import { mockCard } from './mocks/trello';
import { Card } from '@/types/trello';

describe('TrelloCard', () => {
  const onCardClickMock = vi.fn();
  const onUpdateCardMock = vi.fn();

  it('renders the card content', () => {
    render(<TrelloCard card={mockCard} onCardClick={onCardClickMock} onUpdateCard={onUpdateCardMock} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('calls onCardClick when the card is clicked', async () => {
    const user = userEvent.setup();
    render(<TrelloCard card={mockCard} onCardClick={onCardClickMock} onUpdateCard={onUpdateCardMock} />);
    
    await user.click(screen.getByText('Test Card'));
    expect(onCardClickMock).toHaveBeenCalledWith(mockCard);
  });

  it('calls onUpdateCard when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<TrelloCard card={mockCard} onCardClick={onCardClickMock} onUpdateCard={onUpdateCardMock} />);
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onUpdateCardMock).toHaveBeenCalledWith(mockCard.id, { is_completed: true });
  });

  it('shows the due date badge when a due date is present', () => {
    const cardWithDueDate: Card = {
      ...mockCard,
      due_date: new Date().toISOString(),
    };
    render(<TrelloCard card={cardWithDueDate} onCardClick={onCardClickMock} onUpdateCard={onUpdateCardMock} />);
    expect(screen.getByText(/... \d+/)).toBeInTheDocument(); // Matches format like "Aug 10"
  });

  it('shows the checklist badge when checklists are present', () => {
    const cardWithChecklist: Card = {
      ...mockCard,
      checklists: [{
        id: 'cl-1', title: 'Tasks', position: 1, card_id: mockCard.id,
        items: [
          { id: 'item-1', content: 'Item 1', is_completed: true, position: 1, checklist_id: 'cl-1' },
          { id: 'item-2', content: 'Item 2', is_completed: false, position: 2, checklist_id: 'cl-1' },
        ]
      }]
    };
    render(<TrelloCard card={cardWithChecklist} onCardClick={onCardClickMock} onUpdateCard={onUpdateCardMock} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});