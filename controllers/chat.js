import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import {Chat}from "../models/chat.js"
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ALERT, REFETCH_CHATS,NEW_MESSAGE_ALERT, NEW_MESSAGE } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import {User} from "../models/user.js"
import {Message} from"../models/message.js"
const newGroupChat=TryCatch(async(req,res,next)=>{
const {name,members}=req.body;
const allMembers=[...members,req.user];
await Chat.create({
    name,
    groupChat:true,
    creator:req.user,
    members:allMembers,
})
emitEvent(req,ALERT,allMembers,`Welcome to ${name} group`)
emitEvent(req,REFETCH_CHATS,members)
return res.status(201).json({
    success:true,
    message:"Group Created",
});
});


const getMyChats=TryCatch(async(req,res,next)=>{

    const chats=await Chat.find({members:req.user}).populate(
        "members",
        "name avatar"
    );
const transformedChats=chats.map(({_id,name,members,groupChat})=>{
const otherMember=getOtherMember(members,req.user);

    return {
        _id,
        groupChat,avatar:groupChat?members.slice(0,3).map
        (({avatar})=>avatar.url)
        :[otherMember.avatar.url],
        name:groupChat?name:otherMember.name,
        members:members.reduce((prev,curr)=>{
            if(curr._id.toString()!==req.user.toString()){
prev.push(curr._id);
            }
            return prev;
        },[])
       
    }
})
return res.status(201).json({
    success:true,
    chats:transformedChats,

});
});

const getMyGroups=TryCatch(async(req,res,next)=>{
    const chats=await Chat.find({
        members:req.user,
        groupChat:true,
        creator:req.user,
    }).populate("members","name avatar")

    const groups=chats.map(({members,_id,groupChat,name})=>({
_id,groupChat,name,
avatar:members.slice(0,3).map(({avatar})=>avatar.url),
    }))
    return res.status(200).json({
        success:true,
        groups,
    })
});

