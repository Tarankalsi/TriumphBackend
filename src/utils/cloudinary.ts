import fs from 'fs';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from "cloudinary";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});
 
export const uploadOnCloudinary = async (localFilePath :string) : Promise<UploadApiResponse> =>{
    try {
        if (!localFilePath) {
            throw new Error("File Path Not found")
        }

        const response: UploadApiResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
          });

        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary" , response.url);
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove file locally
        throw new Error("Upload on Cloudinary failed")
    }
}
export const deleteFromCloudinary = async (public_id :string)=>{
    try {
        if (!public_id) {
            throw new Error("undefined Id of Image")
        }
        console.log(public_id) 
        const response = await cloudinary.uploader.destroy(public_id)

        //file has been deleted successfully
        return response

    } catch (error) {
        throw new Error(`Delete Failed from Cloudinary`)
    }
}