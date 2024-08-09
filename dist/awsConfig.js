"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ses = exports.s3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ses_1 = require("@aws-sdk/client-ses");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const config = {
    region: process.env.AWS_REGION,
    credentials: (0, credential_providers_1.fromEnv)()
};
exports.s3 = new client_s3_1.S3Client(config);
exports.ses = new client_ses_1.SESClient(config);
