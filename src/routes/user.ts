import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, Request, Response } from "express";
import { addressSchema, categorySchema, otpVerificationSchema, pdUpdateSchema, productSchema, reviewSchema, signedUrlImageSchema, user_signinSchema, user_signupSchema } from "../zod";
import { PrismaClient } from "@prisma/client";
import statusCode from "../statusCode";
import handleErrorResponse, { CustomError } from "../utils/handleErrorResponse";
import { upload } from '../middleware/multer.middleware';
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary';
import { userAuthMiddleware } from '../middleware/auth.middleware';
import { generateAlphanumericOTP, generateOrUpdateOTP, typeProp } from '../utils/otpHandler';
import { sendEmail } from '../utils/sendEmail';
import { userIsLoggedIn } from '../middleware/userIsLoggedIn.middleware';
import { deleteObjectS3, uploadImageS3 } from '../utils/s3';

const userRouter = Router();
const prisma = new PrismaClient();

const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY as string
const JWT_SECRET_KEY_USER = process.env.JWT_SECRET_KEY_USER as string

const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp'];
const contentTypeToExtension: { [key: string]: string } = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
};

interface cartTokenPayload {
    cart_id: string;
}

userRouter.post('/signup', async (req, res) => {
    const body = req.body

    const { success, error } = user_signupSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error?.issues
        })
    }

    try {

        const user = await prisma.user.findUnique({
            where: {
                email: body.email
            }
        })
        if (user) {
            return res.status(statusCode.CONFLICT).json({
                success: false,
                message: "User already exists"
            })
        }

        const newUser = await prisma.user.create({
            data: {
                full_name: body.full_name,
                email: body.email
            }
        })
        const code = generateAlphanumericOTP(6)
        await generateOrUpdateOTP(typeProp.USER, newUser.user_id, code)

        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${newUser.full_name}</p>
                        <p>Please enter the following verification code to access your Twilio Account</p>
                        <h4>${code}</h4>`;

        const emailData = {
            to: newUser.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${newUser.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        }

        await sendEmail(emailData)

        return res.status(statusCode.OK).json({
            success: true,
            message: `User Created and OTP sent to ${newUser.email}`,
            user: newUser
        })
    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }

})

userRouter.post('/signin', async (req, res) => {
    const body = req.body

    const { success, error } = user_signinSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error?.issues
        })
    }

    try {
        const userExist = await prisma.user.findUnique({
            where: {
                email: body.email
            }
        })

        if (!userExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "User doesn't exist"
            })
        }

        const code = generateAlphanumericOTP(6)
        await generateOrUpdateOTP(typeProp.USER, userExist.user_id, code)

        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${userExist.full_name}</p>
                        <p>Please enter the following verification code to access your Twilio Account</p>
                        <h4>${code}</h4>`;

        const emailData = {
            to: userExist.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${userExist.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        }

        await sendEmail(emailData)

        return res.status(statusCode.OK).json({
            success: true,
            user: userExist
        })

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }

})

