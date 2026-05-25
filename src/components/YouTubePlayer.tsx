import React, { useState, useEffect } from 'react';
import { Youtube, HelpCircle, Sparkles, Check, Play, Music, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Helper function to extract type and ID from YouTube URL or list
function parseYouTubeUrl(url: string): { type: 'video' | 'playlist' | 'error'; id: string } {
  if (!url) return { type: 'error', id: '' };
  try {
    const trimmed = url.trim();

    // 1. YouTube playlist check
    if (trimmed.includes('list=')) {
      const parts = trimmed.split('list=');
      if (parts[1]) {
        const id = parts[1].split('&')[0];
        return { type: 'playlist', id };
      }
    }
    
    // 2. Normal watch url: watch?v=ID
    if (trimmed.includes('watch?v=')) {
      const parts = trimmed.split('watch?v=');
      if (parts[1]) {
        const id = parts[1].split('&')[0];
        return { type: 'video', id };
      }
    }
    
    // 3. Short share URL: youtu.be/ID
    if (trimmed.includes('youtu.be/')) {
      const parts = trimmed.split('youtu.be/');
      if (parts[1]) {
        const id = parts[1].split('?')[0].split('/')[0];
        return { type: 'video', id };
      }
    }

    // 4. Embed url: /embed/ID
    if (trimmed.includes('/embed/')) {
      const parts = trimmed.split('/embed/');
      if (parts[1]) {
        const id = parts[1].split('?')[0].split('/')[0];
        return { type: 'video', id };
      }
    }

    // 5. Fallback check for direct 11-char ID
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.') && !trimmed.includes(':')) {
      return { type: 'video', id: trimmed };
    }
    
    // 6. Direct playlist ID check
    if (trimmed.startsWith('PL') && trimmed.length >= 18 && !trimmed.includes('/') && !trimmed.includes('.')) {
      return { type: 'playlist', id: trimmed };
    }
  } catch (e) {
    // catch parsing issues gracefully
  }
  return { type: 'error', id: '' };
}

export default function YouTubePlayer() {
  const [inputUrl, setInputUrl] = useState('');
  const [embedInfo, setEmbedInfo] = useState<{ type: 'video' | 'playlist' | 'error'; id: string }>({ type: 'error', id: '' });
  const [isOpen, setIsOpen] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Load saved URL from client-side localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('youtube_focus_link');
    if (savedUrl) {
      setInputUrl(savedUrl);
      const parsed = parseYouTubeUrl(savedUrl);
      if (parsed.type !== 'error') {
        setEmbedInfo(parsed);
      }
    }
  }, []);

  const handleApplyLink = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setEmbedInfo({ type: 'error', id: '' });
      localStorage.removeItem('youtube_focus_link');
      return;
    }

    const parsed = parseYouTubeUrl(trimmed);
    if (parsed.type !== 'error') {
      setEmbedInfo(parsed);
      localStorage.setItem('youtube_focus_link', trimmed);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } else {
      alert('Không nhận dạng được đường dẫn YouTube! Xin vui lòng nhập lại (ví dụ: https://www.youtube.com/watch?v=...)');
    }
  };

  const loadPreset = (url: string) => {
    setInputUrl(url);
    const parsed = parseYouTubeUrl(url);
    if (parsed.type !== 'error') {
      setEmbedInfo(parsed);
      localStorage.setItem('youtube_focus_link', url);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setEmbedInfo({ type: 'error', id: '' });
    localStorage.removeItem('youtube_focus_link');
  };

  // Construct iframe embed source
  let iframeSrc = '';
  if (embedInfo.type === 'video') {
    // autoplay=1 and mute=0 can try to autoplay, but browser interaction rules usually apply.
    iframeSrc = `https://www.youtube.com/embed/${embedInfo.id}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`;
  } else if (embedInfo.type === 'playlist') {
    iframeSrc = `https://www.youtube.com/embed/videoseries?list=${embedInfo.id}&autoplay=1&enablejsapi=1&origin=${window.location.origin}`;
  }

  return (
    <div className="w-full max-w-[340px] px-2 mt-4 relative z-20">
      <div className="bg-slate-900/40 border border-white/5 shadow-[5px_5px_15px_rgba(0,0,0,0.2)] rounded-[20px] p-3 text-left transition-all">
        
        {/* Toggle header */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-xs font-black tracking-wide uppercase text-slate-300 hover:text-white transition-colors cursor-pointer select-none py-1"
        >
          <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500 fill-red-500/10" />
            <span>Phát Nhạc YouTube Cá Nhân</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-extrabold px-1.5 py-0.5 bg-slate-950/40 rounded-md border border-white/5">
            {isOpen ? 'ẨN' : 'HIỆN'}
          </span>
        </button>

        {isOpen && (
          <div className="mt-3 space-y-3 pt-2.5 border-t border-slate-900/60 animate-fade-in">
            {/* Instruction tooltip */}
            <p className="text-[10px] leading-relaxed text-zinc-400">
              Dán liên kết bất kỳ (video lofi, nhạc sóng não, chillhop...) từ YouTube vào ô dưới đây để tự tạo playlist tập trung cho riêng bạn.
            </p>

            {/* Input elements */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-8 px-2.5 pr-7 bg-slate-950/60 border border-white/10 rounded-lg text-[11px] text-slate-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 font-medium"
                />
                {inputUrl && (
                  <button 
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleApplyLink}
                size="sm"
                className="h-8 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] tracking-wide px-3 shadow-md"
              >
                GẮN LINK
              </Button>
            </div>

            {/* Success Feedback toast message inline */}
            {showMessage && (
              <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-black tracking-wider uppercase animate-pulse">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>ĐÃ KẾT NỐI VỚI YOUTUBE THÀNH CÔNG!</span>
              </div>
            )}

            {/* Predefined cozy presets */}
            <div className="space-y-1.5">
              <div className="text-[8px] font-black tracking-wider text-zinc-500 uppercase">Gợi ý nhạc tập trung tốt nhất:</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => loadPreset('https://www.youtube.com/watch?v=jfKfPfyJRdk')}
                  className="px-2 py-1 bg-slate-950/30 hover:bg-slate-950/60 transition-all border border-white/5 rounded-md text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 font-bold truncate text-left"
                >
                  <Music className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  <span className="truncate">Lofi Girl Live</span>
                </button>
                <button
                  onClick={() => loadPreset('https://www.youtube.com/watch?v=S0Q4gqBUs7c')}
                  className="px-2 py-1 bg-slate-950/30 hover:bg-slate-950/60 transition-all border border-white/5 rounded-md text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 font-bold truncate text-left"
                >
                  <Sparkles className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                  <span className="truncate">Sóng Não Alpha 432Hz</span>
                </button>
              </div>
            </div>

            {/* Iframe player box when URL is set */}
            {embedInfo.type !== 'error' && (
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[9px] font-black tracking-widest text-[#ef4444] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    <span>KHU VỰC PHÁT NHẠC</span>
                  </div>
                  <span className="text-[8px] text-zinc-500 font-bold italic">Bấm nút Play màu đỏ trong khung ảnh để nghe nhạc</span>
                </div>
                
                {/* Embedded dynamic YouTube iframe */}
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/15 bg-black/40 relative shadow-[0_5px_15px_rgba(0,0,0,0.4)]">
                  <iframe
                    src={iframeSrc}
                    title="YouTube Ambient Focus Music"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0 absolute inset-0"
                  ></iframe>
                </div>
              </div>
            )}
            
          </div>
        )}

      </div>
    </div>
  );
}
