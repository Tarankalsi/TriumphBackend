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
exports.sendEmail = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const awsConfig_1 = require("../awsConfig");
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, message, html }) {
    const sourceEmail = process.env.SENDER_EMAIL;
    if (!sourceEmail) {
        throw new Error('Source email address is not defined in environment variables.');
    }
    const params = {
        Source: sourceEmail, // Replace with your verified domain email
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: 'UTF-8',
            },
            Body: {
                Text: {
                    Data: message,
                    Charset: 'UTF-8',
                },
                Html: {
                    Data: html,
                    Charset: 'UTF-8',
                },
            },
        },
    };
    try {
        const sendEmailCommand = new client_ses_1.SendEmailCommand(params);
        const result = yield awsConfig_1.ses.send(sendEmailCommand);
        return result;
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
});
exports.sendEmail = sendEmail;
