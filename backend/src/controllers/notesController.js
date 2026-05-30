import Note from "../models/Note.js";


export async function getAllNotes(_,res) {  
   try {
    const notes = await Note.find().sort({position: 1, createdAt: -1});// position ascending, then newest first
    res.status(200).json(notes); 
   } catch (error) {
    console.error("Error inn getAll Notes controller:", error);
    res.status(500).json({ message: "Internal server error" });
   }
}

export async function getNoteById(req,res) {
    try {
        const note = await Note.findById(req.params.id)
        if(!note){
            return res.status(404).json({message:"Note not found"});
        }
        res.status(200).json(note);
    } catch (error) {
        console.error("Error in getNoteById controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function createNote(req,res) {
 try {
    const {title,content,isGroup,parentId} = req.body;
    const minPositionNote = await Note.findOne({ parentId: parentId || null }).sort({ position: 1 });
    let position = 0;
    if (minPositionNote) {
      position = minPositionNote.position - 1000;
    }
    const note = new Note({title,content,isGroup,parentId,position})
    const savedNote =  await note.save()
    res.status(201).json(savedNote);
 } catch (error) {
    console.error("Error in createNote controller:", error);
    res.status(500).json({ message: "Internal server error" });
 }
}

export async function updateNote(req,res) {
    try{
        const{title,content,isGroup,parentId,position} = req.body;
        const updatedNote = await Note.findByIdAndUpdate(req.params.id,{title,content,isGroup,parentId,position},{new:true})
        if(!updatedNote){
            return res.status(404).json({message:"Note not found"});
        }
        res.status(200).json(updatedNote);
    } catch (error) {
        console.error("Error in updateNote controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteNote(req,res) {
 try {
    const deletedNote = await Note.findByIdAndDelete(req.params.id)
    if(!deletedNote){
        return res.status(404).json({message:"Note not found"});
    }
    if(deletedNote.isGroup){
        await Note.updateMany({parentId: deletedNote._id}, {parentId: null});
    }
    res.status(200).json({message:"Note deleted successfully"});
 } catch (error) {
    console.error("Error in deleteNote controller:", error);
    res.status(500).json({ message: "Internal server error" });
 }
}