const addMembers=TryCatch(async(req,res,next)=>{
const {chatId,members}=req.body;

const chat=await Chat.findById(chatId);
if(!chat) return next(new ErrorHandler("chat not found",404));

if(!chat.groupChat) return next(new ErrorHandler("this is not a group chat",404));

if(chat.creator.toString()!==req.user.toString()) return next(new ErrorHandler("you are not allowed to  add a members",403))

const allNewMemberPromise=members.map(i=>User.findById(i,"name"));
const allNewmembers=await Promise.all(allNewMemberPromise);
  
const uniqueMembers=allNewmembers.filter((i)=>!chat.members.includes(i._id.toString()))
.map((i)=>i._id);
chat.members.push(...uniqueMembers);
if(chat.members.length>100)
    return next(new ErrorHandler("group members limit reached",400))

await chat.save();
const allUserName=allNewmembers.map((i)=>i.name).join(",");
emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} has been added in the group`
);

emitEvent(req,REFETCH_CHATS,chat.members);

return res.status(200).json({
        success:true,
       message:"Members added successfully"
    })
});

const removeMember=TryCatch(async(req,res,next)=>{

const {userId,chatId}=req.body;
const [chat,userThatWillBeRemoved]=await Promise.all([
    Chat.findById(chatId),
    User.findById(userId,"name")
])

if(!chat) return next(new ErrorHandler("chat not found",404));

if(!chat.groupChat) return next(new ErrorHandler("this is not a group chat",404));

if(chat.creator.toString()!==req.user.toString()) return next(new ErrorHandler("you are not allowed to  add a members",403))

if(chat.members.length<=3)
    return next(new ErrorHandler("Group must have at least 3 members",400));

const allChatMembers=chat.members.map((i)=>i.toString())
chat.members=chat.members.filter(
    (member)=>member.toString()!==userId.toString()
);
await chat.save();
emitEvent(req,ALERT,
    chat.members,{
        message:`${userThatWillBeRemoved.name} has been rempved from the group`
    }

)
emitEvent(req,REFETCH_CHATS,allChatMembers);

return res.status(200).json({
        success:true,
       message:"Members removed successfully"
    })
});

const leaveGroup=TryCatch(async(req,res,next)=>{

const chatId=req.params.id;
 const chat= await Chat.findById(chatId);

if(!chat) return next(new ErrorHandler("chat not found",404));

if(!chat.groupChat) return next(new ErrorHandler("this is not a group chat",404));

const remainingMembers=chat.members.filter(
    (member)=>member.toString()!==req.user.toString()
);
if(remainingMembers.length<3)
    return next(new ErrorHandler("Group must have at least 3 members",400));

if(chat.creator.toString()==req.user.toString())
{
const randomElement=Math.floor(Math.random()*remainingMembers.length);
const newCreator=remainingMembers[randomElement];
chat.creator=newCreator;
}

chat.members=remainingMembers;
const [user]=await Promise.all([
     User.findById(req.user,"name"),
 chat.save()
])

emitEvent(req,ALERT,
    chat.members,{
chatId,
message:`${user.name}has left the group`
    }

)


return res.status(200).json({
        success:true,
       message:"leave group successfully"
    })
});

const sendAttchments=TryCatch(async(req,res,next)=>{

    const {chatId}=req.body;
     const files=req.files||[];
     
     if(files.length< 1)return next(new ErrorHandler("please upload attachment",400))
    if(files.length> 5)return next(new ErrorHandler("files cant be more than 5",400))
   
   
        const [chat,me]=await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user,"name")
   ]);

   if(!chat)return next(new ErrorHandler("chat not found",404));

     
      if(files.length< 1)return next(new ErrorHandler("please provide attchments",400));
 const attachments = await uploadFilesToCloudinary(files); // this returns [{url, public_id, type}, ...]


 const messageForDB = { content:"", attachments, sender:me._id, chat:chatId }
const messageForRealTime = { ...messageForDB, sender:{ _id:me._id, name:me.name } }
const message = await Message.create(messageForDB);

      emitEvent(req,NEW_MESSAGE,chat.members,{
    message:messageForRealTime,
    chatId,
})
   emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{
   
    chatId,
})
      return res.status(200).json({
        success:true,
        message,
    })
});

const getChatDetails=TryCatch(async(req,res,next)=>{
if(req.query.populate==="true")
{
const chat=await Chat.findById(req.params.id).populate(
    "members","name avatar"
).lean()
if(!chat)return next(new ErrorHandler("chat not found",404));

chat.members=chat.members.map(({_id,name,avatar})=>({
    _id,
    name,avatar:avatar.url,
}))
return res.status(200).json({
    success:true,
    chat,
})
}

else{
const chat= await Chat.findById(req.params.id);
if(!chat)return next(new ErrorHandler("chat not found",404))
return res.status(200).json({
    success:true,
    chat,
})
}
});

const renameGroup=TryCatch(async(req,res,next)=>{
    const chatId=req.params.id;
    const {name}=req.body;
const chat= await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("chat not found",404));

if(!chat.groupChat) return next(new ErrorHandler("this is not a group chat",404));

if(chat.creator.toString()!==req.user.toString()) return next(new ErrorHandler("you are not allowed to  rename the group",403))

chat.name=name;
await chat.save();
emitEvent(req,REFETCH_CHATS,chat.members);
return res.status(200).json({
    success:true,
    mesage:"group renamed successfully"
})

});

const deleteChat=TryCatch(async(req,res,next)=>{
    const chatId=req.params.id;
  
const chat= await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("chat not found",404));

    const members=chat.members;
    if(chat.groupChat&&chat.creator.toString()!==req.user.toString())
        return next(
    new ErrorHandler("you are not allowed to delete this group",403));
if(!chat.groupChat&&!chat.members.includes(req.user.toString()))
{
    return next(new ErrorHandler("YOU ARE NOT ALLOWED TO DELETE THE CHAT",403));
}

//HERE WE AHVE TO DELETE all messages as well as attchemnts or files from cloudinary

const messageWithAttachments=await Message.find({chat:chatId,
    attachments:{$exists:true,$ne:[]},
});
const public_ids=[];
messageWithAttachments.forEach(({attachments})=>{
attachments.forEach(({public_id})=>public_ids.push(public_id))
});
await Promise.all([
    //deleet files from cloudinary
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({chat:chatId})
])
emitEvent(req,REFETCH_CHATS,members);
return res.status(200).json({
    success:true,
    mesage:"chat deleted successfully"
})
});

const getMessages=TryCatch(async(req,res,next)=>{

    const chatId=req.params.id;
    const {page=1}=req.query;
    const resultPage=20;
    const skip=(page-1)*resultPage;
    const chat=await Chat.findById(chatId);
    if(!chat)return next(new ErrorHandler("chat not found",404));
    if(!chat.members.includes(req.user.toString()))
        return next(
    new ErrorHandler("you are not allowed to access this chat",403)
        );

const[messages,totalMessagesCount]=await Promise.all([
    Message.find({chat:chatId})
    .sort({createdAt:-1})
    .skip(skip)
    .limit(resultPage)
    .populate("sender","name")
    .lean(),
    Message.countDocuments({chat:chatId}),
])

const totalPages=Math.ceil(totalMessagesCount/resultPage)
 return res.status(200).json({
    success:true,
    messages:messages.reverse(),
    totalPages,
 })
});

export {newGroupChat,
    getChatDetails,
    getMessages,
    deleteChat,
    getMyChats,
    leaveGroup,
    removeMember,
    getMyGroups,
    addMembers,
    renameGroup,
    sendAttchments,
};