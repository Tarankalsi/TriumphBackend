import aws, { SendEmailCommand, SESClient } from "@aws-sdk/client-ses"
import { ses } from "../awsConfig"


type sendEmailProp = {
    to: string,
    subject: string,
    message: string,
    html: string
}

export const sendEmail = async ({ to, subject, message ,html}: sendEmailProp) => {

    const sourceEmail = process.env.SENDER_EMAIL;
    if (!sourceEmail) {
        throw new Error('Source email address is not defined in environment variables.');
    }
    console.log("Confirmation html :",html ?html : "html is not there" )

    const params = {
        Source: sourceEmail,// Replace with your verified domain email
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
    }

    try {
        const sendEmailCommand = new SendEmailCommand(params)
        const result = await ses.send(sendEmailCommand)
        return result
    } catch (error) {
        console.error('Error sending email:', error);
    }
}




