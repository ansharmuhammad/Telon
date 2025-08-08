import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon, Search, Plus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BackgroundConfig, FileObject } from '@/types/trello';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicUrl } from '@/lib/utils';

type UnsplashImage = {
  id: string;
  fullUrl: string;
  thumbUrl: string;
  userName: string;
  userLink: string;
  alt: string;
};

const PRESET_COLORS = [
  '#0079bf', '#d29034', '#519839', '#b04632', '#89609e',
  '#cd5a91', '#4bbf6b', '#00aecc', '#838c91',
];

type ChangeBackgroundButtonProps = {
  boardId: string;
  onBackgroundChange: (config: BackgroundConfig) => void;
};

export const ChangeBackgroundButton = ({ boardId, onBackgroundChange }: ChangeBackgroundButtonProps) => {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('nature');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customImages, setCustomImages] = useState<FileObject[]>([]);
  const [fetchingCustom, setFetchingCustom] = useState(false);

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

  const fetchCustomImages = async () => {
    if (!session?.user) return;
    setFetchingCustom(true);
    const { data, error } = await supabase.storage
      .from('board-backgrounds')
      .list(`${session.user.id}/${boardId}`);
    
    if (error) {
      showError('Failed to load custom images.');
      console.error(error);
    } else if (data) {
      setCustomImages(data.filter(item => item.name !== '.emptyFolderPlaceholder'));
    }
    setFetchingCustom(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (images.length === 0) {
        searchImages(query);
      }
      fetchCustomImages();
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
      type: 'image',
      fullUrl: image.fullUrl,
      thumbUrl: image.thumbUrl,
      userName: image.userName,
      userLink: image.userLink,
    });
    setIsOpen(false);
  };

  const handleSelectColor = (color: string) => {
    onBackgroundChange({
      type: 'color',
      color: color,
    });
    setIsOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!session?.user) {
      showError("You must be logged in to upload an image.");
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${boardId}/${fileName}`;

    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('board-backgrounds')
      .upload(filePath, file);
    setUploading(false);

    if (uploadError) {
      showError('Failed to upload image. Make sure the file is an image and the `board-backgrounds` storage bucket exists.');
      console.error(uploadError);
      return;
    }

    onBackgroundChange({
      type: 'custom-image',
      path: filePath,
    });
    fetchCustomImages();
    setIsOpen(false);
  };

  const handleDeleteCustomImage = async (imageName: string) => {
    if (!session?.user) return;
    const imagePath = `${session.user.id}/${boardId}/${imageName}`;
    const { error } = await supabase.storage.from('board-backgrounds').remove([imagePath]);
    if (error) {
      showError('Failed to delete image.');
    } else {
      setCustomImages(prev => prev.filter(img => img.name !== imageName));
    }
  };

  const handleSelectCustomImage = (imageName: string) => {
    if (!session?.user) return;
    const imagePath = `${session.user.id}/${boardId}/${imageName}`;
    onBackgroundChange({
      type: 'custom-image',
      path: imagePath,
    });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="w-full justify-start rounded-none px-2 py-1.5 text-sm font-normal h-auto">
          <ImageIcon className="mr-2 h-4 w-4" />
          Change Background
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
          </TabsList>
          <TabsContent value="photos" className="pt-4">
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input placeholder="Search photos..." value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" size="icon" disabled={loading}><Search className="h-4 w-4" /></Button>
              </form>
              <div className="grid grid-cols-3 gap-2 h-40 overflow-y-auto">
                {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                {!loading && images.map((image) => (
                  <button key={image.id} onClick={() => handleSelectImage(image)} className="relative group">
                    <img src={image.thumbUrl} alt={image.alt} className="h-20 w-full object-cover rounded-sm" />
                    <div className="absolute inset-0 bg-black/30 group-hover:opacity-100 opacity-0 transition-opacity" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a></p>
            </div>
          </TabsContent>
          <TabsContent value="colors" className="pt-4">
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map(color => (<button key={color} style={{ backgroundColor: color }} className="h-12 w-full rounded-sm" onClick={() => handleSelectColor(color)} />))}
            </div>
          </TabsContent>
        </Tabs>
        <Separator className="my-4" />
        <div>
          <h3 className="text-sm font-medium mb-2 text-center">Custom</h3>
          {fetchingCustom ? <Skeleton className="h-20 w-full" /> : (
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
              {session?.user && customImages.map(image => (
                <div key={image.id} className="relative group">
                  <button onClick={() => handleSelectCustomImage(image.name)} className="w-full">
                    <img 
                      src={getPublicUrl('board-backgrounds', `${session.user.id}/${boardId}/${image.name}`)} 
                      className="h-20 w-full object-cover rounded-sm" 
                      alt=""
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:opacity-100 opacity-0 transition-opacity rounded-sm" />
                  </button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteCustomImage(image.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <label htmlFor="custom-bg-upload" className="cursor-pointer flex items-center justify-center w-full h-20 rounded-md border-2 border-dashed border-muted-foreground/50 hover:border-muted-foreground">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6 text-muted-foreground" />}
          </label>
          <Input id="custom-bg-upload" type="file" className="hidden" onChange={handleFileUpload} accept="image/png, image/jpeg" disabled={uploading} />
        </div>
      </PopoverContent>
    </Popover>
  );
};