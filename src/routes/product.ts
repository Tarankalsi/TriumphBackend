
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


productRouter.post("/create/category", adminAuthMiddleware, async (req, res) => {
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

productRouter.post("/create/product/:category_id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const body = req.body;

  const { success, error, data } = productSchema.safeParse(body);

  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "zod validation Error",
      error: error.errors || error
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
        message: "Category not found"
      });
    }

    const { colors, ...productData } = data;

    // Create the product
    const product = await prisma.product.create({
      data: {
        ...productData,
        category_id: req.params.category_id,

      },
    });

    if (colors) {
      for (const clr of colors) {
        let existingColor = await prisma.color.findUnique({
          where: { hex: clr.hex },
        });


        if (!existingColor) {
          existingColor = await prisma.color.create({
            data: {
              color_name: clr.color_name,
              hex: clr.hex,
            },
          });

        }

        await prisma.productColor.create({
          data: {
            product_id: product.product_id,
            color_id: existingColor.color_id,
          },
        });
      }
    }

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

productRouter.post("/create/gallery/presigned/:product_id", adminAuthMiddleware, async (req, res) => {

  const body = req.body

  const { success } = signedUrlImageSchema.safeParse(body)

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

productRouter.post('/create/gallery/:product_id', adminAuthMiddleware, async (req, res) => {
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

productRouter.post('/update/product/:product_id', adminAuthMiddleware, async (req, res) => {
  const body = req.body;

  const { success, error, data } = pdUpdateSchema.safeParse(body);

  if (!success) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: "Zod validation error",
      error: error.errors || error,
    });
  }

  try {
    const productExist = await prisma.product.findUnique({
      where: {
        product_id: req.params.product_id,
      },
    });

    if (!productExist) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Product Not Found",
      });
    }

    // Extract the color field if it exists
    const { colors, ...productData } = data;

    // Update the product details (excluding color)
    const product = await prisma.product.update({
      where: {
        product_id: req.params.product_id,
      },
      data: productData,
    });

    // If color is provided, update the color separately
    if (colors) {
      // Loop through each color and either link an existing one or create a new one
      for (const col of colors) {
        let existingColor = await prisma.color.findUnique({
          where: { hex: col.hex },
        });
        

        if (!existingColor) {
          // Create new color if it doesn't exist
          existingColor = await prisma.color.create({
            data: {
              color_name: col.color_name,
              hex: col.hex,
            },
          });
          
        }

        // Check if the relation already exists between the product and the color
        const colorLinkExists = await prisma.productColor.findUnique({
          where: {
            product_id_color_id: {
              product_id: product.product_id,
              color_id: existingColor.color_id,
            },
          },
        });
        
        if (!colorLinkExists) {
          // Create the relation if it doesn't exist
          await prisma.productColor.create({
            data: {
              product_id: product.product_id,
              color_id: existingColor.color_id,
            },
          });
          
        }
      }
    }


    return res.status(statusCode.OK).json({
      success: true,
      message: "Product Updated Successfully",
      product: product,
    });
  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
      error: error,
    });
  }
});


productRouter.delete('/delete/gallery/:image_id', adminAuthMiddleware, async (req, res) => {

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
        category_id: true,
        name: true,
        description: true,
        price: true,
        discount_percent: true,
        availability: true,
        SKU: true,
        brand: true,
        material: true,
        shape: true,
        design_style: true,
        fixture_form: true,
        ideal_for: true,
        power_source: true,
        installation: true,
        shade_material: true,
        voltage: true,
        light_color: true,
        light_source: true,
        light_color_temperature: true,
        included_components: true,
        lighting_method: true,
        item_weight: true,
        height: true,
        length: true,
        width: true,
        quantity: true,
        power_rating: true,
        brightness: true,
        controller_type: true,
        switch_type: true,
        switch_mounting: true,
        mounting_type: true,
        fixture_type: true,
        assembly_required: true,
        primary_material: true,
        number_of_light_sources: true,
        surge_protection: true,
        shade_color: true,
        key_features: true,
        batteries: true,
        embellishment: true,
        colors: true,
        reviews: true,
        images: true,
        category:true
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

productRouter.get('/search', async (req, res) => {
  const searchQuery = req.query.searchQuery as string;

  
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            category: {
              name: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          },
          {
            colors: {
              some: {
                color: {
                  color_name: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  }

                },
              },
            },
          },
        ],
      },
      include: {
        category: true,
        colors: {
          include:{
            color:true
          }
        },
        images: true,
        reviews: true,
      },
    });

    res.status(statusCode.OK).json({
      success: true,
      data: products,
    });
  } catch (error) {
    handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
  }
});


