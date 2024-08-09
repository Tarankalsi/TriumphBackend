"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteObjectS3 = exports.uploadImageS3 = exports.getObjectURL = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const awsConfig_1 = require("../awsConfig");
const getObjectURL = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        });
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(awsConfig_1.s3, command);
        return url;
    }
    catch (error) {
        console.error("Error getting object URL:", error);
        throw error;
    }
});
exports.getObjectURL = getObjectURL;
const uploadImageS3 = (key, contentType) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            ContentType: contentType
        });
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(awsConfig_1.s3, command, { expiresIn: 60 * 5 });
        return url;
    }
    catch (error) {
        console.error("Error uploading review image:", error);
        throw error;
    }
});
exports.uploadImageS3 = uploadImageS3;
const deleteObjectS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    });
    try {
        const data = yield awsConfig_1.s3.send(command);
        return {
            success: true,
            message: `File Deleted Successfully: ${key}`,
            data: data
        };
    }
    catch (error) {
        console.error(`Error deleting file: ${key}`, error);
        return {
            success: false,
            message: `Error deleting file: ${key}`,
            error: error
        };
    }
});
exports.deleteObjectS3 = deleteObjectS3;
