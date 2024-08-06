# Endpoints Documentation

**Base URL**: `/api/v1`

**Common Error** 
  - **500 Internal Server Error**
    ```json
    {
      "success" : false,
      "message" : "Internal Server Error"
    }
    
    {
      "success" : false,
      "message" : "Internal Error in Authorization Middleware"
    }
    
  - **403 Forbidden**: Invalid Authorization token or missing
    ```json
    {
      "success": false,
      "message": "Error: Missing or invalid Authorization Token"
    }
    
    {
      "success": false,
      "message": "Error : Invalid User Type"
    }
  - **400 Bad Request**:Invalid input data // Zod Validation Error
    ```json
    {
      "success": false,
      "message": "zod validation error" // "Invalid Input Data"
      "error": "message"
    }
    
## 1. Admin

### 1.1 Register New Admin

- **URL**: `/admin/signup`
- **Method**: `POST`
- **Description**: Creates an admin account. Initial admin creation is allowed if no admins exist and `ALLOW_INITIAL_ADMIN_CREATION` is `true`.

#### Request

- **Headers**:
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "role": "admin" // Optional, defaults to "moderator" if not provided
  }

#### Responses
  - **201 Created**:: Admin created successfully (initial creation)
    ```json
    {
      "success": true,
      "message": "Admin Created Successfully",
      "data": {
        "id": "admin_id",
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin"
      }
    }
  - **201 Created**:New admin created successfully by an existing admin
    ```json
    {
      "success": true,
      "message": "New Admin Created"
    }
  - **401 Unauthorized**:New admin created successfully by an existing admin
    ```json
    {
      "success": false,
      "message": "You're not allowed to create new admin, admin_id is undefined"
    }

    {
      "success": false,
      "message": "You're not allowed to create new admin"
    }

### 1.2 Login Admin

- **URL**: `/admin/signin`
- **Method**: `POST`
- **Description**: Sign in into admin account.

#### Request

- **Headers**:
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }

#### Responses
  - **200 OK**:Succesfully OTP sent
    ```json
    {
      "success": true,
      "message": "OTP sent to ________",
      "admin_id": "admin_id"
    }

  - **401 Unauthorized**
    ```json
    {
      "success": false,
      "message": "Incorrect Credentials"
    }

### 1.3 OTP Verification

- **URL**: `/admin/otp-verification/:admin_id`
- **Method**: `POST`
- **Description**: otp verification process , enter otp which was sent to your email.

#### Request

- **Headers**:
  - `Content-Type: application/json`
- **params**:
  - `admin_id : admin_id`
- **Body**:
  ```json
  {
    "code": "5DSMSB"
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Authentification Completed",
      "token": "authToken"
    }
  - **401 Unauthorized**
    ```json
    {
      "success": false,
      "message": "Invalid OTP"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "User Not Found"
    }
    {
      "success": false,
      "message": "Otp is null in the database"
    }
  - **410 Expired**
    ```json
    {
      "success": false,
      "message": "OTP is Expired"
    }

### 1.4 Get admin Id

- **URL**: `/admin/adminId`
- **Method**: `GET`
- **Description**: get adminId

#### Request

- **Headers**:
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "xxxxx@gmail.com"
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "admin_id": "admin_id"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Admin doesn't exist"
    }
    {
      "success": false,
      "message": "Otp is null in the database"
    }
### 1.3 Change Password

- **URL**: `/admin/otp-verification/:admin_id`
- **Method**: `POST`
- **Description**: otp verification process , enter otp which was sent to your email.

#### Request

- **Headers**:
  - `Content-Type: application/json`
- **params**:
  - `admin_id : admin_id`
- **Body**:
  ```json
  {
    "oldPassword": "old Password",
    "newPassword": "new Password"
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Password changed successfully"
    }
  - **401 Unauthorized**
    ```json
    {
      "success": false,
      "message": "Incorrect password"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Admin Not Found"
    }
