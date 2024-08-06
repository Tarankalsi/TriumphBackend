import express from "express"
import userRouter from "./user";
import productRouter from "./product";
import adminRouter from "./admin";
import { getObjectURL} from "../utils/s3";
import { json } from "stream/consumers";
import { upload } from "../middleware/multer.middleware";


const mainRouter = express.Router();

mainRouter.use("/user", userRouter);
mainRouter.use("/product", productRouter);
mainRouter.use("/admin", adminRouter);

mainRouter.post('/',async(req,res)=>{
    


    const url = await getObjectURL("reviewImage/b4e80c15-fe67-49ef-bd80-0c557cb1ee55/review1722621934819.jpg")
    return res.status(200).json({
        url : url,
    })
})

export default mainRouter