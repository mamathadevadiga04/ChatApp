import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler=(req,res,next)=>{

const errors= validationResult(req)
const errorMessage=errors.array().map((error)=>error.msg).join(",")
console.log(errorMessage);
if(errors.isEmpty())return next();
else next(new ErrorHandler(errorMessage,400))
}

const registerValidator=()=>[
body("name","please enter name").notEmpty(),
body("username","please enter username").notEmpty(),
body("bio","please enter bio").notEmpty(),
body("password","please enter password").notEmpty(),

];
const loginValidator=()=>[
body("username","please enter username").notEmpty(),
body("password","please enter password").notEmpty(),
];
const newGroupValidator=()=>[
body("name","please enter name").notEmpty(),
body("members").notEmpty()
.withMessage("please enter members")
.isArray({min:2,max:100})
.withMessage("members must be 2-100")
];
const addMemberValidator=()=>[
body("chatId","please enter chatId").notEmpty(),
body("members").notEmpty()
.withMessage("please enter members")
.isArray({min:1,max:97})
.withMessage("members must be 1-97")
];
const removeMemberValidator=()=>[
body("chatId","please enter chatId").notEmpty(),
body("userId","please enter userId").notEmpty(),
];
const sendAttchmentsValidator=()=>[
body("chatId","please enter chatId").notEmpty(),
];
const chatIdValidator=()=>[
param("id","please enter id").notEmpty(),

];
const renameValidator=()=>[
param("id","please enter id").notEmpty(),
body("name","please enter the new name").notEmpty()
];
const sendrequestValidator=()=>[
body("userId","please enter the  userId").notEmpty()
];
const acceptrequestValidator=()=>[
body("requestId","please enter the  requestId").notEmpty(),
body("accept")
.notEmpty().withMessage("please add  accept")
.isBoolean()
.withMessage("accept must be boolean"),
];
const adminLoginValidator=()=>[
body("secretKey","please enter secret key ID").notEmpty(),
];

export {
    acceptrequestValidator, addMemberValidator, adminLoginValidator, chatIdValidator, loginValidator, newGroupValidator, registerValidator, removeMemberValidator, renameValidator, sendAttchmentsValidator, sendrequestValidator, validateHandler
};