userRouter.post('/otp-verification/:user_id', async (req, res) => {
    const body = req.body
    const user_id = req.params.user_id
    const { success, error } = otpVerificationSchema.safeParse(body)
    const now = new Date();

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error?.issues
        })
    }

    try {
        const userExist = await prisma.user.findUnique({
            where: {
                user_id: user_id
            },
            select: {
                user_id: true,
                otp: true
            }
        })

        if (!userExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "User Not Found"
            })
        }


        if (!userExist.otp) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Otp is null in the database"
            })
        }

        if (userExist.otp.expires_at < now) {
            return res.status(statusCode.EXPIRED).json({
                success: false,
                message: "OTP is Expired"
            })
        }

        const response = await bcrypt.compare(body.code, userExist.otp.code)

        let token;
        if (response) {
            token = jwt.sign({ user_id: userExist.user_id }, JWT_SECRET_KEY_USER)
        } else {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: "Invalid OTP"
            })
        }

        return res.status(statusCode.OK).json({
            success: true,
            message: "Authentification Completed",
            token: token
        })

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.get('/data', userAuthMiddleware, async (req, res) => {
    const user_id = req.user_id
    if (!user_id) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                user_id: user_id
            },
            select: {
                user_id: true,
                full_name: true,
                email: true,
                phone_number: true,
                address:true,
                cart:true
            }
        })
        
        if (!user) {
            return res.status(statusCode.OK).json({
                success: false,
                message: "User Not Found"
            })
        }
        return res.status(statusCode.OK).json({
            success: true,
            data: user
        })
    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.post('/create/address',userAuthMiddleware, async (req, res) => {
    const body = req.body
    const user_id = req.user_id
    const { success, error } = addressSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error?.issues
        })
    }

    if (!user_id) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }

    try {
        
        const newAddress = await prisma.address.create({
            data: {
                user_id: user_id,
                street: body.street,
                city: body.city,
                state: body.state,
                postal_code: body.postal_code,
                country: body.country
            }
        })

        if (body.phone_number) {
            await prisma.user.update({
                where: {
                    user_id: user_id
                },
                data: {
                    phone_number: body.phone_number
                }
            })
        }
        

        return res.status(statusCode.OK).json({
            success: true,
            message: "Address created and user's phone number updated",
            address:newAddress
        })
    } catch (error) {
        console.error('Error creating cart:', error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.delete(`/delete/address/:address_id`,userAuthMiddleware,async (req,res)=>{
    const address_id = req.params.address_id
    const user_id = req.user_id

    if (!user_id) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        const addressExist = await prisma.address.findUnique({
            where: {
                address_id: address_id,
                user_id: user_id
            }
        })

        if (!addressExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success : false,
                message: "Address Not Found"
            })
        }


        await prisma.address.delete({
            where: {
                address_id: address_id,
                user_id: user_id
            }
        })

        return res.status(statusCode.OK).json({
            success: true,
            message: "Address deleted"
        })

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

// Update behaviour when user is logged in
userRouter.post('/create/cart', userIsLoggedIn, async (req, res) => {

    const user_id = req.user_id

    try {


        const newCart = await prisma.cart.create({
            data: {
                user_id: user_id ?? null
            }
        })



        const cartToken = jwt.sign({ cart_id: newCart.cart_id }, CART_JWT_SECRET_KEY)

        return res.status(statusCode.OK).json({
            success: true,
            message: "Cart created Successfully",
            cartToken: cartToken
        })

    } catch (error) {
        console.error('Error creating cart:', error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.put('/add-user-id/:cart_id', userAuthMiddleware, async (req, res) => {
    const user_id = req.user_id
    const cart_id = req.params.cart_id
    try {
        const cartExist = await prisma.cart.findUnique({
            where:{
                cart_id: cart_id
            }
        })


        if (!cartExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            })
        }

        await prisma.cart.update({
            where: {
                cart_id: cart_id
            },
            data: {
                user_id: user_id
            }
        })

        return res.status(statusCode.OK).json({
            success: true,
            message: "User added to cart successfully"
        })

    } catch (error) {
        console.log(error)
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }

    
})
// Update behaviour when user is logged in
userRouter.post('/addToCart/:product_id', async (req, res) => {
    const product_id = req.params.product_id
    const cartToken = req.headers['cart-token'] as string

    try {
        let decoded
        if (cartToken) {
            decoded = jwt.verify(cartToken, CART_JWT_SECRET_KEY) as cartTokenPayload;
        } else {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "Cart Token is not given"
            })
        }


        const productExist = await prisma.product.findUnique({
            where: {
                product_id: product_id
            }
        })
        if (!productExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: true,
                message: "Product Not Found"
            })
        }

        const cartExist = await prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }
        })

        if (!cartExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            })
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: {
                cart_id_product_id: {
                    cart_id: decoded.cart_id,
                    product_id: product_id
                }
            }
        })

        if (cartItem) {
            await prisma.cartItem.update({
                where: {
                    cart_id_product_id: {
                        cart_id: decoded.cart_id,
                        product_id: product_id,
                    }
                },
                data: {
                    quantity: cartItem.quantity + 1
                }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    product_id: product_id,
                    cart_id: decoded.cart_id,
                    quantity: req.body.quantity,
                    color: req.body.color
                }
            });
        }
        return res.status(statusCode.OK).json({
            success: true,
            message: "Added to Cart Successfully"
        })

    } catch (error) {
        console.log(error)
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.put('/update/cart/quantity/:cart_item_id', async (req, res) => {
    const cart_item_id = req.params.cart_item_id
    const cartToken = req.headers['cart-token'] as string
    const { quantity } = req.body;

    try {
        let decoded;
        if (cartToken) {
            decoded = jwt.verify(cartToken, CART_JWT_SECRET_KEY) as cartTokenPayload;
        } else {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "Cart Token is not provided"
            });
        }

        // Validate the quantity
        if (quantity <= 0) {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "Quantity must be greater than zero"
            });
        }

        // Check if the cart item exists
        const cartItem = await prisma.cartItem.findUnique({
            where: {
                cart_item_id: cart_item_id
            }
        });

        if (!cartItem) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Cart Item Not Found"
            });
        }

       



        // Check if the cart associated with the item exists and matches the user's cart
        const cartExist = await prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }
        });

        if (!cartExist || cartItem.cart_id !== decoded.cart_id) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found or Cart Item does not belong to this cart"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                product_id: cartItem.product_id
            }
        });
        if (!product) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Product Not Found"
            });
        }

        // Check if the new quantity exceeds the product's availability
        if (quantity > product.availability) {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "Quantity exceeds stock limit"
            });
        }

        // Update the quantity of the cart item
        await prisma.cartItem.update({
            where: {
                cart_item_id: cart_item_id
            },
            data: {
                quantity: quantity
            }
        });

        return res.status(statusCode.OK).json({
            success: true,
            message: "Cart Item Quantity Updated Successfully"
        });

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
    }

})

