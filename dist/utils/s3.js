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
exports.init = exports.getObjectURL = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const awsConfig_1 = require("../awsConfig");
const otpHandler_1 = require("./otpHandler");
const getObjectURL = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    });
    const url = yield (0, s3_request_presigner_1.getSignedUrl)(awsConfig_1.s3, command);
    return url;
});
exports.getObjectURL = getObjectURL;
const uploadReviewImage = (filename, contentType) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `reviewImage/${filename}`,
        ContentType: contentType
    });
    const url = yield (0, s3_request_presigner_1.getSignedUrl)(awsConfig_1.s3, command);
    return url;
});
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(process.env.S3_BUCKET_NAME);
    const url = yield uploadReviewImage(`image-${(0, otpHandler_1.generateAlphanumericOTP)(4)}.jpg`, 'image/jpg');
    // const url = await getObjectURL('reviewImage/image-IVEH.jpg')
    console.log(url);
    return url;
});
exports.init = init;
