# EchoWrite Website Backend – README

Welcome to the **Backend** of your EchoWrite! This repository contains the complete server-side logic, APIs, authentication system, and database structure required for your blog platform.

---

## 🚀 Features

* **User Authentication** – Signup, Login, Logout
* **Secure Sessions** – Using express-session + MongoDB store
* **User Profiles** – Upload and manage profile images
* **Blog CRUD** – Create, read, update, delete blog posts
* **Likes & Comments System** – REST APIs for interactions
* **Cloudinary Integration** – Image uploads & deletion
* **Protected Routes** – Middleware-based access control
* **Error Handling** – Centralized error responses

---

## 🛠️ Tech Stack

### **Backend**

* Node.js
* Express.js
* MongoDB
* Mongoose
* Cloudinary SDK
* Express-Session
* Connect-Mongo (MongoDB Session Store)
* Multer / FormData Parsing

---

## ⚙️ Environment Variables

Create a `.env` file inside the backend root:

```
mongooseurl=your_mongo_connection_string
sessionsecret=your_session_secret
cloud_name=your_cloudinary_cloud_name
cloud_api_key=your_cloudinary_api_key
cloud_api_secret=your_cloudinary_api_secret
```

---

## ▶️ How to Run Locally

### **1. Navigate to Backend Folder**

```
cd server
```

### **2. Install Dependencies**

```
npm install
```

### **3. Start Backend Server**

```
npm run dev
```

Or

```
node index.js
```

The server will run on:

```
http://localhost:5000
```

---

## 📡 API Endpoints (Examples)

### **Auth Routes**

* POST `/signup`
* POST `/login`
* GET  `/logout`

### **Blog Routes**

* POST `/create-blog`
* GET  `/blogs`
* GET  `/blog/:id`
* PUT `/blog/:id`
* DELETE `/blog/:id`

### **User Routes**

* DELETE `/deleteAccount`
* PUT `/updateProfile`

### **Interaction Routes**

* POST `/like/:blogId`
* POST `/comment/:blogId`

---

## 🧰 Scripts

```
npm start       # Start server
npm run dev     # Start with nodemon
```

---

## ✨ Future Backend Improvements

* JWT authentication option
* Pagination for blogs
* Admin roles
* Rate limiting & security enhancements

---

## 📄 License

Open‑source under the **MIT License**.

---

## 📬 Contact

**Developer:** Zayyan Zia

---



If you'd like this README to include your actual API structure or your real route names, just share your backend folder or routes file!
