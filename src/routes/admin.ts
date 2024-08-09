import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from "bcryptjs"
import { PrismaClient } from '@prisma/client';
import { a_change_pass_1, a_change_pass_2, admin_signinSchema, admin_signupSchema, otpVerificationSchema } from '../zod';
import { adminAuthMiddleware } from '../middleware/auth.middleware';
import statusCode from '../statusCode';
import handleErrorResponse, { CustomError } from '../utils/handleErrorResponse';
import jwt from 'jsonwebtoken';
import { checkAdminsExist } from '../middleware/checkAdminsExist.middleware';
import { sendEmail } from '../utils/sendEmail';
import { generateAlphanumericOTP, generateOrUpdateOTP, typeProp } from '../utils/otpHandler';


const adminRouter = Router();
const prisma = new PrismaClient();


const JWT_SECRET_KEY_ADMIN = process.env.JWT_SECRET_KEY_ADMIN as string;
if (!JWT_SECRET_KEY_ADMIN) {
    throw new Error('JWT_SECRET_KEY_ADMIN must be defined in the environment variables');
}


adminRouter.post('/signup', checkAdminsExist, async (req, res) => {
    const body = req.body

    const { success, error } = admin_signupSchema.safeParse(body);

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error?.issues // Provide validation error details
        });
    }

    try {
        
        const areAdminsPresent = await prisma.admin.count();

        if (!areAdminsPresent && process.env.ALLOW_INITIAL_ADMIN_CREATION === 'true') {
            const salt = await bcrypt.genSalt(10);
            const secPass = await bcrypt.hash(body.password, salt);

            const initialAdmin = await prisma.admin.create({
                data: {
                    full_name: body.full_name,
                    email: body.email,
                    password: secPass,
                    role: "admin"
                }
            })
            
            return res.status(statusCode.CREATED).json({
                success: true,
                message: "Admin Created Successfully",
                data: initialAdmin
            })
        }

        if (areAdminsPresent) {
            console.log(req.admin_id)
            if (!req.admin_id) {
                return res.status(statusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You're not allowed to create new admin , admin_id is undefined"
                });
            }

            const admin = await prisma.admin.findUnique({
                where: {
                    admin_id: req.admin_id
                }
            })

            if (admin && admin.role === "admin") {

                const generatedPassword = generateAlphanumericOTP(8)
                const salt = await bcrypt.genSalt(10);
                const secPass = await bcrypt.hash(generatedPassword, salt);

                const newAdmin = await prisma.admin.create({
                    data: {
                        full_name: body.full_name,
                        email: body.email,
                        password: secPass,
                        role: body.role || "moderator"
                    }
                })
                
                const html = `
                <h1>Triumph Lights Admin Credentials</h1>
                <p>Dear ${newAdmin.full_name}</p>
                <p>You'r the new ${newAdmin.role} of Triumph Lights. Here You Login Credentials</p>
                <li><strong>Email: </strong> ${newAdmin.email}</li>
                <li><strong>Password: </strong> ${generatedPassword}</li>
                </hr>
                <p>Feel free to customize as needed</p>
                `
                const emailData = {
                    to:newAdmin.email,
                    subject : "Welcome! Your Admin Account Details",
                    message: "Your admin account Credentials",
                    html : html
                }

                const response = await sendEmail(emailData)

                return res.status(statusCode.CREATED).json({
                    success: true,
                    message: `New Admin Created`
                })

            } else {
                return res.status(statusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You're not allowed to create new admin"
                })
            }

        }

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

adminRouter.get('/adminId', async (req,res)=>{

    const body = req.body

    const {success,error} = a_change_pass_1.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error?.issues // Provide validation error details
        });
    }

    try {
        const admin = await prisma.admin.findUnique({
            where : {
                email : body.email
            },
            select:{
                admin_id: true
            }
        })
        if (!admin) {
            return res.status(statusCode.NOT_FOUND).json({
                success : false,
                message : "Admin doesn't exist"
            })
        }

        return res.status(statusCode.OK).json({
            success : true,
            admin_id : admin.admin_id
        })
    } catch (error) {
        handleErrorResponse(res,error as CustomError,statusCode.INTERNAL_SERVER_ERROR)
    }
})

