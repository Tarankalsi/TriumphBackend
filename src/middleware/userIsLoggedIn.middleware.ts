import { NextFunction, Request, Response } from "express";
import statusCode from "../statusCode";
import { PrismaClient } from "@prisma/client";
import { userAuthMiddleware } from "./auth.middleware";

const prisma = new PrismaClient();

export const userIsLoggedIn = async (req:Request,res:Response,next:NextFunction)=>{
    const authHeader = req.headers.authorization

    if (authHeader) {
        return userAuthMiddleware(req, res, next);
    }else{
        next();
    }
}