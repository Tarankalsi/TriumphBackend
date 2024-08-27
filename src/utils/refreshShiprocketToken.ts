// Function to request a new Shiprocket token
import axios from 'axios';
import fs from 'fs';
import path from 'path';


export const refreshToken = async () => {
    try {
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD,
        });

        const newToken = response.data.token;
        saveTokenToEnv(newToken);
        process.env.SHIPROCKET_API_TOKEN = newToken; // Update runtime environment
        console.log('Shiprocket API token refreshed successfully.');
    } catch (error) {
        console.error('Failed to refresh Shiprocket API token:', error);
    }
};

// Function to save the new token to the .env file
const saveTokenToEnv = (newToken: string) => {
    // Construct the path to the .env file located in the root directory
    const envPath = path.resolve(__dirname, '../../.env'); // Adjust the relative path if needed

    // Read the current content of the .env file
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Update the token in the .env file
    envContent = envContent.replace(/SHIPROCKET_API_TOKEN=.*/, `SHIPROCKET_API_TOKEN=${newToken}`);

    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log('Token updated successfully in .env file.');
};