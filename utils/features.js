import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import {v4 as uuid} from "uuid"

import { getBase64, getSockets } from "../lib/helper.js"
import { cloudinary } from "../app.js"
const cookieOptions={
    maxAge:15*24*60*60*1000,
    sameSite:"none",
    httpOnly:true,
    secure:true,
}

const connectDB=(uri)=>{
    mongoose.connect(uri,{dbName:"pingme"})
    .then((data)=>console.log(`connected to DB:${data.connection.host}`))
    .catch((err)=>{
       throw err;
    })
}

const sendToken=(res,user,code,message)=>{
const token=jwt.sign({_id:user._id},process.env.JWT_SECRET);

return res.status(code).cookie("pingme-token",token,cookieOptions).json({
    success:true,user,
    message,
});

}

const emitEvent=(req,event,users,data)=>{
const io=req.app.get("io")
const usersSocket=getSockets(users)
io.to(usersSocket).emit(event,data);
 
}

const deleteFilesFromCloudinary=async(public_ids)=>{

}

const uploadFilesToCloudinary =async(files=[])=>{
const uploadPromises=files.map((file)=>{
    return new Promise((resolve,reject)=>{
        cloudinary.uploader.upload(
            getBase64(file),
            {
                resource_type:"auto",
                public_id:uuid(),
            },
            (error,result)=>{
                if(error)return  reject(error);
                resolve(result)
            }
        )
    })
});
try{
   const results=await Promise.all(uploadPromises);
    const formattedResults=results.map((result)=>({
        public_id:result.public_id,
        url:result.secure_url,
    }))
    return formattedResults 
}catch(error){
throw new Error("Error uploading files to cloudinary",error)
}

}

export {connectDB,
    sendToken,
    cookieOptions,
    uploadFilesToCloudinary,
    emitEvent,
deleteFilesFromCloudinary}