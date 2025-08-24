import { ErrorHandler } from "../utils/utility.js";
import {TryCatch} from "./error.js"
import jwt from "jsonwebtoken"
import {adminSecretKey} from "../app.js"
import { log } from "console";
import { User } from "../models/user.js";
const isAuthenticated=(req,res,next)=>{
    const token=req.cookies["pingme-token"];
    
   if(!token)
    return next(new ErrorHandler("Please login to access this route",401))
    const decodedData=jwt.verify(token,process.env.JWT_SECRET)
req.user=decodedData._id;
   next();
}
const adminOnly=TryCatch((req,res,next)=>{
    const token=req.cookies["pingme-admin-token"];


   if(!token)
    return next(new ErrorHandler("only admin can access this route",401))
    const secretKey=jwt.verify(token,process.env.JWT_SECRET)
const isMatched=secretKey===adminSecretKey
   if(!isMatched)return next(new ErrorHandler("Invalid admin key",401))
next();
})

const socketAuthenticator=async(err,socket,next)=>{
try {
    if(err)return next(err);
    const authToken=socket.request.cookies["pingme-token"]
if (!authToken)return next(new ErrorHandler("please login to access the route",401))
const decodedData=jwt.verify(authToken,process.env.JWT_SECRET)
const user=await User.findById(decodedData._id)
if(!user) return next(new ErrorHandler("please login to access",401))
socket.user=user;
return next();
} catch (error) {
    console.log(error);
    
    return next(new ErrorHandler("please login to access the route",401))
}
}


export {isAuthenticated,adminOnly,socketAuthenticator}