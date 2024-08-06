
import jwt from 'jsonwebtoken';
import { Router, Request, Response } from "express";
import { categorySchema, pdUpdateSchema, productSchema, signedUrlImageSchema } from "../zod";
import { PrismaClient } from "@prisma/client";
import statusCode from "../statusCode";
import handleErrorResponse, { CustomError } from "../utils/handleErrorResponse";
import { deleteObjectS3, uploadImageS3 } from '../utils/s3';
import { adminAuthMiddleware } from '../middleware/auth.middleware';

const productRouter = Router();
const prisma = new PrismaClient();

const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY as string


productRouter.post("/create/category",adminAuthMiddleware, async (req, res) => {
  const body = req.body;

  const { success } = categorySchema.safeParse(body);

  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "Zod Validation Error",
    });
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: body.name,
      },
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: "Category Created Successfully",
      category: category,
    });
  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
      error: error
    });
  }
});

productRouter.post("/create/product/:category_id",adminAuthMiddleware, async (req: Request, res: Response) => {
  const body = req.body;

  const { success } = productSchema.safeParse(body);

  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "zod validation Error",
    });
  }
  try {
    // Check if the category exists
    const categoryId = req.params.category_id;
    const category = await prisma.category.findUnique({
      where: { category_id: categoryId },
    });
    
    if (!category) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: "Category not found",
        categoryId: categoryId,
      });
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        availablity: body.availablity,
        SKU: body.SKU,
        color: body.color,
        category_id: req.params.category_id,
      },
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: "Product Created Successfully",
      product: product,
    });
  } catch (error) {
    console.log(error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
      error: error
    });
  }
}
);

productRouter.post("/create/gallery/presigned/:product_id",adminAuthMiddleware, async (req, res) => {

  const body = req.body
  
  const {success} = signedUrlImageSchema.safeParse(body)
  
  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "zod validation Error",
    });
  } 


  try {
    const productId = req.params.product_id;

    const productExist = await prisma.product.findUnique({
      where: {
        product_id: productId,
      },
    });

    if (!productExist) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Product Not Found",
      });
    }

    const date = new Date().getTime()
    const key = `productImage/${productId}/${body.imageName}${date}.jpeg`

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

productRouter.post('/create/gallery/:product_id',adminAuthMiddleware, async (req, res) => {
  const product_id = req.params.product_id
  const { key } = req.body; // This should be the S3 key returned after upload
  try {
    const productExist = await prisma.product.findUnique({
      where: {
        product_id: product_id,
      },
    });

    if (!productExist) {
      return res.status(404).json({
        success: false,
        message: 'Product Not Found',
      });
    }

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`

    await prisma.productImage.create({
      data: {
        product_id: product_id,
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

productRouter.post('/update/product/:product_id',adminAuthMiddleware, async (req, res) => {
  const body = req.body

  const { success } = pdUpdateSchema.safeParse(body)

  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "zod validation error"
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

    const product = await prisma.product.update({
      where: {
        product_id: req.params.product_id
      },
      data: body
    })

    return res.status(statusCode.OK).json({
      success: true,
      message: "Product Updated Successfully",
      product: product
    })
  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
      error: error
    })
  }
})

productRouter.delete('/delete/gallery/:image_id',adminAuthMiddleware, async (req, res) => {

  try {
    const imageId = req.params.image_id

    const imageExist = await prisma.productImage.findUnique({
      where: {
        image_id: imageId
      }
    })

    if (!imageExist) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Image Not Found",
      });
    }

    await deleteObjectS3(imageExist.key)
    
    await prisma.productImage.delete({
      where: {
        image_id: imageId
      }
    })
    
    return res.status(statusCode.OK).json({
      success: true,
      message: "Deleted Successfully"
    })


  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
      error: error
    })
  }
})

productRouter.get("/category/:category_id", async (req, res) => {
  const categoryId = req.params.category_id

  try {

    const categoryExist = await prisma.category.findUnique({
      where: {
        category_id: categoryId
      }
    })
    if (!categoryExist) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Category Not Found",
      });
    }

    const products = await prisma.product.findMany({
      where: {
        category_id: categoryId
      },
      select: {
        product_id: true,
        name: true,
        description: true,
        price: true,
        discount_price: true,
        availablity: true,
        SKU: true,
        color: true,
        category_id: true,
        reviews: true,
        images: true,
        CartItem: true
      }
    })

    if (products.length === 0) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Products Not Found"
      });
    }
    return res.status(statusCode.OK).json({
      success: true,
      products: products
    })

  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    // return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
    //   success : false,
    //   message : "Internal Server Error"
    // })
  }
})

productRouter.get("/categories", async (req, res) => {


  try {

    const categories = await prisma.category.findMany()

    if (categories.length === 0 || !categories) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Categories Not Found"
      });
    }
    return res.status(statusCode.OK).json({
      success: true,
      categories: categories
    })
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    // return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
    //   success : false,
    //   message : "Internal Server Error"
    // })
  }
})

productRouter.get("/:product_id", async (req, res) => {
  const productId = req.params.product_id

  try {
    const product = await prisma.product.findUnique({
      where: {
        product_id: productId
      },
      select: {
        product_id: true,
        name: true,
        description: true,
        price: true,
        discount_price: true,
        availablity: true,
        SKU: true,
        color: true,
        category_id: true,
        reviews: true,
        images: true
      }
    })

    if (!product) {
      return res.status(statusCode.NOT_FOUND).json({
        success : false,
        message : "Product Not Found"
      })
    }

    res.status(statusCode.OK).json({
      success : true,
      data : product
    })
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
  }
})


interface cartTokenPayload {
  cart_id: string;
}
// Update behaviour when user is logged in
productRouter.post('/create/cart', async (req, res) => {

  try {
    const newCart = await prisma.cart.create({
      data: {
        user_id: req.body.user_id || null
      }
    })

    const cartToken = jwt.sign({ cart_id: newCart.cart_id }, CART_JWT_SECRET_KEY)

    return res.status(statusCode.OK).json({
      success: true,
      message: "Cart created Successfully",
      cartToken: cartToken
    })

  } catch (error) {
    console.log(error)
    handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
  }
})

// Update behaviour when user is logged in
productRouter.post('/addToCart/:product_id', async (req, res) => {
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
            product_id: product_id
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
          quantity: req.body.quantity || 1
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


// Update behaviour when user is logged in
productRouter.get("/cart", async (req, res) => {
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
      }
    })

    if (!cart) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Cart Not Found"
      })
    }
  } catch (error) {
    handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
  }
})

export default productRouter;
