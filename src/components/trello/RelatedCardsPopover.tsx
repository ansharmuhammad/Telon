import { useState, useMemo } from 'react';
import { Card as CardType } from '@/types/trello';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link2, Plus, X } from 'lucide-react';

type RelatedCardsPopoverProps = {
  card: CardType;
  allCards: CardType[];
  onAddRelation: (card1Id: string, card2Id: string) => Promise<void>;
  onRemoveRelation: (card1Id: string, card2Id: string) => Promise<void>;
};

export const RelatedCardsPopover = ({ card, allCards, onAddRelation, onRemoveRelation }: RelatedCardsPopoverProps) => {
  const [search, setSearch] = useState('');

  const relatedCardIds = useMemo(() => new Set(card.related_cards.map(rc => rc.id)), [card.related_cards]);

  const filteredCards = useMemo(() => {
    if (!search) return [];
    return allCards.filter(c =>
      c.id !== card.id &&
      !relatedCardIds.has(c.id) &&
      c.content.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allCards, card.id, relatedCardIds]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" className="w-full justify-start">
          <Link2 className="mr-2 h-4 w-4" /> Related Cards
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-center mb-2">Related Cards</p>
            <Input
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[200px]">
            {search ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Search Results</h4>
                {filteredCards.length > 0 ? filteredCards.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.content}</span>
                    <Button size="sm" variant="secondary" onClick={() => onAddRelation(card.id, c.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                )) : <p className="text-xs text-muted-foreground text-center py-2">No cards found.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Linked Cards</h4>
                {card.related_cards.length > 0 ? card.related_cards.map(rc => (
                  <div key={rc.id} className="flex items-center justify-between text-sm">
                    <span>{rc.content}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemoveRelation(card.id, rc.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )) : <p className="text-xs text-muted-foreground text-center py-2">No linked cards.</p>}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};