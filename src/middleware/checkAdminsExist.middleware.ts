import { NextFunction, Request, Response } from "express";
import { adminAuthMiddleware } from "./auth.middleware";
import statusCode from "../statusCode";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const checkAdminsExist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const areAdminsPresent = await prisma.admin.count();
  
      if (areAdminsPresent) {
        // If admins are present, apply auth middleware
        return adminAuthMiddleware(req, res, next);
      } else {
        // If no admins are present, proceed without auth middleware
        return next();
      }
    } catch (error) {
      return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal Server Error',
        message2: "Hi admin exist checking error"
      });
    }
  };

