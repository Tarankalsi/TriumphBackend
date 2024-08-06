import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../awsConfig";
import { generateAlphanumericOTP } from "./otpHandler";

export const getObjectURL = async (key: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3, command);
    return url;
  } catch (error) {
    console.error("Error getting object URL:", error);
    throw error;
  }
};

export const uploadImageS3 = async (key: string, contentType: string ) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, command ,{expiresIn : 60*5 });
    return url;
  } catch (error) {
    console.error("Error uploading review image:", error);
    throw error;
  }
};

export const deleteObjectS3 = async (key:string)=>{
 
  const command = new DeleteObjectCommand({
    Bucket:process.env.S3_BUCKET_NAME,
    Key:key
  })

  try {
    const data = await s3.send(command);
    return {
      success :true,
      message :`File Deleted Successfully: ${key}`,
      data:data
    }
  } catch (error) {
    console.error(`Error deleting file: ${key}`, error);
    return {
      success: false,
      message: `Error deleting file: ${key}`,
      error:error
    };
  }
}


