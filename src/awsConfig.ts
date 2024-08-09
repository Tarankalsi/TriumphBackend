
import { S3Client } from "@aws-sdk/client-s3"
import { SESClient } from "@aws-sdk/client-ses"
import { fromEnv } from "@aws-sdk/credential-providers";

const config = {
  region: process.env.AWS_REGION,
  credentials: fromEnv()
}



export const s3 = new S3Client(config);
export const ses = new SESClient(config);
