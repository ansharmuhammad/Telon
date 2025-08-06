import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BackgroundConfig } from '@/types/trello';
import { showError } from '@/utils/toast';

type UnsplashImage = {
  id: string;
  fullUrl: string;
  thumbUrl: string;
  userName: string;
  userLink: string;
  alt: string;
};

type ChangeBackgroundButtonProps = {
  onBackgroundChange: (config: BackgroundConfig) => void;
};

export const ChangeBackgroundButton = ({ onBackgroundChange }: ChangeBackgroundButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('nature');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);

  const searchImages = async (searchQuery: string) => {
    setLoading(true);
    setImages([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-unsplash', {
        body: { query: searchQuery },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setImages(data);
    } catch (err) {
      console.error(err);
      showError(err instanceof Error ? err.message : 'Failed to search for images.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchImages(query);
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchImages(query.trim());
    }
  };

  const handleSelectImage = (image: UnsplashImage) => {
    onBackgroundChange({
      fullUrl: image.fullUrl,
      thumbUrl: image.thumbUrl,
      userName: image.userName,
      userLink: image.userLink,
    });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="hover:bg-primary/90">
          <ImageIcon className="mr-2 h-4 w-4" />
          Change Background
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-medium text-center">Change Background</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search photos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" size="icon" disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="grid grid-cols-3 gap-2 h-60 overflow-y-auto">
            {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!loading && images.map((image) => (
              <button key={image.id} onClick={() => handleSelectImage(image)} className="relative group">
                <img src={image.thumbUrl} alt={image.alt} className="h-20 w-full object-cover rounded-sm" />
                <div className="absolute inset-0 bg-black/30 group-hover:opacity-100 opacity-0 transition-opacity" />
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};