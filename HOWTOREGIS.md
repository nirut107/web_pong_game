# User Registration Guide

This document outlines the process for registering new users in the Transcendence platform.

## Registration Endpoint

**URL**: `http://localhost:8000/api/v1/auth/register`
**Method**: `POST`
**Content-Type**: `application/json`

### Request Body

```json
{
  "username": "your_username",
  "email": "your_email@example.com",
  "password": "your_password"
}
```

#### Required Fields:
- `username`: 3-50 characters
- `email`: Valid email format
- `password`: Minimum 8 characters

### Response (Success)

**Status Code**: `201 Created`

```json
{
  "id": 123,
  "username": "your_username",
  "email": "your_email@example.com"
}
```

### Response (Error)

**Status Code**: `409 Conflict` (if username or email already exists)

```json
{
  "error": "Username or email already exists"
}
```

## Registration Process

When a user registers, the following happens:

1. The request is sent to the API Gateway on port 8000
2. The API Gateway routes the request to the Auth Service
3. The Auth Service:
   - Validates the request body
   - Checks if the username or email already exists
   - Hashes the password
   - Creates a new user record in the auth database
   - Calls the User Service to create a corresponding user record
4. The User Service:
   - Creates a user record with the provided username
   - Attempts to create associated profile and user status records

## Authentication After Registration

After registration, you can authenticate using the login endpoint:

**URL**: `http://localhost:8000/api/v1/auth/login`
**Method**: `POST`
**Content-Type**: `application/json`

### Request Body

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

### Response (Success)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requires2FA": false
}
```

## Example Usage

### Registration Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

### Login Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

### Accessing Protected Endpoints

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```
