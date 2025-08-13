import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

type SearchResult = {
  card_id: string;
  card_content: string;
  list_title: string;
  board_id: string;
  board_name: string;
};

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      setLoading(true);
      supabase
        .rpc('search_cards', { search_text: debouncedQuery })
        .then(({ data, error }) => {
          if (error) {
            console.error('Search error:', error);
            setResults([]);
          } else {
            setResults(data || []);
          }
          setLoading(false);
          setIsOpen(true);
        });
    } else {
      setResults([]);
      if (isOpen && !isMobile) {
        setIsOpen(false);
      }
    }
  }, [debouncedQuery, isMobile, isOpen]);

  const searchContent = (
    <>
      {results.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground px-2">CARDS</p>
          {results.map((r) => (
            <Link
              key={r.card_id}
              to={`/board/${r.board_id}?cardId=${r.card_id}`}
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="block p-2 rounded-md hover:bg-accent"
            >
              <p className="font-medium">{r.card_content}</p>
              <p className="text-sm text-muted-foreground">in {r.list_title} on {r.board_name}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-center text-muted-foreground py-4">
          {loading ? 'Searching...' : 'No results found.'}
        </p>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-700">
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="end">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cards..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
          </div>
          {searchContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.length > 2) {
                setIsOpen(true);
              }
            }}
            className="pl-9 bg-gray-700/50 text-white border-gray-600 placeholder:text-gray-400"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-2" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {searchContent}
      </PopoverContent>
    </Popover>
  );
};