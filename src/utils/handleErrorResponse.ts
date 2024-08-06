import { Response } from "express";

export interface CustomError extends Error {
    statusCode?: number;
  }


const handleErrorResponse = (res : Response, error : CustomError, statusCode : number) => {
    return res.status(statusCode).json({
      success: false,
      message: error.message|| "Internal Server Error",
    });
  };
  
  export default handleErrorResponse;