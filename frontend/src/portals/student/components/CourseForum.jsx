import { MessageSquare, NotebookText, Send, X, Bot, Sparkles, Video, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { isNonEmptyString } from "../../../utils/validation";

/**
 * Expects an `api` axios instance (each portal has its own with its own auth
 * token) passed in as a prop, so this one component works for both the
 * Student and Teacher portals without duplicating it per-portal.
 */
export default function CourseForum({ api, courseId, role = "student", onClose }) {
  const [tab, setTab] = useState("forum");
  const [topics, setTopics] = useState(null);
  const [notes, setNotes] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [newTopic, setNewTopic] = useState({ title: "", content: "" });
  const [reply, setReply] = useState("");
  const [newNote, setNewNote] = useState({ title: "", body_markdown: "" });
  const [validationErrors, setValidationErrors] = useState({});

  // AI Tutor states
  const [aiLogs, setAiLogs] = useState(null);
  const [newAiQuery, setNewAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  function loadTopics() {
    api.get(`/lms/forum-topics/?course_id=${courseId}`).then(({ data }) => setTopics(data)).catch(() => setTopics([]));
  }
  function loadNotes() {
    api.get(`/lms/notes/?course_id=${courseId}`).then(({ data }) => setNotes(data)).catch(() => setNotes([]));
  }
  function loadAiLogs() {
    const url = role === "teacher" 
      ? `/teacher/lms/ai-usage/?course_id=${courseId}` 
      : `/student/ai-tutor/?course_id=${courseId}`;
    api.get(url).then(({ data }) => setAiLogs(data)).catch(() => setAiLogs([]));
  }

  useEffect(() => {
    loadTopics();
    loadNotes();
    loadAiLogs();
  }, [courseId, tab]);

  async function postTopic(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(newTopic.title)) {
      errs.topicTitle = "Topic title is required.";
    }
    if (!isNonEmptyString(newTopic.content)) {
      errs.topicContent = "Topic content is required.";
    }
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    await api.post("/lms/forum-topics/", { course_id: courseId, ...newTopic });
    setNewTopic({ title: "", content: "" });
    loadTopics();
  }

  async function openTopic(id) {
    const { data } = await api.get(`/lms/forum-topics/${id}/`);
    setActiveTopic(data);
  }

  async function postReply(e) {
    e.preventDefault();
    if (!isNonEmptyString(reply)) {
      setValidationErrors({ reply: "Reply content cannot be empty." });
      return;
    }
    setValidationErrors({});
    await api.post(`/lms/forum-topics/${activeTopic.id}/reply/`, { post_text: reply });
    setReply("");
    openTopic(activeTopic.id);
    loadTopics();
  }

  async function postNote(e) {
    e.preventDefault();
    const errs = {};
    if (!isNonEmptyString(newNote.title)) {
      errs.noteTitle = "Note title is required.";
    }
    if (!isNonEmptyString(newNote.body_markdown)) {
      errs.noteBody = "Note body is required.";
    }
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors({});
    await api.post("/lms/notes/", { course_id: courseId, ...newNote });
    setNewNote({ title: "", body_markdown: "" });
    loadNotes();
  }

  async function askAiTutor(e) {
    e.preventDefault();
    if (!newAiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      await api.post("/student/ai-tutor/", { course_id: courseId, message: newAiQuery });
      setNewAiQuery("");
      loadAiLogs();
    } catch {
      // ignore
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("forum")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "forum" ? "bg-academic-blue text-white" : "bg-slate-100 text-ink-secondary"}`}
            >
              <MessageSquare size={14} /> Discussion
            </button>
            <button
              onClick={() => setTab("notes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "notes" ? "bg-academic-blue text-white" : "bg-slate-100 text-ink-secondary"}`}
            >
              <NotebookText size={14} /> Digital Notes
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "ai" ? "bg-academic-blue text-white" : "bg-slate-100 text-ink-secondary"}`}
            >
              <Bot size={14} /> {role === "teacher" ? "AI Tutor Insights" : "AI Tutor"}
            </button>
          </div>
          <button onClick={onClose} className="text-ink-secondary hover:text-ink-primary"><X size={20} /></button>
        </div>

        {tab === "forum" && !activeTopic && (
          <div className="space-y-4">
            <form onSubmit={postTopic} className="space-y-2 bg-surface-light rounded-xl p-3">
              <div>
                <input placeholder="Start a new topic…" value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus-ring outline-none ${
                    validationErrors.topicTitle ? "border-danger" : "border-slate-200"
                  }`} />
                {validationErrors.topicTitle && (
                  <p className="text-xs text-danger mt-1">{validationErrors.topicTitle}</p>
                )}
              </div>
              <div>
                <textarea placeholder="What's on your mind?" rows={2} value={newTopic.content} onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus-ring outline-none resize-none ${
                    validationErrors.topicContent ? "border-danger" : "border-slate-200"
                  }`} />
                {validationErrors.topicContent && (
                  <p className="text-xs text-danger mt-1">{validationErrors.topicContent}</p>
                )}
              </div>
              <button className="text-sm font-medium text-academic-blue hover:underline flex items-center gap-1"><Send size={13} /> Post topic</button>
            </form>
            {topics === null ? (
              <p className="text-sm text-ink-secondary">Loading…</p>
            ) : topics.length === 0 ? (
              <p className="text-sm text-ink-secondary text-center py-4">No topics yet — start the conversation.</p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => openTopic(t.id)} className="w-full text-left rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-surface-light transition-colors">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{t.creator_name} · {t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "forum" && activeTopic && (
          <div className="space-y-3">
            <button onClick={() => setActiveTopic(null)} className="text-xs text-academic-blue hover:underline">← Back to topics</button>
            <div>
              <p className="font-heading font-semibold">{activeTopic.title}</p>
              <p className="text-xs text-ink-secondary mb-2">{activeTopic.creator_name}</p>
              <p className="text-sm">{activeTopic.content}</p>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {activeTopic.posts.map((p) => (
                <div key={p.id} className="bg-surface-light rounded-xl px-3 py-2">
                  <p className="text-xs font-medium text-ink-secondary">{p.author_name}</p>
                  <p className="text-sm">{p.post_text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={postReply} className="flex gap-2">
              <div className="flex-1">
                <input placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus-ring outline-none ${
                    validationErrors.reply ? "border-danger" : "border-slate-200"
                  }`} />
                {validationErrors.reply && (
                  <p className="text-xs text-danger mt-1">{validationErrors.reply}</p>
                )}
              </div>
              <button className="px-3 rounded-lg bg-academic-blue text-white h-[38px]"><Send size={14} /></button>
            </form>
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">
            <form onSubmit={postNote} className="space-y-2 bg-surface-light rounded-xl p-3">
              <div>
                <input placeholder="Note title" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus-ring outline-none ${
                    validationErrors.noteTitle ? "border-danger" : "border-slate-200"
                  }`} />
                {validationErrors.noteTitle && (
                  <p className="text-xs text-danger mt-1">{validationErrors.noteTitle}</p>
                )}
              </div>
              <div>
                <textarea placeholder="Write your notes (markdown supported)…" rows={3} value={newNote.body_markdown} onChange={(e) => setNewNote({ ...newNote, body_markdown: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus-ring outline-none resize-none ${
                    validationErrors.noteBody ? "border-danger" : "border-slate-200"
                  }`} />
                {validationErrors.noteBody && (
                  <p className="text-xs text-danger mt-1">{validationErrors.noteBody}</p>
                )}
              </div>
              <button className="text-sm font-medium text-academic-blue hover:underline flex items-center gap-1"><Send size={13} /> Save note</button>
            </form>
            {notes === null ? (
              <p className="text-sm text-ink-secondary">Loading…</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-ink-secondary text-center py-4">No notes shared yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-ink-secondary mb-1">{n.author_name}</p>
                    <p className="text-sm whitespace-pre-wrap">{n.body_markdown}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "ai" && role === "student" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-academic-blue to-violet-600 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <div>
                  <h4 className="font-heading font-semibold text-sm">EduNova Academic AI Tutor</h4>
                  <p className="text-[10px] text-white/80">Subject-Specific Explanations, Examples, Exercises, & Video recommendations</p>
                </div>
              </div>
              <Sparkles size={16} className="text-amber-350 animate-pulse text-yellow-350" />
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto p-2 bg-slate-50 rounded-xl">
              {aiLogs === null ? (
                <p className="text-xs text-ink-secondary">Loading chat history...</p>
              ) : aiLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No questions asked yet. Ask the AI Tutor anything about this subject!</p>
              ) : (
                aiLogs.map((log, lIdx) => (
                  <div key={log.id || lIdx} className="space-y-2.5">
                    <div className="flex gap-2 justify-end max-w-[85%] ml-auto">
                      <div className="bg-academic-blue text-white rounded-2xl rounded-tr-none p-3 text-xs shadow-sm">
                        {log.question}
                      </div>
                    </div>
                    <div className="flex gap-2 max-w-[90%] mr-auto">
                      <div className="w-6 h-6 rounded-full bg-academic-blue/10 flex items-center justify-center text-academic-blue shrink-0">
                        <Bot size={13} />
                      </div>
                      <div className="bg-white border border-slate-150 rounded-2xl rounded-tl-none p-3.5 text-xs shadow-sm space-y-3 w-full">
                        <div>
                          <p className="font-bold text-academic-blue mb-1">Explanation</p>
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{log.answer_explanation}</p>
                        </div>
                        {log.answer_examples && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                            <p className="font-bold text-slate-600 font-sans mb-1 text-xs">Examples:</p>
                            {log.answer_examples}
                          </div>
                        )}
                        {log.answer_questions && (
                          <div className="border-t border-slate-100 pt-2.5">
                            <p className="font-bold text-academic-orange mb-1">Practice Questions:</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{log.answer_questions}</p>
                          </div>
                        )}
                        {log.answer_video && (
                          <div className="flex items-center gap-1.5 text-academic-blue hover:underline mt-1 font-semibold">
                            <Video size={13} />
                            <a href={log.answer_video} target="_blank" rel="noreferrer">Watch Recommended Lecture Video &rarr;</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={askAiTutor} className="flex gap-2">
              <input
                required
                placeholder="Ask a question about this subject..."
                value={newAiQuery}
                onChange={(e) => setNewAiQuery(e.target.value)}
                disabled={aiLoading}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring outline-none bg-slate-50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!newAiQuery.trim() || aiLoading}
                className="px-4 bg-academic-blue hover:bg-academic-blue/90 disabled:opacity-50 text-white rounded-xl flex items-center justify-center font-semibold text-sm transition-colors shrink-0"
              >
                {aiLoading ? "Thinking..." : "Ask"}
              </button>
            </form>
          </div>
        )}

        {tab === "ai" && role === "teacher" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-academic-orange to-amber-600 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <div>
                  <h4 className="font-heading font-semibold text-sm">AI Tutor Student Usage Insights</h4>
                  <p className="text-[10px] text-white/80">Monitor concepts/topics where your students are requesting AI assistance</p>
                </div>
              </div>
              <Sparkles size={16} className="text-white/60" />
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto p-2 bg-slate-50 rounded-xl">
              {aiLogs === null ? (
                <p className="text-xs text-slate-400">Loading usage logs...</p>
              ) : aiLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No AI Tutor usage recorded for this course yet.</p>
              ) : (
                aiLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2 text-left">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold text-academic-blue uppercase">{log.student_name}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Question asked</span>
                      <p className="text-xs font-semibold text-slate-800 italic">"{log.question}"</p>
                    </div>
                    <div className="border-t border-slate-50 pt-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">AI Explanation</span>
                      <p className="text-slate-600 leading-relaxed mt-0.5 line-clamp-3">{log.answer_explanation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
