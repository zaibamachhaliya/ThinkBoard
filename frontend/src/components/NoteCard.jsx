import { useState } from "react";
import { PenSquareIcon, Trash2Icon, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

const NoteCard = ({
  note,
  setNotes,
  allNotes = [],
  activeDragId,
  setActiveDragId,
  onMoveNote,
  onCombineNotes,
  onReorderNotes,
}) => {
  const [dragIndicator, setDragIndicator] = useState(null); // 'before' | 'after' | 'stack' | null
  const [childDragIndicator, setChildDragIndicator] = useState(null); // { targetId, position } | null
  const [expanded, setExpanded] = useState(false);
  const isDraggingThisNote = activeDragId === note._id;
  const isStackDrop = dragIndicator === "stack";
  const dragHintLabel =
    dragIndicator === "before"
      ? "Insert before"
      : dragIndicator === "after"
        ? "Insert after"
        : dragIndicator === "stack"
          ? note.isGroup
            ? "Add to stack"
            : "Merge into group"
          : null;
  
  // Group editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleVal, setEditTitleVal] = useState(note.title);

  // Group add note state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Get rid of navigation behavior
    e.stopPropagation(); // Stop event bubble

    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((item) => item._id !== id));
      toast.success("Deleted successfully");
    } catch (error) {
      console.log("Error in handleDelete", error);
      toast.error("Failed to delete");
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", note._id);
    e.dataTransfer.effectAllowed = "move";

    const dragPreview = e.currentTarget.cloneNode(true);
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-1000px";
    dragPreview.style.left = "-1000px";
    dragPreview.style.width = `${e.currentTarget.offsetWidth}px`;
    dragPreview.style.pointerEvents = "none";
    dragPreview.style.opacity = "0.55";
    dragPreview.style.transform = "scale(0.98)";
    dragPreview.style.filter = "saturate(0.9) blur(0.1px)";
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);
    window.requestAnimationFrame(() => {
      dragPreview.remove();
    });

    setActiveDragId(note._id);
  };

  const getDragIndicatorFromPoint = (clientX, clientY, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      if (y < height * 0.25) return "before";
      if (y > height * 0.75) return "after";
      return "stack";
    }

    if (x < width * 0.25) return "before";
    if (x > width * 0.75) return "after";
    return "stack";
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
    setDragIndicator(null);
    setChildDragIndicator(null);
  };

  const handleDragOver = (e) => {
    if (activeDragId === note._id) return; // Cannot drop on itself

    if (note.isGroup) {
      // Don't drag children into their current parent
      const childrenIds = allNotes
        .filter((n) => n.parentId === note._id)
        .map((n) => n._id);
      if (childrenIds.includes(activeDragId)) return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragIndicator(getDragIndicatorFromPoint(e.clientX, e.clientY, e.currentTarget));
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragIndicator(null);
  };

  const getVerticalDragIndicator = (clientY, currentTarget) => {
    const rect = currentTarget.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.3) return "before";
    if (y > height * 0.7) return "after";
    return "stack";
  };

  const handleChildDragOver = (e, child) => {
    if (activeDragId === child._id) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const position = getVerticalDragIndicator(e.clientY, e.currentTarget);
    setChildDragIndicator({ targetId: child._id, position });
    setDragIndicator(null);
  };

  const handleChildDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setChildDragIndicator(null);
  };

  const handleChildDrop = (e, child) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === child._id) {
      setChildDragIndicator(null);
      return;
    }

    const finalIndicator = childDragIndicator?.targetId === child._id
      ? childDragIndicator.position
      : getVerticalDragIndicator(e.clientY, e.currentTarget);

    setChildDragIndicator(null);
    setDragIndicator(null);

    if (finalIndicator === "stack") return;

    onReorderNotes(sourceId, child._id, finalIndicator, note._id);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === note._id) {
      setDragIndicator(null);
      return;
    }

    const finalIndicator = dragIndicator || getDragIndicatorFromPoint(e.clientX, e.clientY, e.currentTarget);
    setDragIndicator(null);

    if (finalIndicator === "stack") {
      if (note.isGroup) {
        onMoveNote(sourceId, note._id);
      } else {
        onCombineNotes(sourceId, note._id);
      }
    } else {
      onReorderNotes(sourceId, note._id, finalIndicator);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitleVal.trim()) {
      setEditTitleVal(note.title);
      setIsEditingTitle(false);
      return;
    }
    if (editTitleVal.trim() === note.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await api.put(`/notes/${note._id}`, {
        ...note,
        title: editTitleVal.trim(),
      });
      setNotes((prev) => prev.map((n) => (n._id === note._id ? res.data : n)));
      toast.success("Group title updated");
    } catch (error) {
      console.error("Error updating group title:", error);
      toast.error("Failed to update group title");
      setEditTitleVal(note.title);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleAddChildNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      toast.error("All fields are required to create a note");
      return;
    }

    setAddingNote(true);
    try {
      const res = await api.post("/notes", {
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        parentId: note._id,
      });
      
      setNotes((prev) => [res.data, ...prev]);
      
      toast.success("Note added to group stack");
      setNewNoteTitle("");
      setNewNoteContent("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding note to group stack:", error);
      toast.error("Failed to add note to group");
    } finally {
      setAddingNote(false);
    }
  };

  // Group container view
  if (note.isGroup) {
    const children = allNotes
      .filter((n) => n.parentId === note._id)
      .sort((a, b) => a.position - b.position || new Date(b.createdAt) - new Date(a.createdAt));

    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group transform-gpu transition-all duration-300 ease-out cursor-grab active:cursor-grabbing ${
          isStackDrop
            ? "outline-[3px] outline-dotted outline-[#a855f7] outline-offset-4 scale-[1.02] z-10 shadow-[0_18px_40px_-22px_rgba(168,85,247,0.75)]"
            : isDraggingThisNote
              ? "opacity-70 scale-[0.985]"
              : ""
        }`}
      >
        {dragHintLabel && (
          <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-base-300 bg-base-100/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-base-content shadow-lg backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in duration-150">
            {dragHintLabel}
          </div>
        )}

        {/* Visual indicators for reordering */}
        {dragIndicator === "before" && (
          <div className="absolute top-0 bottom-0 -left-3 w-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse hidden md:block" />
        )}
        {dragIndicator === "before" && (
          <div className="absolute left-0 right-0 -top-3 h-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse md:hidden" />
        )}
        
        {dragIndicator === "after" && (
          <div className="absolute top-0 bottom-0 -right-3 w-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse hidden md:block" />
        )}
        {dragIndicator === "after" && (
          <div className="absolute left-0 right-0 -bottom-3 h-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse md:hidden" />
        )}

        {/* Visual Folder Stack effect */}
        <div className="absolute inset-0 bg-base-100/50 rounded-2xl border border-base-300 translate-x-2 translate-y-2 pointer-events-none transition-all duration-200 shadow-md"></div>
        <div className="absolute inset-0 bg-base-100/85 rounded-2xl border border-base-300 translate-x-1 translate-y-1 pointer-events-none transition-all duration-200 shadow-sm"></div>

        <div className="relative card bg-base-100 hover:shadow-lg border-t-4 border-solid border-[#a855f7] transition-all duration-200">
          <div className="card-body p-5">
            <div className="flex justify-between items-start">
              <div>
                {isEditingTitle ? (
                  <input
                    value={editTitleVal}
                    onChange={(e) => setEditTitleVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle();
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditTitleVal(note.title);
                      }
                    }}
                    onBlur={handleSaveTitle}
                    onClick={(e) => e.stopPropagation()}
                    className="input input-sm input-bordered font-bold text-base-content focus:outline-none focus:ring-2 focus:ring-[#7480ff] max-w-[200px]"
                    autoFocus
                  />
                ) : (
                  <h3
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                      setEditTitleVal(note.title);
                    }}
                    title="Double-click to rename group"
                    className="card-title text-base-content text-lg flex items-center gap-2 cursor-pointer hover:text-[#a855f7] transition-colors"
                  >
                    <span className="text-xl">📁</span> {note.title}
                  </h3>
                )}
                <span className="badge badge-secondary bg-purple-500/10 text-purple-400 border-none mt-2 font-medium text-xs">
                  {children.length} {children.length === 1 ? "card" : "cards"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditingTitle(true);
                    setEditTitleVal(note.title);
                  }}
                  className="btn btn-ghost btn-xs text-base-content/70 hover:text-[#a855f7]"
                  title="Rename Group Stack"
                >
                  <PenSquareIcon className="size-4" />
                </button>
                <button
                  className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                  onClick={(e) => handleDelete(e, note._id)}
                  title="Dissolve Group"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </div>

            <div className="card-actions justify-between items-center mt-6">
              <span className="text-xs text-base-content/50">
                Created: {formatDate(new Date(note.createdAt))}
              </span>
              <button
                className="btn btn-xs btn-outline border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-none flex items-center gap-1 font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <>
                    Hide Stack <ChevronUp className="size-3.5" />
                  </>
                ) : (
                  <>
                    Expand Stack <ChevronDown className="size-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Slide Down child cards listing */}
            {expanded && (
              <div className="mt-4 pt-4 border-t border-dashed border-base-300 flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
                {children.length === 0 ? (
                  <div className="text-center text-xs text-base-content/40 py-4 italic">
                    Empty stack. Drag other notes here to add.
                  </div>
                ) : (
                  children.map((child, childIdx) => {
                    const borderColors = [
                      "border-l-4 border-l-blue-500",
                      "border-l-4 border-l-emerald-500",
                      "border-l-4 border-l-amber-500",
                      "border-l-4 border-l-rose-500",
                      "border-l-4 border-l-purple-500",
                      "border-l-4 border-l-teal-500",
                      "border-l-4 border-l-pink-500",
                      "border-l-4 border-l-indigo-500"
                    ];
                    const borderClass = borderColors[childIdx % borderColors.length];

                    return (
                      <div
                        key={child._id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", child._id);
                          setActiveDragId(child._id);
                        }}
                        onDragEnd={() => {
                          setActiveDragId(null);
                          setChildDragIndicator(null);
                        }}
                        onDragOver={(e) => {
                          e.stopPropagation();
                          handleChildDragOver(e, child);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          handleChildDragLeave(e);
                        }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleChildDrop(e, child);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative p-3 bg-base-200 hover:bg-base-300 rounded-xl border border-base-300 cursor-grab active:cursor-grabbing flex justify-between items-center transition-all duration-200 ${borderClass} ${
                          childDragIndicator?.targetId === child._id && childDragIndicator.position === "before"
                            ? "ring-2 ring-[#7480ff] ring-offset-2 ring-offset-base-100"
                            : childDragIndicator?.targetId === child._id && childDragIndicator.position === "after"
                              ? "ring-2 ring-[#7480ff] ring-offset-2 ring-offset-base-100"
                              : ""
                        }`}
                      >
                        {childDragIndicator?.targetId === child._id && childDragIndicator.position === "before" && (
                          <div className="absolute left-3 right-3 -top-1 h-1 rounded-full bg-primary shadow-[0_0_8px_#7480ff] pointer-events-none" />
                        )}
                        {childDragIndicator?.targetId === child._id && childDragIndicator.position === "after" && (
                          <div className="absolute left-3 right-3 -bottom-1 h-1 rounded-full bg-primary shadow-[0_0_8px_#7480ff] pointer-events-none" />
                        )}
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="font-semibold text-sm truncate block text-base-content">
                            {child.title}
                          </span>
                          <span className="text-[11px] text-base-content/60 block truncate">
                            {child.content || "(No text content)"}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                          <Link
                            to={`/note/${child._id}`}
                            className="btn btn-ghost btn-xs p-1 text-base-content/60 hover:text-[#7480ff]"
                          >
                            <PenSquareIcon className="size-3.5" />
                          </Link>
                          <button
                            className="btn btn-ghost btn-xs p-1 text-error"
                            onClick={(e) => handleDelete(e, child._id)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Inline Form to add note to stack */}
                {showAddForm ? (
                  <form onSubmit={handleAddChildNote} className="p-3 bg-base-200/50 rounded-xl border border-dashed border-base-300 mt-2 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-base-content/70">Add Note to Stack</span>
                    <input
                      type="text"
                      placeholder="Note Title"
                      className="input input-xs input-bordered w-full bg-base-100"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      required
                    />
                    <textarea
                      placeholder="Note content..."
                      className="textarea textarea-xs textarea-bordered w-full h-16 bg-base-100"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      required
                    />
                    <div className="flex justify-end gap-1.5 mt-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewNoteTitle("");
                          setNewNoteContent("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingNote}
                        className="btn btn-primary btn-xs bg-[#7480ff] hover:bg-[#5b68ff] text-white border-none"
                      >
                        {addingNote ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-xs btn-dashed border-base-300 text-base-content/70 hover:text-[#7480ff] hover:border-[#7480ff] mt-2 flex items-center justify-center gap-1 py-2 h-auto"
                  >
                    <span>+ Add Note to Stack</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular Note Card View
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative cursor-grab active:cursor-grabbing transform-gpu transition-all duration-300 ease-out ${
        isStackDrop
          ? "outline-[3px] outline-dotted outline-[#a855f7] outline-offset-4 scale-[1.02] z-10 shadow-[0_18px_40px_-22px_rgba(168,85,247,0.75)]"
          : isDraggingThisNote
            ? "opacity-70 scale-[0.985]"
            : ""
      }`}
    >
      {dragHintLabel && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-base-300 bg-base-100/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-base-content shadow-lg backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in duration-150">
          {dragHintLabel}
        </div>
      )}

      {/* Visual indicators for reordering */}
      {dragIndicator === "before" && (
        <div className="absolute top-0 bottom-0 -left-3 w-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse hidden md:block" />
      )}
      {dragIndicator === "before" && (
        <div className="absolute left-0 right-0 -top-3 h-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse md:hidden" />
      )}
      
      {dragIndicator === "after" && (
        <div className="absolute top-0 bottom-0 -right-3 w-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse hidden md:block" />
      )}
      {dragIndicator === "after" && (
        <div className="absolute left-0 right-0 -bottom-3 h-1 bg-primary rounded-full shadow-[0_0_8px_#7480ff] z-20 pointer-events-none animate-pulse md:hidden" />
      )}

      <Link
        to={`/note/${note._id}`}
        className="card bg-base-100 hover:shadow-lg transition-all duration-200 
        border-t-4 border-solid border-[#7480ff]"
      >
        <div className="card-body">
          <h3 className="card-title text-base-content">{note.title}</h3>
          <p className="text-base-content/70 line-clamp-3">{note.content}</p>
          <div className="card-actions justify-between items-center mt-4">
            <span className="text-sm text-base-content/60">
              {formatDate(new Date(note.createdAt))}
            </span>
            <div className="flex items-center gap-1">
              <PenSquareIcon className="size-4 text-base-content/70" />
              <button
                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                onClick={(e) => handleDelete(e, note._id)}
              >
                <Trash2Icon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default NoteCard;