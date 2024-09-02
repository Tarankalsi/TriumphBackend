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
exports.refreshToken = void 0;
// Function to request a new Shiprocket token
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const refreshToken = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD,
        });
        const newToken = response.data.token;
        saveTokenToEnv(newToken);
        process.env.SHIPROCKET_API_TOKEN = newToken; // Update runtime environment
        console.log('Shiprocket API token refreshed successfully.');
    }
    catch (error) {
        console.error('Failed to refresh Shiprocket API token:', error);
    }
});
exports.refreshToken = refreshToken;
// Function to save the new token to the .env file
const saveTokenToEnv = (newToken) => {
    // Construct the path to the .env file located in the root directory
    const envPath = path_1.default.resolve(__dirname, '../../.env'); // Adjust the relative path if needed
    // Read the current content of the .env file
    let envContent = fs_1.default.readFileSync(envPath, 'utf-8');
    // Update the token in the .env file
    envContent = envContent.replace(/SHIPROCKET_API_TOKEN=.*/, `SHIPROCKET_API_TOKEN=${newToken}`);
    // Write the updated content back to the .env file
    fs_1.default.writeFileSync(envPath, envContent, 'utf-8');
    console.log('Token updated successfully in .env file.');
};
