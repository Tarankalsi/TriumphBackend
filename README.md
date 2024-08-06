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

### 1.1 Authentification

### 1.1.1 Register New Admin

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

### 1.1.2 Login Admin

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

### 1.1.3 OTP Verification

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

### 1.1.4 Get admin Id

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
### 1.1.5 Change Password

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

### 1.2 Product CRUD Operations

### 1.2.1  Create New Category of Products

- **URL**: `/product/create/category`
- **Method**: `POST`
- **Description**: Create new category of products

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **Body**:
  ```json
  {
    "name": "category_name"
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Category Created Successfully",
      "category": "specific category details which just created"
    }

### 1.2.2 Create product under specific category

- **URL**: `/product/create/product/:category_id`
- **Method**: `POST`
- **Description**: Create new product under specific category

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **params**:
  - `category_id : Category Id`   
- **Body**:
  ```json
  {
    "name":"name of the product",
    "description": "Product Description",
    "price": 1500.00,
    "availability" : 50,
    "SKU" : "IND-CL-S -- Product Identifier",
    "color":"Silver"
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Product Created Successfully",
      "product": "details of the product"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Category not found"
    }

### 1.2.3 Get pre signed url to store images

- **URL**: `/product/create/gallery/presigned/:product_id`
- **Method**: `POST`
- **Description**: Get pre signed url or we can say create aws url to store images in S3 bucket

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **params**:
  - `product_id : Product Id`   
- **Body**:
  ```json
  {
    "imageName": "Name of the image",
    "contentType": "image/jpg"
  }

#### Responses
  - **200 OK**
    ```json
     {
       "success": true,
       "message": "Files uploaded successfully",
       "url" : "URL of the image store in the s3 bucket",
       "key" : "Key of the image or s3 path of image"
     }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Product not found"
    }

### 1.2.4 store that s3 stored image data into database

- **URL**: `/product/create/gallery/:product_id`
- **Method**: `POST`
- **Description**: Store the metadata of the image of s3 into the database ( Compulsory step after storing image in s3 )

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **params**:
  - `product_id : Product Id`   
- **Body**:
  ```json
  {
    "key": "key of the  image which is stored in the s3 bucket",   `//Get the key after storing in the s3`
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "File metadata stored successfully"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Product not found"
    }

### 1.2.5 Update Product 

- **URL**: `/product/update/product/:product_id`
- **Method**: `POST`
- **Description**: Store the metadata of the image of s3 into the database ( Compulsory step after storing image in s3 )

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **params**:
  - `product_id : Product Id`   
- **Body**:
  ```json
  {
    "key": "key of the  image which is stored in the s3 bucket",   `//Get the key after storing in the s3`
  }

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Product Updated Successfully",
      "product": "updated data of a product"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Product not found"
    }

### 1.2.5 Delete Image of the Product 

- **URL**: `/product/delete/gallery/:image_id`
- **Method**: `DELETE`
- **Description**: Store the metadata of the image of s3 into the database ( Compulsory step after storing image in s3 )

#### Request

- **Headers**:
  - `Content-Type: application/json`,
  - `Authorization: Bearer <TOKEN>`
- **params**:
  - `image_id : Image Id`
    

#### Responses
  - **200 OK**
    ```json
    {
      "success": true,
      "message": "Deleted Successfully"
    }
  - **404 Not Found**
    ```json
    {
      "success": false,
      "message": "Image Not Found"
    }
