import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon, Search, Plus, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card as CardType, CoverConfig, BackgroundConfig } from '@/types/trello';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type UnsplashImage = {
  id: string;
  fullUrl: string;
  thumbUrl: string;
  userName: string;
  userLink: string;
  alt: string;
};

const PRESET_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
  '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'
];

type CoverPopoverProps = {
  children: React.ReactNode;
  card: CardType;
  onCoverChange: (config: CoverConfig) => void;
};

export const CoverPopover = ({ children, card, onCoverChange }: CoverPopoverProps) => {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('workspace');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const searchImages = async (searchQuery: string) => {
    setLoading(true);
    setImages([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-unsplash', { body: { query: searchQuery } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setImages(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to search for images.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && images.length === 0) {
      searchImages(query);
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) searchImages(query.trim());
  };

  const handleSelect = (config: BackgroundConfig) => {
    if (!config) {
      onCoverChange(null);
    } else {
      onCoverChange({
        ...config,
        size: card.cover_config?.size || 'header',
      } as CoverConfig);
    }
  };

  const handleSizeChange = (size: 'full' | 'header') => {
    if (card.cover_config) {
      onCoverChange({ ...card.cover_config, size });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length || !session?.user) return;
    const file = event.target.files[0];
    const filePath = `${session.user.id}/${card.id}/${Date.now()}.${file.name.split('.').pop()}`;
    setUploading(true);
    const { error } = await supabase.storage.from('card-covers').upload(filePath, file);
    setUploading(false);
    if (error) {
      showError('Failed to upload image. Make sure the `card-covers` bucket exists.');
    } else {
      handleSelect({ type: 'custom-image', path: filePath });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-center mb-2">Cover</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleSizeChange('header')} className={cn("h-16 rounded-md border-2", card.cover_config?.size !== 'full' ? 'border-primary' : 'border-transparent')}>
                <div className="p-1">
                  <div className="h-6 w-full bg-muted rounded-sm" />
                  <div className="h-2 w-3/4 bg-muted-foreground/50 rounded-full mt-2" />
                  <div className="h-2 w-1/2 bg-muted-foreground/50 rounded-full mt-1" />
                </div>
              </button>
              <button onClick={() => handleSizeChange('full')} className={cn("h-16 rounded-md border-2", card.cover_config?.size === 'full' ? 'border-primary' : 'border-transparent')}>
                <div className="h-full w-full bg-muted rounded-sm p-1">
                  <div className="h-2 w-3/4 bg-muted-foreground/50 rounded-full mt-8" />
                  <div className="h-2 w-1/2 bg-muted-foreground/50 rounded-full mt-1" />
                </div>
              </button>
            </div>
            <Button variant="secondary" className="w-full mt-2" onClick={() => handleSelect(null)} disabled={!card.cover_config}>Remove cover</Button>
          </div>
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="custom">Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="colors" className="pt-4">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map(color => (
                  <button key={color} style={{ backgroundColor: color }} className="h-10 w-full rounded-sm flex items-center justify-center" onClick={() => handleSelect({ type: 'color', color })}>
                    {card.cover_config?.type === 'color' && card.cover_config.color === color && <Check className="h-5 w-5 text-white" />}
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="photos" className="pt-4 space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" size="icon" disabled={loading}><Search className="h-4 w-4" /></Button>
              </form>
              <div className="grid grid-cols-3 gap-2 h-40 overflow-y-auto">
                {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                {!loading && images.map((image) => {
                  const { id, alt, ...imageData } = image;
                  return (
                    <button key={id} onClick={() => handleSelect({ type: 'image', ...imageData })} className="relative group">
                      <img src={image.thumbUrl} alt={alt} className="h-16 w-full object-cover rounded-sm" />
                      <div className="absolute inset-0 bg-black/30 group-hover:opacity-100 opacity-0 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="custom" className="pt-4">
              <label htmlFor="custom-cover-upload" className="cursor-pointer flex items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-muted-foreground/50 hover:border-muted-foreground">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6 text-muted-foreground" />}
              </label>
              <Input id="custom-cover-upload" type="file" className="hidden" onChange={handleFileUpload} accept="image/png, image/jpeg" disabled={uploading} />
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
};