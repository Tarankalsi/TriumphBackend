import bcrypt from 'bcryptjs';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export enum typeProp {
    USER = "user",
    ADMIN = "admin"
  }

export const generateOrUpdateOTP = async (type : typeProp ,id: string, newCode: string) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000);   // # minutes expire time

    try {
      
        const salt = await bcrypt.genSalt(10);
        const secOtp = await bcrypt.hash(newCode, salt);
        if (type === "user") {
            await prisma.u_OTP.upsert({
                where: { user_id: id },
                update: {
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                },
                create: {
                    user_id: id,
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                }
            });
        }else if(type === "admin"){
            await prisma.a_OTP.upsert({
                where: { admin_id: id },
                update: {
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                },
                create: {
                    admin_id: id,
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                }
            });
        }

        return true
    } catch (error) {
        console.error("Error while generating or updating OTP:", error);
        throw new Error("Error while generating or updating OTP");
    }

}

export const generateAlphanumericOTP = (length = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        otp += characters.charAt(randomIndex);
    }
    return otp;
};