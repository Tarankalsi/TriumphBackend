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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadOnCloudinary = void 0;
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
// Configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});
const uploadOnCloudinary = (localFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!localFilePath) {
            throw new Error("File Path Not found");
        }
        const response = yield cloudinary_1.v2.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary", response.url);
        fs_1.default.unlinkSync(localFilePath);
        return response;
    }
    catch (error) {
        fs_1.default.unlinkSync(localFilePath); // remove file locally
        throw new Error("Upload on Cloudinary failed");
    }
});
exports.uploadOnCloudinary = uploadOnCloudinary;
const deleteFromCloudinary = (public_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!public_id) {
            throw new Error("undefined Id of Image");
        }
        console.log(public_id);
        const response = yield cloudinary_1.v2.uploader.destroy(public_id);
        //file has been deleted successfully
        return response;
    }
    catch (error) {
        throw new Error(`Delete Failed from Cloudinary`);
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