// Update behaviour when user is logged in
userRouter.get("/cart", async (req, res) => {
    const cartToken = req.headers['cart-token'] as string

    let decoded
    if (cartToken) {
        decoded = jwt.verify(cartToken, CART_JWT_SECRET_KEY) as cartTokenPayload;
    } else {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Cart Token is not given"
        })
    }
    try {
        const cart = await prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }, select: {
                cart_id: true,
                user_id: true,
                cartItems:{
                    include: {
                        product: true, // This will include all fields of the related Product model
                      },
                }
            }
        })

        if (!cart) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            })
        }
        return res.status(statusCode.OK).json({
            success: true,
            cart: cart
        })
    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})

userRouter.post('/create/review/:product_id', userAuthMiddleware, async (req, res) => {
    const body = req.body
    const user_id = req.user_id

    if (!user_id) {
        return res.status(statusCode.UNAUTHORIZED).json({
            success: false,
            message: "User not authenticated"
        });
    }

    const { success, error } = reviewSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: error?.issues
        })
    }

    try {
        const productExist = await prisma.product.findUnique({
            where: {
                product_id: req.params.product_id
            }
        })

        if (!productExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Product Not Found"
            })
        }

        const review = await prisma.review.create({
            data: {
                user_id: user_id,
                product_id: req.params.product_id,
                rating: body.rating,
                review_text: body.review_text
            }
        })

        return res.status(statusCode.OK).json({
            success: true,
            message: "Your review added",
            review: review
        })
    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})


userRouter.post("/create/review/images/presigned/:review_id", userAuthMiddleware, async (req, res) => {

    const body = req.body

    const { success } = signedUrlImageSchema.safeParse(body)

    if (!success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "zod validation Error",
        });
    }

    console.log(body.imageName)
    console.log(body.contentType)

    let fileExtension = body.imageName.split('.').pop().toLowerCase();

    try {
        const review_id = req.params.review_id;

        const reviewExist = await prisma.review.findUnique({
            where: {
                review_id: review_id,
            },
        });

        if (!reviewExist) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Review Not Found",
            });
        }

        // Validate the file extension
        if (!allowedFormats.includes(fileExtension)) {
            // If the extension is not provided or invalid, use the content type
            fileExtension = contentTypeToExtension[body.contentType];
            if (!fileExtension) {
                return res.status(statusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid file format or content type",
                });
            }
        }

        const baseImageName = body.imageName.split('.')[0];

        const date = new Date().getTime()
        const key = `reviewImage/${review_id}/${baseImageName}${date}.${fileExtension}`

        const url = await uploadImageS3(key, body.contentType)

        res.status(200).json({
            message: "Files uploaded successfully",
            url: url,
            key: key
        });

    } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}
);

userRouter.post("/create/review/images/:review_id", userAuthMiddleware, async (req, res) => {
    const review_id = req.params.review_id
    const { key } = req.body; // This should be the S3 key returned after upload

    try {
        const reviewExist = await prisma.review.findUnique({
            where: {
                review_id: review_id,
            },
        });

        if (!reviewExist) {
            return res.status(404).json({
                success: false,
                message: 'Review Not Found',
            });
        }

        const url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`

        await prisma.reviewImage.create({
            data: {
                review_id: reviewExist.review_id,
                url: url,
                key: key
            }
        })

        res.status(statusCode.OK).json({
            success: true,
            message: "File metadata stored successfully"
        })

    } catch (error) {
        console.error('Error storing image metadata:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
})

userRouter.delete('/delete/review/:review_id', userAuthMiddleware, async (req, res) => {
    const review_id = req.params.review_id
    try {
        const review = await prisma.review.findUnique({
            where: {
                review_id: review_id
            },
            select: {
                review_id: true,
                reviewImages: true
            }
        })

        if (!review) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Review Not Found"
            })
        }
        review.reviewImages.map(async (image) => {
            await deleteObjectS3(image.key)
        })

        await prisma.reviewImage.deleteMany({
            where: {
                review_id: review_id
            }
        })

        await prisma.review.delete({
            where: {
                review_id: review_id
            }
        })

        return res.status(statusCode.OK).json({
            success: true,
            message: "Review Deleted"
        })

    } catch (error) {
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    }
})
export default userRouter;
