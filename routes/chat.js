import express from "express";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttchments } from "../controllers/chat.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttchmentsValidator, validateHandler } from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attchmentsMulter } from "../middlewares/multer.js";
const app=express.Router();


//after here user must be logged in to access the routes
app.use(isAuthenticated);
app.post("/new",newGroupValidator(),validateHandler,newGroupChat);
app.get("/my",getMyChats);
app.get("/groups",getMyGroups);
app.put("/addmembers",addMemberValidator(),validateHandler,addMembers);
app.put("/removemember",removeMemberValidator(),validateHandler,removeMember);
app.delete("/leave/:id",chatIdValidator(),validateHandler,leaveGroup);
app.post("/message",attchmentsMulter,sendAttchmentsValidator(),validateHandler,sendAttchments)
app.get("/message/:id",chatIdValidator(),validateHandler,getMessages)

app.route("/:id")
.get( chatIdValidator(),validateHandler,getChatDetails)
.put(renameValidator(),validateHandler,renameGroup)
.delete(chatIdValidator(),validateHandler,deleteChat)
export default app;