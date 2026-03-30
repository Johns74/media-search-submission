import React, { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, FileText, Clock, X, Terminal, Database, Sparkles } from 'lucide-react';
import { parseSRT } from './utils/srtParser';
import workspaceData from './assets/workspace.json';

function App() {
  const [files, setFiles] = useState([]); // List of { name, subtitles }
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null); // { fileName, subtitles, activeIndex }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [source, setSource] = useState(null); // 'directory' or 'workspace'

  // Handle Directory Picker
  const handleLoadDirectory = async () => {
    try {
      if (!window.showDirectoryPicker) {
        alert("Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.");
        return;
      }

      setLoading(true);
      const directoryHandle = await window.showDirectoryPicker();
      const loadedFiles = [];

      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.srt')) {
          const file = await entry.getFile();
          const text = await file.text();
          const subtitles = parseSRT(text);
          loadedFiles.push({ name: entry.name, subtitles, raw: text });
        }
      }

      setFiles(loadedFiles);
      setSource('directory');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      if (err.name !== 'AbortError') {
        alert("Failed to load directory. Make sure you granted permissions.");
      }
    }
  };

  // Handle Workspace Scan
  const handleScanWorkspace = () => {
    setLoading(true);
    setTimeout(() => {
      const loadedFiles = workspaceData.map(f => ({
        ...f,
        subtitles: parseSRT(f.raw)
      }));
      setFiles(loadedFiles);
      setSource('workspace');
      setLoading(false);
    }, 500); // Small delay for UX "feel"
  };

  // Search Logic
  const results = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    const matches = [];

    files.forEach(file => {
      file.subtitles.forEach((sub, idx) => {
        if (sub.text.toLowerCase().includes(lowerSearch)) {
          matches.push({
            fileName: file.name,
            subtitles: file.subtitles,
            index: sub.index,
            actualIdx: idx,
            start: sub.start,
            text: sub.text,
            rawFile: file.raw
          });
        }
      });
    });

    return matches;
  }, [searchTerm, files]);

  // Open Full Context
  const openFullView = (match) => {
    setSelectedResult(match);
    setIsModalOpen(true);
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

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Media Search Submission</h1>
        <p className="subtitle">Search through your subtitle collection with precision</p>
        
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search keywords (e.g. 'God', 'Sura', 'numbers')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tools-bar">
          <button className="btn btn-primary" onClick={handleScanWorkspace} title="Search currently open folders">
            <Sparkles size={18} />
            Scan Workspace
          </button>
          <button className="btn" onClick={handleLoadDirectory} title="Load any other folder">
            <FolderOpen size={18} />
            Load Directory
          </button>
        </div>
        <div className="results-info">
          {files.length > 0 ? (
            <span>
              <Database size={14} style={{verticalAlign: 'middle', marginRight: 5}} />
              {files.length} files indexed from {source === 'workspace' ? 'your workspace' : 'selected directory'}
            </span>
          ) : "No files loaded yet"}
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
            {results.length > 0 ? (
              <>
                <div className="results-info">Found {results.length} matches</div>
                {results.slice(0, 100).map((result, i) => (
                  <div key={i} className="result-card" onClick={() => openFullView(result)}>
                    <div className="result-header">
                      <span className="file-name">{result.fileName}</span>
                      <span className="timestamp"><Clock size={12} style={{marginRight: 4}} />{result.start}</span>
                    </div>
                    <div className="result-text">
                      {highlightText(result.text, searchTerm)}
                    </div>
                  </div>
                ))}
                {results.length > 100 && (
                  <div className="results-info" style={{textAlign: 'center', padding: '2rem'}}>
                    ...and {results.length - 100} more results.
                  </div>
                )}
              </>
            ) : searchTerm.length >= 2 ? (
              <div className="loading-view">
                <Search size={48} style={{marginBottom: '1rem', opacity: 0.2}} />
                <p>No matches found for "{searchTerm}"</p>
              </div>
            ) : files.length === 0 ? (
              <div className="loading-view" style={{opacity: 0.8}}>
                <Sparkles size={64} style={{marginBottom: '1.5rem', color: 'var(--accent-color)'}} />
                <h2 style={{marginBottom: '0.5rem', color: '#fff'}}>Ready to Search?</h2>
                <p style={{marginBottom: '2rem'}}>Start by scanning the current workspace or loading a new directory.</p>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button className="btn btn-primary" onClick={handleScanWorkspace}>Scan Workspace</button>
                  <button className="btn" onClick={handleLoadDirectory}>Load Directory</button>
                </div>
              </div>
            ) : (
              <div className="loading-view" style={{opacity: 0.4}}>
                <Search size={48} style={{marginBottom: '1rem'}} />
                <p>Type at least 2 characters to search across {files.length} files.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Full View */}
      {isModalOpen && selectedResult && (
        <div className="overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <div className="file-name" style={{maxWidth: '85%'}}>{selectedResult.fileName}</div>
              <button className="btn" style={{padding: '5px'}} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <div className="modal-content">
              {selectedResult.subtitles.map((sub, idx) => (
                <div 
                  key={idx} 
                  className={`srt-block ${idx === selectedResult.actualIdx ? 'active' : ''}`}
                  id={idx === selectedResult.actualIdx ? 'active-ref' : undefined}
                >
                  <div className="timestamp" style={{display: 'inline-block', marginBottom: '5px'}}>
                    {sub.start}
                  </div>
                  <div className="result-text">{highlightText(sub.text, searchTerm)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
