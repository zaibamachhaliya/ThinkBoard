import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import RateLimitedUI from "../components/RateLimitedUI";
import api from "../lib/axios";
import toast from "react-hot-toast";
import NoteCard from "../components/NoteCard";
import NotesNotFound from "../components/NotesNotFound";

const HomePage = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drag & drop state
  const [activeDragId, setActiveDragId] = useState(null);

  // Group creation modal state
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [modalSourceId, setModalSourceId] = useState(null);
  const [modalTargetId, setModalTargetId] = useState(null);
  const [groupTitle, setGroupTitle] = useState("");

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notes");
      setNotes(res.data);
      setIsRateLimited(false);
    } catch (error) {
      console.log("Error fetching notes");
      console.log(error.response);
      if (error.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        toast.error("Failed to load notes");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Update a note's parentId (moves it inside a group or back to the main board)
  const handleMoveNote = async (noteId, parentId) => {
    try {
      const noteToUpdate = notes.find((n) => n._id === noteId);
      if (!noteToUpdate) return;

      const res = await api.put(`/notes/${noteId}`, {
        ...noteToUpdate,
        parentId: parentId,
      });

      // Update local state
      setNotes((prev) => prev.map((n) => (n._id === noteId ? res.data : n)));
      
      if (parentId === null) {
        toast.success("Note restored to main board");
      } else {
        toast.success("Note added to group stack");
      }
    } catch (error) {
      console.error("Error moving note:", error);
      toast.error("Failed to move note");
    }
  };

  // Combine two standard notes into a new Group stack
  const handleCombineNotes = (sourceId, targetId) => {
    setModalSourceId(sourceId);
    setModalTargetId(targetId);
    setGroupTitle("");
    setShowNamingModal(true);
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || !modalSourceId || !modalTargetId) return;

    try {
      // 1. Create the new group note
      const groupRes = await api.post("/notes", {
        title: groupTitle.trim(),
        content: "",
        isGroup: true,
        parentId: null,
      });
      const newGroup = groupRes.data;

      // Find original note payloads
      const sourceNote = notes.find((n) => n._id === modalSourceId);
      const targetNote = notes.find((n) => n._id === modalTargetId);

      // 2. Set both cards' parentId to the new group folder ID in parallel
      const sourceUpdate = api.put(`/notes/${modalSourceId}`, {
        ...sourceNote,
        parentId: newGroup._id,
      });
      const targetUpdate = api.put(`/notes/${modalTargetId}`, {
        ...targetNote,
        parentId: newGroup._id,
      });

      const [sourceRes, targetRes] = await Promise.all([sourceUpdate, targetUpdate]);

      // 3. Update local state
      setNotes((prev) => {
        const updated = prev.map((n) => {
          if (n._id === modalSourceId) return sourceRes.data;
          if (n._id === modalTargetId) return targetRes.data;
          return n;
        });
        return [newGroup, ...updated];
      });

      toast.success(`Group "${groupTitle}" created successfully!`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group stack");
    } finally {
      setShowNamingModal(false);
      setModalSourceId(null);
      setModalTargetId(null);
      setGroupTitle("");
    }
  };

  // Reorder a note relative to another note ('before' or 'after') inside the given parent.
  const handleReorderNotes = async (sourceId, targetId, positionType, parentId = null) => {
    const normalizedParentId = parentId ?? null;

    // 1. Get the current list for the requested parent.
    const scopedNotes = notes.filter((n) => (n.parentId ?? null) === normalizedParentId);

    // 2. Remove source item from the scoped list and find insertion index.
    const sourceItem = notes.find((n) => n._id === sourceId);
    if (!sourceItem) return;

    const filtered = scopedNotes.filter((n) => n._id !== sourceId);
    const targetIdxInFiltered = filtered.findIndex((n) => n._id === targetId);
    if (targetIdxInFiltered === -1) return;

    let insertIdx = targetIdxInFiltered;
    if (positionType === "after") {
      insertIdx = targetIdxInFiltered + 1;
    }

    // Insert source item into filtered array.
    filtered.splice(insertIdx, 0, sourceItem);

    // 3. Calculate new position
    const prevItem = filtered[insertIdx - 1];
    const nextItem = filtered[insertIdx + 1];

    let newPosition = 0;
    if (prevItem && nextItem) {
      newPosition = (prevItem.position + nextItem.position) / 2;
    } else if (prevItem) {
      newPosition = prevItem.position + 1000;
    } else if (nextItem) {
      newPosition = nextItem.position - 1000;
    } else {
      newPosition = 0;
    }

    // 4. Collision check: if they have equal positions or difference is extremely small, re-index everything.
    const hasCollision =
      (prevItem && nextItem && Math.abs(prevItem.position - nextItem.position) < 0.1) ||
      (filtered.length > 1 && filtered.every((n) => n.position === 0));

    if (hasCollision) {
      // Re-index all top-level notes sequentially
      const updatedNotes = filtered.map((n, idx) => ({
        ...n,
        position: idx * 1000,
        parentId: normalizedParentId,
      }));

      // Update state locally
      setNotes((prev) => {
        return prev.map((n) => {
          const match = updatedNotes.find((un) => un._id === n._id);
          return match ? match : n;
        });
      });

      // Update backend in parallel
      try {
        await Promise.all(
          updatedNotes.map((n) =>
            api.put(`/notes/${n._id}`, {
              title: n.title,
              content: n.content,
              isGroup: n.isGroup,
              parentId: n.parentId,
              position: n.position,
            })
          )
        );
        toast.success("Board layout reordered");
      } catch (error) {
        console.error("Error saving layout reorder:", error);
        toast.error("Failed to save reordered layout");
        fetchNotes(); // Revert
      }
    } else {
      // Update just the source note
      const oldParentId = sourceItem.parentId;
      
      setNotes((prev) =>
        prev.map((n) =>
          n._id === sourceId
            ? { ...n, position: newPosition, parentId: normalizedParentId }
            : n
        )
      );

      try {
        await api.put(`/notes/${sourceId}`, {
          title: sourceItem.title,
          content: sourceItem.content,
          isGroup: sourceItem.isGroup,
          parentId: normalizedParentId,
          position: newPosition,
        });

        if (oldParentId) {
          toast.success("Note restored to main board");
        } else {
          toast.success("Note reordered");
        }
      } catch (error) {
        console.error("Error saving note position:", error);
        toast.error("Failed to save reordered note");
        fetchNotes(); // Revert
      }
    }
  };

  // Dragging a note out of the expanded group panel onto the main board background
  const handleBackdropDrop = (e) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("text/plain");
    if (!noteId) return;

    const note = notes.find((n) => n._id === noteId);
    // Only restore if it currently belongs to a group
    if (note && note.parentId) {
      handleMoveNote(noteId, null);
    }
  };

  // Filter top-level notes for display in the main grid
  const topLevelNotes = notes
    .filter((n) => !n.parentId)
    .sort((a, b) => a.position - b.position || new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div
      className="min-h-screen pb-20"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleBackdropDrop}
    >
      <Navbar />

      {isRateLimited && <RateLimitedUI />}

      <div className="max-w-7xl mx-auto p-4 mt-6">
        {loading && <div className="text-center text-primary py-10">Loading notes...</div>}

        {notes.length === 0 && !isRateLimited && <NotesNotFound />}

        {notes.length > 0 && !isRateLimited && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {topLevelNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                setNotes={setNotes}
                allNotes={notes}
                activeDragId={activeDragId}
                setActiveDragId={setActiveDragId}
                onMoveNote={handleMoveNote}
                onCombineNotes={handleCombineNotes}
                onReorderNotes={handleReorderNotes}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modern Premium Group Naming Modal */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-3 text-base-content flex items-center gap-2">
              📁 Create Group Stack
            </h3>
            <p className="text-sm text-base-content/70 mb-5">
              Enter a title to stack these matching cards into a combined container:
            </p>
            <input
              type="text"
              className="input input-bordered w-full mb-6 focus:ring-2 focus:ring-[#7480ff] text-base-content font-medium border-base-300"
              placeholder="e.g. Work, Ideas, Math Notes..."
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && groupTitle.trim()) {
                  handleCreateGroup();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost text-base-content/80"
                onClick={() => {
                  setShowNamingModal(false);
                  setGroupTitle("");
                  setModalSourceId(null);
                  setModalTargetId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary bg-[#7480ff] hover:bg-[#5b68ff] text-white border-none px-6"
                onClick={handleCreateGroup}
                disabled={!groupTitle.trim()}
              >
                Create Stack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;