adminRouter.post('/change-password/:admin_id', async (req,res)=>{
    const body = req.body

    const {success,error} = a_change_pass_2.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error?.issues // Provide validation error details
        });
    }

    try {
        const admin = await prisma.admin.findUnique({
            where : {
                admin_id : req.params.admin_id
            }
        })

        if (!admin) {
            return res.status(statusCode.NOT_FOUND).json({
                success : false,
                message: "Admin Not Found"
            })
        }

        const response = await bcrypt.compare(body.oldPassword,admin.password)

        if (!response) {
            return res.status(statusCode.UNAUTHORIZED).json({
                success : false,
                message : "Incorrect password"
            })
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(body.newPassword, salt);

        await prisma.admin.update({
            where :{
                admin_id : admin.admin_id
            },
            data:{
                password : secPass
            }
        })

        return res.status(statusCode.OK).json({
            success : true,
            message : "Password changed successfully"
        })

    } catch (error) {
        handleErrorResponse(res,error as CustomError,statusCode.INTERNAL_SERVER_ERROR)
    }
    

})

adminRouter.post('/signin', async (req, res) => {
    const body = req.body

    const { success } = admin_signinSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "zod validation error"
        })
    }

    try {
        const admin = await prisma.admin.findUnique({
            where: {
                email: body.email
            }
        })

        if (!admin) {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: "Incorrect Credentials"
            })
        }

        const password_compare = await bcrypt.compare(body.password, admin.password)

        if (!password_compare) {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: "Incorrect Credentials"
            })
        }

        const code = generateAlphanumericOTP(6)
        await generateOrUpdateOTP(typeProp.ADMIN,admin.admin_id, code)

        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${admin.full_name}</p>
                        <p>Please enter the following verification code to access BackPanel of TriumphLights</p>
                        <h4>${code}</h4>`;

        const emailData = {
            to: admin.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${admin.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        }

        const respone = await sendEmail(emailData)
        console.log(respone)
    
        return res.status(statusCode.OK).json({
            success: true,
            message : `OTP sent to ${admin.email}`,
            admin_id : admin.admin_id
        });

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

adminRouter.post('/otp-verification/:admin_id', async (req, res) => {
    const body = req.body
    const admin_id = req.params.admin_id
    const { success, error } = otpVerificationSchema.safeParse(body)
    const now = new Date();
   
    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error.message
        })
    }

    try {
        const adminExist = await prisma.admin.findUnique({
            where: {
                admin_id: admin_id
            },
            select: {
                admin_id: true,
                otp: true
            }
        })

        if (!adminExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "User Not Found"
            })
        }


        if (!adminExist.otp) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Otp is null in the database"
            })
        }

        if (adminExist.otp.expires_at < now) {
            return res.status(statusCode.EXPIRED).json({
                success: false,
                message: "OTP is Expired"
            })
        }

        const response = await bcrypt.compare(body.code, adminExist.otp.code)

        let token;
        if (response) {
            token = jwt.sign({ user_id: adminExist.admin_id}, JWT_SECRET_KEY_ADMIN)
        } else {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: "Invalid OTP"
            })
        }


        res.cookie('token', token, {
            httpOnly: true, // helps prevent XSS attacks
            secure: process.env.NODE_ENV === 'production', // send cookie over HTTPS only in production
            sameSite: 'strict', // helps prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000 // cookie expiration set to 1 day
        });

        return res.status(statusCode.OK).json({
            success: true,
            message: "Authentification Completed",
            token: token
        })

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

adminRouter.post('/sendEmail', async (req,res)=>{
    const details = {
        to : "tarankhalsa3412@gmail.com",
        subject : "Testing Purpose",
        message : "Hi My first Email",
        html:`<p>Hello Taranjit Singh</p>`
    }
    try {
        const email = sendEmail(details)
        console.log(email)

        return res.json({
            success : true,
            message : "Email Sent"
        })
    } catch (error) {
        handleErrorResponse(res,error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})





export default adminRouter;
