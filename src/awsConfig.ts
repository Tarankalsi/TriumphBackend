
import { S3Client } from "@aws-sdk/client-s3"
import { SESClient } from "@aws-sdk/client-ses"
import { AwsCredentialIdentity } from "@aws-sdk/types";

const region = process.env.REGION
const accessKeyId = process.env.ACCESS_KEY_ID

const secretAccessKey = process.env.SECRET_ACCESS_KEY
if (!region && !accessKeyId && !secretAccessKey) {
  throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be defined in the environment variables');
 
}
const config = {
  region: process.env.REGION,
  credentials: {
    accessKeyId: accessKeyId  as string, 
    secretAccessKey: secretAccessKey  as string
  } as AwsCredentialIdentity
}



export const s3 = new S3Client(config);
export const ses = new SESClient(config);
