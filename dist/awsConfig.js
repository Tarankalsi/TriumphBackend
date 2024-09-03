"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ses = exports.s3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ses_1 = require("@aws-sdk/client-ses");
const region = process.env.REGION;
const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
if (!region && !accessKeyId && !secretAccessKey) {
    throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be defined in the environment variables');
}
const config = {
    region: process.env.REGION,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    }
};
exports.s3 = new client_s3_1.S3Client(config);
exports.ses = new client_ses_1.SESClient(config);
