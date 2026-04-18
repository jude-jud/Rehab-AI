"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "rehabai-playlists";

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {}
}

// ── TypewriterText ────────────────────────────────────────────────────────────
function TypewriterText({ text, speed = 14, onTick }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    let i = 0;
    setShown("");
    const t = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);

  useEffect(() => { onTick?.(); }, [shown, onTick]);

  const done = shown.length >= text.length;
  return (
    <span>
      {shown}
      {!done && <span className="tw-caret">▍</span>}
      <style jsx>{`
        .tw-caret { display:inline-block; width:8px; margin-left:2px; opacity:.85; animation:blink 1s steps(2,start) infinite; }
        @keyframes blink { to { visibility:hidden; } }
      `}</style>
    </span>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconPlay = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
);
const IconPause = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);
const IconX = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
    <polyline points="9,18 15,12 9,6"/>
  </svg>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ playlists, activeId, setActiveId, onCreatePlaylist, onRenamePlaylist, onDeletePlaylist, onRemoveVideo, sidebarOpen, setSidebarOpen }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});
  const [playingId, setPlayingId] = useState(null);

  const toggleExpand = (id) => setExpandedIds((v) => ({ ...v, [id]: !v[id] }));

  const startRename = (pl) => { setEditingId(pl.id); setEditName(pl.name); };
  const commitRename = (id) => { if (editName.trim()) onRenamePlaylist(id, editName.trim()); setEditingId(null); };
  const commitCreate = () => { if (newName.trim()) onCreatePlaylist(newName.trim()); setNewName(""); setCreating(false); };

  return (
    <>
      {/* Slide tab */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? "Hide playlists" : "Show playlists"}
        style={{
          position: "fixed", top: "50%",
          left: sidebarOpen ? 256 : 0,
          transform: "translateY(-50%)",
          zIndex: 200, width: 22, height: 56,
          borderRadius: "0 8px 8px 0",
          background: "rgba(255,200,120,0.18)",
          border: "1px solid rgba(255,200,120,0.4)", borderLeft: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,200,120,0.9)",
          transition: "left 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          style={{ transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}>
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: "fixed", top: 0,
        left: sidebarOpen ? 0 : -256,
        width: 256, height: "100vh",
        background: "#0e0e0e",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        zIndex: 100, display: "flex", flexDirection: "column",
        transition: "left 0.3s cubic-bezier(0.22,1,0.36,1)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,200,120,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
                <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
                <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
              </svg>
              <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>My Playlists</span>
            </div>
            <button type="button" onClick={() => setCreating(true)} title="New playlist"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 8,
                background: "rgba(255,200,120,0.14)", border: "1px solid rgba(255,200,120,0.35)",
                cursor: "pointer", color: "rgba(255,200,120,0.9)",
              }}><IconPlus /></button>
          </div>

          {creating && (
            <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
              <input
                autoFocus value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setCreating(false); }}
                placeholder="Playlist name…"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,200,120,0.4)", borderRadius: 8,
                  padding: "5px 8px", color: "rgba(255,255,255,0.88)", fontSize: 12, outline: "none",
                }}
              />
              <button type="button" onClick={commitCreate}
                style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(255,200,120,0.2)", border: "1px solid rgba(255,200,120,0.4)", color: "rgba(255,200,120,0.9)", cursor: "pointer", fontSize: 12 }}>
                Add
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {playlists.length === 0 && (
            <p style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.6 }}>
              No playlists yet.<br/>Hit + to create one.
            </p>
          )}

          {playlists.map((pl) => (
            <div key={pl.id}>
              {/* Playlist row */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px 8px 16px",
                  background: activeId === pl.id ? "rgba(255,200,120,0.08)" : "transparent",
                  borderLeft: activeId === pl.id ? "2px solid rgba(255,200,120,0.7)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onClick={() => { setActiveId(pl.id); toggleExpand(pl.id); }}
              >
                <IconChevron open={!!expandedIds[pl.id]} />

                {editingId === pl.id ? (
                  <input
                    autoFocus value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(pl.id); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => commitRename(pl.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,200,120,0.4)",
                      borderRadius: 6, padding: "3px 6px", color: "rgba(255,255,255,0.88)", fontSize: 12, outline: "none",
                    }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {pl.name}
                  </span>
                )}

                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", minWidth: 14, textAlign: "right" }}>{pl.videos.length}</span>

                <button type="button" onClick={(e) => { e.stopPropagation(); startRename(pl); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2, display: "flex" }}
                  title="Rename"><IconEdit /></button>

                <button type="button" onClick={(e) => { e.stopPropagation(); onDeletePlaylist(pl.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,100,100,0.5)", padding: 2, display: "flex" }}
                  title="Delete playlist"><IconX size={10} /></button>
              </div>

              {/* Videos */}
              {expandedIds[pl.id] && pl.videos.length > 0 && (
                <div style={{ paddingBottom: 4 }}>
                  {pl.videos.map((vid, idx) => (
                    <div key={vid.id} style={{ padding: "6px 12px 6px 36px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", minWidth: 14 }}>{idx + 1}</span>
                        <span style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {vid.label}
                        </span>
                        <button type="button" onClick={() => setPlayingId((v) => (v === vid.id ? null : vid.id))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,200,120,0.7)", display: "flex", padding: 2 }}
                          title={playingId === vid.id ? "Close" : "Play"}>
                          {playingId === vid.id ? <IconPause /> : <IconPlay />}
                        </button>
                        <button type="button" onClick={() => { if (playingId === vid.id) setPlayingId(null); onRemoveVideo(pl.id, vid.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,100,100,0.5)", display: "flex", padding: 2 }}
                          title="Remove"><IconX size={10} /></button>
                      </div>
                      {playingId === vid.id && (
                        <video src={vid.src} controls autoPlay style={{ marginTop: 8, width: "100%", borderRadius: 8 }} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {expandedIds[pl.id] && pl.videos.length === 0 && (
                <p style={{ padding: "6px 16px 6px 36px", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Empty playlist</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Save-to-Playlist dropdown ─────────────────────────────────────────────────
function SaveDropdown({ playlists, videoSrc, videoLabel, onSave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const savedIn = playlists.filter((pl) => pl.videos.some((v) => v.src === videoSrc));

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          height: 30, padding: "0 14px", borderRadius: 999,
          background: savedIn.length > 0 ? "rgba(255,200,120,0.08)" : "rgba(255,200,120,0.16)",
          border: savedIn.length > 0 ? "1px solid rgba(255,200,120,0.2)" : "1px solid rgba(255,200,120,0.55)",
          color: savedIn.length > 0 ? "rgba(255,200,120,0.55)" : "rgba(255,200,120,0.95)",
          cursor: "pointer", fontSize: 12, fontWeight: 600,
        }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill={savedIn.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        {savedIn.length > 0 ? `Saved (${savedIn.length})` : "Save to Playlist"}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginLeft: 2 }}>
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          minWidth: 200, background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 300, overflow: "hidden",
        }}>
          {playlists.length === 0 ? (
            <p style={{ padding: "12px 14px", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              No playlists — create one in the sidebar first.
            </p>
          ) : playlists.map((pl) => {
            const already = pl.videos.some((v) => v.src === videoSrc);
            return (
              <button key={pl.id} type="button"
                onClick={() => { onSave(pl.id, videoSrc, videoLabel); setOpen(false); }}
                disabled={already}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", background: "transparent",
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  cursor: already ? "default" : "pointer",
                  color: already ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.82)",
                  fontSize: 12, textAlign: "left", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!already) e.currentTarget.style.background = "rgba(255,200,120,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ flex: 1 }}>{pl.name}</span>
                {already && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,200,120,0.6)" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Chatbot ──────────────────────────────────────────────────────────────
export default function Chatbot() {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [deepSearch, setDeepSearch] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // playlists: [{ id, name, videos: [{ id, src, label }] }]
  // Initialise directly from localStorage — avoids a race where the save effect
  // fires with [] before the load effect can restore the real data.
  const [playlists, setPlaylists] = useState(() => loadPlaylists());
  const [activePlaylistId, setActivePlaylistId] = useState(() => {
    const saved = loadPlaylists();
    return saved.length > 0 ? saved[0].id : null;
  });

  // Skip the very first render so we never overwrite localStorage with stale state,
  // then persist on every subsequent change.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    savePlaylists(playlists);
  }, [playlists]);

  const [messages, setMessages] = useState([
    {
      id: "initial-message",
      role: "assistant",
      content: "Hi — I'm Rehab AI. Tell me what you're dealing with right now, and I'll help you take the next step.",
      animate: false,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);

  const scrollChatToBottom = useCallback((behavior = "auto") => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => { scrollChatToBottom("auto"); }, [messages, loading, scrollChatToBottom]);
  const handleTypeTick = useCallback(() => { scrollChatToBottom("auto"); }, [scrollChatToBottom]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Playlist actions ──────────────────────────────────────────────────────
  const createPlaylist = useCallback((name) => {
    const newPl = { id: uid(), name, videos: [] };
    setPlaylists((prev) => [...prev, newPl]);
    setActivePlaylistId(newPl.id);
  }, []);

  const renamePlaylist = useCallback((id, name) => {
    setPlaylists((prev) => prev.map((pl) => pl.id === id ? { ...pl, name } : pl));
  }, []);

  const deletePlaylist = useCallback((id) => {
    setPlaylists((prev) => {
      const next = prev.filter((pl) => pl.id !== id);
      setActivePlaylistId(next.length > 0 ? next[0].id : null);
      return next;
    });
  }, []);

  const saveVideoToPlaylist = useCallback((playlistId, src, label) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.videos.some((v) => v.src === src)) return pl;
        return { ...pl, videos: [...pl.videos, { id: uid(), src, label }] };
      })
    );
  }, []);

  const removeVideoFromPlaylist = useCallback((playlistId, videoId) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, videos: pl.videos.filter((v) => v.id !== videoId) }
          : pl
      )
    );
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault?.();
    setError("");
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: uid(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, deepSearch, mode: videoMode ? "video" : "text" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      if (data.type === "video") {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: data.video, isVideo: true, label: trimmed },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: data.text || "…", animate: true },
        ]);
      }
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "rgba(255,255,255,0.92)", overflow: "visible" }}>

      <Sidebar
        playlists={playlists}
        activeId={activePlaylistId}
        setActiveId={setActivePlaylistId}
        onCreatePlaylist={createPlaylist}
        onRenamePlaylist={renamePlaylist}
        onDeletePlaylist={deletePlaylist}
        onRemoveVideo={removeVideoFromPlaylist}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content shifts right when sidebar open */}
      <div style={{
        marginLeft: sidebarOpen ? 256 : 0,
        transition: "margin-left 0.3s cubic-bezier(0.22,1,0.36,1)",
        padding: "96px 48px",
      }}>
        <div style={{ maxWidth: 1248, margin: "0 auto" }}>
          <div style={{
            transform: mounted ? "translateY(0px)" : "translateY(18px)",
            opacity: mounted ? 1 : 0,
            transition: "transform 800ms cubic-bezier(0.22,1,0.36,1), opacity 800ms ease",
            willChange: "transform, opacity",
          }}>
            {/* Chat card */}
            <div style={{
              padding: 1, borderRadius: 18,
              background: "linear-gradient(90deg, rgba(80,220,255,0.55), rgba(255,255,255,0.06), rgba(0,0,0,0))",
            }} className="bg-[#121212]">
              <div style={{
                position: "relative", borderRadius: 17, background: "#121212",
                border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(14px)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
              }}>
                <div aria-hidden style={{
                  position: "absolute", inset: -120, borderRadius: 260,
                  background: `radial-gradient(900px 420px at 18% 8%, rgba(80,220,255,0.42), rgba(0,0,0,0) 65%),
                    radial-gradient(900px 420px at 82% 8%, rgba(120,255,210,0.34), rgba(0,0,0,0) 65%)`,
                  filter: "blur(124px)", opacity: 1, pointerEvents: "none", zIndex: 0,
                }} />

                <div style={{ position: "relative", zIndex: 1, borderRadius: 17, overflow: "hidden", background: "#121212" }}>
                  {/* Title bar */}
                  <div style={{
                    padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontWeight: 650, letterSpacing: "0.2px", color: "rgba(255,255,255,0.85)",
                    background: "rgba(18,18,18,0.85)",
                  }}>
                    <p className="small-text"><strong>Rehab AI</strong> 3.0 Thinking</p>
                  </div>

                  {/* Messages */}
                  <div ref={chatRef} style={{
                    padding: 18, display: "flex", flexDirection: "column", gap: 18,
                    height: 492, overflowY: "auto", overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                  }}>
                    {messages.map((m) => {
                      const isUser = m.role === "user";
                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                          {isUser ? (
                            <div style={{
                              maxWidth: 420, padding: "12px 14px", borderRadius: 14,
                              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.92)", lineHeight: 1.35,
                            }}>
                              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>
                            </div>
                          ) : (
                            <div style={{
                              maxWidth: 520, padding: "4px 2px", color: "rgba(255,255,255,0.88)",
                              lineHeight: 1.45, fontSize: 14, whiteSpace: "pre-wrap",
                            }}>
                              {m.isVideo ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  <video src={m.content} controls style={{ maxWidth: 480, borderRadius: 12 }} />
                                  <SaveDropdown
                                    playlists={playlists}
                                    videoSrc={m.content}
                                    videoLabel={m.label || "Rehab video"}
                                    onSave={saveVideoToPlaylist}
                                  />
                                </div>
                              ) : (
                                <p style={{ margin: 0 }}>
                                  {m.animate
                                    ? <TypewriterText text={m.content} onTick={handleTypeTick} />
                                    : m.content}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {loading && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ maxWidth: 520, padding: "4px 2px", color: "rgba(255,255,255,0.75)" }}>
                          <p style={{ margin: 0 }}>{deepSearch ? "Deep thinking…" : "Thinking…"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div style={{ padding: "0 18px 18px", background: "rgba(18,18,18,0.6)" }}>
                    <form onSubmit={sendMessage} style={{ borderRadius: 16 }}>
                      <div style={{
                        padding: 1, borderRadius: 16,
                        border: "0.5px solid rgba(255,255,255,0.9)",
                        background: "linear-gradient(90deg, rgba(173,247,255,1) 31%, rgba(228,255,242,1) 100%)",
                      }}>
                        <div style={{
                          borderRadius: 15, background: "rgba(18,18,18,0.92)",
                          border: "1px solid rgba(255,255,255,0.06)", padding: 14,
                        }}>
                          <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything…"
                            rows={3}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                            style={{
                              width: "100%", resize: "none", background: "transparent",
                              border: "none", outline: "none", color: "rgba(255,255,255,0.92)",
                              fontSize: 20, lineHeight: 1.35,
                            }}
                          />

                          <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
                            <div style={{ display: "flex", gap: 10 }}>
                              <button type="button" onClick={() => setDeepSearch((v) => !v)}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 8,
                                  height: 30, padding: "0 12px", borderRadius: 999,
                                  background: deepSearch ? "rgba(173,247,255,0.16)" : "rgba(255,255,255,0.06)",
                                  border: deepSearch ? "1px solid rgba(173,247,255,0.55)" : "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.88)", cursor: "pointer",
                                }}>
                                <p className="small-text" style={{ margin: 0 }}>{deepSearch ? "Deep Search: On" : "Deep Search"}</p>
                              </button>

                              <button type="button" onClick={() => setVideoMode((v) => !v)}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 8,
                                  height: 30, padding: "0 12px", borderRadius: 999,
                                  background: videoMode ? "rgba(255,200,120,0.16)" : "rgba(255,255,255,0.06)",
                                  border: videoMode ? "1px solid rgba(255,200,120,0.55)" : "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.88)", cursor: "pointer",
                                }}>
                                <p className="small-text" style={{ margin: 0 }}>{videoMode ? "Video Mode: On" : "Video Mode"}</p>
                              </button>
                            </div>
                          </div>

                          {error && <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 13 }}>{error}</div>}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
