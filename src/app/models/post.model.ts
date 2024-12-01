export interface Post {
  id: string; //UUID
  type: 'text' | 'photoAlbum' | 'video'; 
  content: string; // Text content
  mediaUrls?: string[]; 
  videoUrl?: string;
  createdAt: Date;
}