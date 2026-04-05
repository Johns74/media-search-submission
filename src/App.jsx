import React, { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, FileText, Clock, X, Terminal, Database, Sparkles, Filter, CheckCircle2, Circle, Copy, Share2, History, RotateCcw } from 'lucide-react';
import { parseSRT } from './utils/srtParser';
import workspaceData from './assets/workspace.json';

function App() {
  const [files, setFiles] = useState([]); // List of { name, subtitles }
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null); // { fileName, subtitles, activeIndex }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterAudio, setFilterAudio] = useState(true);
  const [filterVideo, setFilterVideo] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(null); // ID of the item copied
  const [shareFeedback, setShareFeedback] = useState(null); // ID of the item shared
  const [visibleCount, setVisibleCount] = useState(50);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });

  // Auto-load workspace on mount
  useEffect(() => {
    const loadInitialData = () => {
      setLoading(true);
      setTimeout(() => {
        const loadedFiles = workspaceData.map(f => ({
          ...f,
          subtitles: parseSRT(f.raw)
        }));
        setFiles(loadedFiles);
        setLoading(false);
      }, 300);
    };
    loadInitialData();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setVisibleCount(50); // Reset pagination on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Persist recent searches
  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Search Logic
  const results = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];
    
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    const matches = [];

    files.forEach(file => {
      // Apply filters
      if (file.category === 'Audio' && !filterAudio) return;
      if (file.category === 'Video' && !filterVideo) return;

      file.subtitles.forEach((sub, idx) => {
        if (sub.text.toLowerCase().includes(lowerSearch)) {
          matches.push({
            id: `${file.name}-${idx}`,
            fileName: file.name,
            totalSubtitles: file.subtitles.length,
            subtitles: file.subtitles,
            index: sub.index,
            actualIdx: idx,
            start: sub.start,
            text: sub.text,
            rawFile: file.raw,
            videoId: file.videoId,
            category: file.category
          });
        }
      });
    });

    return matches;
  }, [debouncedSearchTerm, files, filterAudio, filterVideo]);

  const visibleResults = useMemo(() => {
    return results.slice(0, visibleCount);
  }, [results, visibleCount]);

  // Modal Scrolling Logic
  const activeBlockRef = React.useRef(null);
  
  useEffect(() => {
    if (isModalOpen && activeBlockRef.current) {
      setTimeout(() => {
        activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isModalOpen, selectedResult]);

  // Open Full Context
  const openFullView = (match) => {
    setSelectedResult(match);
    setIsModalOpen(true);
  };

  const getYoutubeUrl = (videoId, timestamp) => {
    if (!videoId) return null;
    const parts = timestamp.split(/[:,]/);
    const seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}`;
  };

  const highlightText = (text, highlight) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? 
            <span key={i} className="highlight">{part}</span> : part
        )}
      </span>
    );
  };

  const saveToHistory = (term) => {
    if (!term || term.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, 5);
    });
  };

  const handleManualSearch = () => {
    saveToHistory(searchTerm);
    setDebouncedSearchTerm(searchTerm);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveToHistory(searchTerm);
      setDebouncedSearchTerm(searchTerm);
    }
  };

  const handleCopy = (e, text, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleShare = (e, result) => {
    e.stopPropagation();
    const ytUrl = getYoutubeUrl(result.videoId, result.start);
    const shareText = `"${result.text}"\n\nSource: ${result.fileName} (${result.start})${ytUrl ? `\nWatch: ${ytUrl}` : ''}`;
    
    // Always copy to clipboard for consistent feedback as requested
    navigator.clipboard.writeText(shareText);
    setShareFeedback(result.id || `modal-${result.id}`);
    setTimeout(() => setShareFeedback(null), 3000);

    if (navigator.share) {
      navigator.share({
        title: 'Media Search Result',
        text: shareText,
        url: ytUrl || window.location.href
      }).catch(() => {
        // Silent catch if user cancels share sheet
      });
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Media Search Submission</h1>
        <p className="subtitle">
          Deep Search through Audios and Videos<br />
          <span className="subtitle-author">by God's Messenger of the Covenant - Dr. Rashad Khalifa</span>
        </p>
        
        <div className="search-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search keywords (e.g. 'God', 'Sura', 'numbers')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-search" onClick={handleManualSearch}>
              Search
            </button>
          </div>

          {recentSearches.length > 0 && (
            <div className="history-group">
              <History size={14} className="history-icon" />
              <div className="history-chips">
                {recentSearches.map((term, i) => (
                  <button 
                    key={i} 
                    className="history-chip"
                    onClick={() => {
                      setSearchTerm(term);
                      setDebouncedSearchTerm(term);
                    }}
                  >
                    {term}
                  </button>
                ))}
                <button className="btn-clear" onClick={() => setRecentSearches([])} title="Clear history">
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="filter-group">
            <button 
              className={`filter-chip ${filterAudio ? 'active' : ''}`}
              onClick={() => setFilterAudio(!filterAudio)}
              aria-pressed={filterAudio}
            >
              {filterAudio ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              <span>Audio</span>
            </button>
            <button 
              className={`filter-chip ${filterVideo ? 'active' : ''}`}
              onClick={() => setFilterVideo(!filterVideo)}
              aria-pressed={filterVideo}
            >
              {filterVideo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              <span>Video</span>
            </button>
          </div>
        </div>

        <div className="results-info">
          {files.length > 0 ? (
            <span>
              <Database size={14} style={{verticalAlign: 'middle', marginRight: 5}} />
              {files.length} files indexed and ready to search
            </span>
          ) : "Loading indices..."}
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading-view">
            <div className="spinner"></div>
            <p>Indexing your subtitles...</p>
          </div>
        ) : (
          <div className="results-grid">
            {visibleResults.length > 0 ? (
              <>
                <div className="results-info" style={{marginBottom: '1rem'}}>
                  Showing {visibleResults.length} of {results.length} matches
                </div>
                {visibleResults.map((result, i) => (
                  <div key={result.id} className="result-card" onClick={() => openFullView(result)}>
                    <div className="result-header">
                      <div className="header-left">
                        <span className={`badge ${result.category?.toLowerCase()}`}>{result.category}</span>
                        <span className="file-name" title={result.fileName}>{result.fileName}</span>
                      </div>
                      <div className="header-right" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <div className="card-actions">
                          <button 
                            className={`btn-icon-sm ${copyFeedback === result.id ? 'success' : ''}`} 
                            onClick={(e) => handleCopy(e, result.text, result.id)}
                            title="Copy text"
                          >
                            <Copy size={16} />
                          </button>
                          <div className="share-btn-wrapper">
                            <button 
                              className={`btn-icon-sm ${shareFeedback === result.id ? 'success' : ''}`} 
                              onClick={(e) => handleShare(e, result)}
                              title="Share result"
                            >
                              <Share2 size={16} />
                            </button>
                            {shareFeedback === result.id && (
                              <div className="toast-mini">Information and link copied!</div>
                            )}
                          </div>
                        </div>
                        <span className="timestamp"><Clock size={12} style={{marginRight: 4}} />{result.start}</span>
                      </div>
                    </div>
                    <div className="result-text">
                      {highlightText(result.text, debouncedSearchTerm)}
                    </div>
                  </div>
                ))}
                {results.length > visibleCount && (
                  <button className="btn-load-more" onClick={() => setVisibleCount(prev => prev + 50)}>
                    Load More Results ({results.length - visibleCount} remaining)
                  </button>
                )}
              </>
            ) : debouncedSearchTerm.length >= 2 ? (
              <div className="loading-view">
                <Search size={48} style={{marginBottom: '1rem', opacity: 0.2}} />
                <p>No matches found for "{debouncedSearchTerm}"</p>
              </div>
            ) : (
              <div className="loading-view" style={{opacity: 0.8}}>
                <Sparkles size={64} style={{marginBottom: '1.5rem', color: 'var(--accent-color)'}} />
                <h2 style={{marginBottom: '0.5rem', color: '#fff'}}>Ready to Search?</h2>
                <p style={{marginBottom: '2rem'}}>Type above to search through all indexed audio and video files.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Full View */}
      {isModalOpen && selectedResult && (
        <div className="overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <div className="header-left">
                <span className={`badge ${selectedResult.category?.toLowerCase()}`}>{selectedResult.category}</span>
                <div className="file-name" title={selectedResult.fileName}>{selectedResult.fileName}</div>
              </div>
              <button className="btn btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </header>
            
            <div className="modal-layout">
              <div className="transcript-container">
                {selectedResult.subtitles.map((sub, idx) => {
                  const isActive = idx === selectedResult.actualIdx;
                  const itemId = `modal-${idx}`;
                  const ytUrl = getYoutubeUrl(selectedResult.videoId, sub.start);
                  return (
                    <div 
                      key={idx} 
                      className={`srt-block ${isActive ? 'active' : ''}`}
                      ref={isActive ? activeBlockRef : null}
                    >
                      <div className="srt-meta">
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <span className="timestamp">{sub.start}</span>
                          <div className="block-actions">
                            <button 
                              className={`btn-icon-xs ${copyFeedback === itemId ? 'success' : ''}`} 
                              onClick={(e) => handleCopy(e, sub.text, itemId)}
                              title="Copy this section"
                            >
                              <Copy size={14} />
                            </button>
                            <div className="share-btn-wrapper">
                              <button 
                                className={`btn-icon-xs ${shareFeedback === itemId ? 'success' : ''}`} 
                                onClick={(e) => handleShare(e, { ...selectedResult, text: sub.text, start: sub.start, id: itemId })}
                                title="Share this section"
                              >
                                <Share2 size={14} />
                              </button>
                              {shareFeedback === itemId && (
                                <div className="toast-mini toast-right">Information and link copied!</div>
                              )}
                            </div>
                          </div>
                        </div>
                        {ytUrl && (
                          <a 
                            href={ytUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="yt-link"
                            title="Open on YouTube at this exact time"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Watch at {sub.start}
                          </a>
                        )}
                      </div>
                      <div className="result-text">{highlightText(sub.text, debouncedSearchTerm)}</div>
                    </div>
                  );
                })}
              </div>

              {selectedResult.videoId && (
                <div className="video-sidebar">
                  <div className="player-wrapper">
                    <iframe
                      width="100%"
                      height="200"
                      src={`https://www.youtube.com/embed/${selectedResult.videoId}?start=${
                        (() => {
                          const parts = selectedResult.start.split(/[:,]/);
                          return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                        })()
                      }`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="sidebar-info">
                    <h3>YouTube Sync</h3>
                    <p>The player above is set to start at <strong>{selectedResult.start}</strong>.</p>
                    <a 
                      href={getYoutubeUrl(selectedResult.videoId, selectedResult.start)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                      style={{width: '100%', justifyContent: 'center', marginTop: '1rem'}}
                    >
                      Open in YouTube Browser
                    </a>
                    <p style={{fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7}}>
                      Tip: Each segment on the left has its own direct link to jump to that specific moment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
