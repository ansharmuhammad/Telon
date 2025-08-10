import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddCardForm } from '@/components/trello/AddCardForm';

describe('AddCardForm', () => {
  it('should show the "Add a card" button initially', () => {
    render(<AddCardForm listId="1" onAddCard={async () => {}} />);
    expect(screen.getByText('Add a card')).toBeInTheDocument();
  });

  it('should show the form when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddCardForm listId="1" onAddCard={async () => {}} />);
    
    await user.click(screen.getByText('Add a card'));

    expect(screen.getByPlaceholderText('Enter a title for this card...')).toBeInTheDocument();
    expect(screen.getByText('Add card')).toBeInTheDocument();
  });

  it('should call onAddCard with the correct content when submitted', async () => {
    const user = userEvent.setup();
    const onAddCardMock = vi.fn();
    render(<AddCardForm listId="list-1" onAddCard={onAddCardMock} />);

    await user.click(screen.getByText('Add a card'));
    await user.type(screen.getByPlaceholderText('Enter a title for this card...'), 'New test card');
    await user.click(screen.getByText('Add card'));

    expect(onAddCardMock).toHaveBeenCalledWith('list-1', 'New test card');
  });

  it('should hide the form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<AddCardForm listId="1" onAddCard={async () => {}} />);
    
    await user.click(screen.getByText('Add a card'));
    expect(screen.getByPlaceholderText('Enter a title for this card...')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /x/i }));
    expect(screen.queryByPlaceholderText('Enter a title for this card...')).not.toBeInTheDocument();
  });
});