import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cmsApi } from '../api/cmsApi';
import { getMediaUrl } from '../utils/media';

export default function GlobalPopup() {
  const [popupItem, setPopupItem] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkLatestContent() {
      try {
        const [news, events] = await Promise.all([
          cmsApi.getNews(),
          cmsApi.getEvents()
        ]);
        
        let allItems = [];
        
        if (news && news.length > 0) {
          allItems.push(...news.map(n => ({
            ...n,
            type: 'news',
            date: new Date(n.published_date)
          })));
        }
        
        if (events && events.length > 0) {
          allItems.push(...events.map(e => ({
            ...e,
            type: 'event',
            date: new Date(e.event_date),
            content: e.description
          })));
        }
        
        if (allItems.length === 0) return;
        
        // Sort by date descending
        allItems.sort((a, b) => b.date - a.date);
        const latest = allItems[0];
        
        // Use a composite key based on type and ID
        const popupKey = `last_seen_popup_${latest.type}_${latest.id}`;
        
        if (!localStorage.getItem(popupKey)) {
          setPopupItem(latest);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to load popup content:", err);
      }
    }
    
    checkLatestContent();
  }, []);

  function handleClose() {
    if (popupItem) {
      localStorage.setItem(`last_seen_popup_${popupItem.type}_${popupItem.id}`, 'true');
    }
    setIsOpen(false);
  }

  if (!isOpen || !popupItem) return null;

  const imageSrc = getMediaUrl(popupItem.cover_image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300"
      >
        <div className="relative">
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt={popupItem.title} 
              className="w-full h-48 sm:h-64 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-academic-blue/10 flex items-center justify-center">
              <span className="text-academic-blue font-heading font-bold text-xl opacity-50">
                {popupItem.type === 'event' ? 'Upcoming Event' : 'Latest News'}
              </span>
            </div>
          )}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="absolute top-4 left-4">
            <span className="bg-academic-blue text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              {popupItem.type === 'event' ? 'Event' : 'News'}
            </span>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <p className="text-academic-blue font-semibold text-sm mb-2">
            {popupItem.date.toLocaleDateString()}
          </p>
          <h2 className="text-2xl font-heading font-bold text-ink-primary mb-4 leading-tight">
            {popupItem.title}
          </h2>
          <p className="text-ink-secondary text-base leading-relaxed line-clamp-4">
            {popupItem.content}
          </p>
          
          <div className="mt-8">
            <button 
              onClick={handleClose}
              className="w-full bg-surface-light hover:bg-slate-200 text-ink-primary font-semibold py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
