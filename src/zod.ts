
import zod from "zod";

export const productSchema = zod.object({
    name : zod.string(),
    description : zod.string(),
    price : zod.number(),
    availability : zod.number(),
    SKU : zod.string().toUpperCase(),
    color : zod.string()
})

export const pdUpdateSchema = zod.object({
    name : zod.string().optional(),
    description : zod.string().optional(),
    price : zod.number().optional(),
    availability : zod.number().optional(),
    SKU : zod.string().toUpperCase().optional(),
    color : zod.string().optional()
})


export const categorySchema = zod.object({
    name : zod.string(),
    description : zod.string().optional(), 
})

export const admin_signupSchema = zod.object({
    full_name: zod.string(),
    email: zod.string().email(),
    password: zod.string().min(6).optional(),
    role: zod.string().toUpperCase().optional()
});

export const admin_signinSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(6)
});


export const reviewSchema = zod.object({
    rating: zod.number().int().min(0, { message: "Rating must be at least 0" }).max(5, { message: "Rating cannot exceed 5" }),
    review_text: zod.string(),
});

export const user_signupSchema = zod.object({
    full_name : zod.string(),
    email : zod.string().email()
})

export const otpVerificationSchema = zod.object({
    code: zod.string().length(6, 'Invalid OTP'),
})

export const user_signinSchema = zod.object({
    email: zod.string().email()
})

export const a_change_pass_1 = zod.object({
    email: zod.string().email()
})

export const a_change_pass_2 = zod.object({
    oldPassword: zod.string().min(6),
    newPassword: zod.string().min(6)
})

export const signedUrlImageSchema = zod.object({
    imageName: zod.string(),
    contentType: zod.string()
})