productRouter.get("/colors", async (req, res) => {
  try {

    const colors = await prisma.color.findMany()

    if (colors.length === 0 || !colors) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Colors Not Exist"
      });
    }
    return res.status(statusCode.OK).json({
      success: true,
      colors: colors
    })
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
    // return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
    //   success : false,
    //   message : "Internal Server Error"
    // })
  }
})

productRouter.get("/all", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        product_id: true,
        category_id: true,
        name: true,
        description: true,
        price: true,
        discount_percent: true,
        availability: true,
        SKU: true,
        brand: true,
        material: true,
        shape: true,
        design_style: true,
        fixture_form: true,
        ideal_for: true,
        power_source: true,
        installation: true,
        shade_material: true,
        voltage: true,
        light_color: true,
        light_source: true,
        light_color_temperature: true,
        included_components: true,
        lighting_method: true,
        item_weight: true,
        height: true,
        length: true,
        width: true,
        quantity: true,
        power_rating: true,
        brightness: true,
        controller_type: true,
        switch_type: true,
        switch_mounting: true,
        mounting_type: true,
        fixture_type: true,
        assembly_required: true,
        primary_material: true,
        number_of_light_sources: true,
        surge_protection: true,
        shade_color: true,
        key_features: true,
        batteries: true,
        embellishment: true,
        category: {
          select: {
            name: true,
          },
        },
        colors: {
          select: {
            color: true, // Include the related color details
          },
        },
        reviews: true,
        images: true,
      },
    });

    if (!products || products.length === 0) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "No products found",
      });
    }

    res.status(statusCode.OK).json({
      success: true,
      products: products,
    });
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
  }
});

productRouter.get("/all/colors", async (req, res) => {
  try {
    
    const colors = await prisma.color.findMany()

    res.status(statusCode.OK).json({
      success: true,
      colors: colors,
    });
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
  }
});

productRouter.get("/:product_id", async (req, res) => {
  const productId = req.params.product_id

  try {
    const product = await prisma.product.findUnique({
      where: {
        product_id: productId
      },
      select: {
        product_id: true,
        category_id: true,
        name: true,
        description: true,
        price: true,
        discount_percent: true,
        availability: true,
        SKU: true,
        brand: true,
        material: true,
        shape: true,
        design_style: true,
        fixture_form: true,
        ideal_for: true,
        power_source: true,
        installation: true,
        shade_material: true,
        voltage: true,
        light_color: true,
        light_source: true,
        light_color_temperature: true,
        included_components: true,
        lighting_method: true,
        item_weight: true,
        height: true,
        length: true,
        width: true,
        quantity: true,
        power_rating: true,
        brightness: true,
        controller_type: true,
        switch_type: true,
        switch_mounting: true,
        mounting_type: true,
        fixture_type: true,
        assembly_required: true,
        primary_material: true,
        number_of_light_sources: true,
        surge_protection: true,
        shade_color: true,
        key_features: true,
        batteries: true,
        embellishment: true,

        colors: {
          include: {
            color: true, // Include the related color details
          },
        },
        reviews: true,
        images: true
      }
    })

    if (!product) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Product Not Found"
      })
    }

    res.status(statusCode.OK).json({
      success: true,
      data: product
    })
  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR)
  }
})


productRouter.delete("/delete/:product_id", adminAuthMiddleware, async (req, res) => {
  const product_id = req.params.product_id;

  try {
    const productExist = await prisma.product.findUnique({
      where: {
        product_id: product_id
      },
      select: {
        product_id: true,
        colors: true,
        reviews: true,
        images: true,
        CartItem: true,
        OrderItem: true
      }
    });

    if (!productExist) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: "Product not found"
      });
    }

    // Begin a transaction
    await prisma.$transaction(async (transaction) => {
      // Delete colors associated with the product
      if (productExist.colors.length > 0) {
        await transaction.productColor.deleteMany({
          where: {
            product_id: product_id
          }
        });
      }

      // Delete images associated with the product
      if (productExist.images.length > 0) {
        for (const image of productExist.images) {
          const response = await deleteObjectS3(image.key);
          if (!response.success) {
            throw new Error('Failed to delete image from S3');
          }
        }

        await transaction.productImage.deleteMany({
          where: {
            product_id: product_id
          }
        });
      }

      // Delete cart items associated with the product
      if (productExist.CartItem) {
        await transaction.cartItem.deleteMany({
          where: {
            product_id: product_id
          }
        });
      }

      // Delete order items associated with the product
      if (productExist.OrderItem) {
        await transaction.orderItem.deleteMany({
          where: {
            product_id: product_id
          }
        });
      }

      // Finally, delete the product itself
      await transaction.product.delete({
        where: {
          product_id: product_id
        }
      });
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    return handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
  }
});







export default productRouter;
