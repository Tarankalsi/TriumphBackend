import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import statusCode from "../statusCode";

declare global {
    namespace Express {
        interface Request {
            admin_id?: string;
            user_id?: string;
        }
    }
}

interface JwtPayload {
    admin_id?: string;
    user_id?: string;
}

const JWT_SECRET_KEY_USER = process.env.JWT_SECRET_KEY_USER;
const JWT_SECRET_KEY_ADMIN = process.env.JWT_SECRET_KEY_ADMIN;

if (!JWT_SECRET_KEY_USER || !JWT_SECRET_KEY_ADMIN) {
    throw new Error(' jwt secret keys must be defined in the environment variables');
}

const authMiddleware = (userType: string) => (req: Request, res: Response, next: NextFunction) => {

   

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(statusCode.FORBIDDEN).json({
            success: false,
            message: "Error: Missing or invalid Authorization Token"
        })
    }

    const authToken = authHeader.split(' ')[1]

    try {

        let secretKey :string;

        if (userType === "admin") {
            secretKey = JWT_SECRET_KEY_ADMIN
        } else if (userType === "user") {
            secretKey = JWT_SECRET_KEY_USER
        } else {
            return res.status(statusCode.FORBIDDEN).json({
                success: false,
                message: "Error : Invalid User Type"
            })
        }
        const decoded = jwt.verify(authToken, secretKey) as JwtPayload
       

        if (userType === 'admin') {
       
            req.admin_id = decoded.admin_id;
        } else {
            req.user_id = decoded.user_id
        }

        next();
    } catch (error) {
        console.error(error)
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Error in Authorization Middleware"
        })
    }
}

export const userAuthMiddleware = authMiddleware('user');
export const adminAuthMiddleware = authMiddleware('admin');


