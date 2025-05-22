# Communication Ltd Project

## Team Members
- Daniel Podolsky
- Guy Blum
- 

This project demonstrates the development of a secure and vulnerable web-based information system for a fictional internet service provider, including examples of **SQL Injection** and **Stored XSS** attacks, alongside their respective security mitigations.

## Setup Instructions

### Prerequisites
- Node.js installed on your computer
- MySQL 8.0 installed on your computer

### Getting Started

1. Make sure you've forked the repository
2. Clone the repository to your local machine
   ```
   git clone https://github.com/DanielPodolsky/comunication-portal.git
   ```

3. Set up the MySQL database
   - Open MySQL Command Line 8.0 and run the following commands:
   ```sql
   CREATE DATABASE communication_ltd;
   CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'yourpassword';
   GRANT ALL PRIVILEGES ON communication_ltd.* TO 'appuser'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
   - Note: If you've already created the database previously, simply use:
   ```sql
   USE communication_ltd;
   ```

   - Our local database for proof:
   - ![image](https://github.com/user-attachments/assets/dd82bfc7-5b38-4232-b9cd-216f0a058854)


4. Open a terminal in the project directory and run:
   ```
   npm install
   ```

5. Open a second terminal (click the plus icon on the right side of the terminal)
   - One terminal will be for the server
   - The other terminal will be for the client

6. After the installation is complete, in the same terminal, run:
   ```
   npm run dev
   ```
   This will start the client locally on your machine and provide a link (e.g., localhost:8080)

7. In the second terminal, run:
   ```
   node server.js
   ```
   This will start the server locally on your machine

8. If you didn't receive any errors in either terminal, you can now access the website and begin testing the system, trying different data inputs, and looking for bugs.

---

## ✅ Feature Test Summary

### 🔐 Registration
- ✅ Works in secure mode
- ✅ Works in vulnerable mode
- 💥 In vulnerable mode, entering `attacker') DELETE * FROM customers;` produces a SQL syntax error — this proves SQL Injection by breaking the query structure
- ![image](https://github.com/user-attachments/assets/12ccc99d-fe3a-4fd4-8803-39b0687ac9b1)


### 🔑 Login
- ✅ Works in secure mode
- ✅ Works in vulnerable mode
- 💥 In vulnerable mode, entering `' OR '1'='1` logs in as the first user in the database and prints all users to the console
- ![image](https://github.com/user-attachments/assets/b32f4591-61fb-4e51-b69a-5b0d0cfa80c9)


### 📋 After Registration – Dashboard
- ✅ In secure mode, entering XSS payload does not execute JavaScript — name is shown as raw text (HTML-encoded)
- 💥 In vulnerable mode, the XSS payload triggers an `alert()` — showing stored XSS execution (The XSS must be <img src=x onerror=alert("Enter Message Here")>)


### 🔁 Change Password (when knowing the current password)
- ❌ Incorrect current password → update blocked
- ❌ Reusing recent password → blocked
- ✅ Valid new password → success 💪🏻
- ![image](https://github.com/user-attachments/assets/b82209cc-9307-4b89-bf20-b9348f2514cc)


### 🆘 Forgot Password
- ✅ Enter valid email → receive token → reset password → success
- ✅ Non-existing email → neutral message shown: “If the email exists, a token was sent...”
- ![image](https://github.com/user-attachments/assets/db3327bb-3d13-4cb6-be4a-a2f450cc1fb7)


---

## ✅ Part A – Secure Feature Implementation

- [x] **Register**: user creation, complex password (config-based), email saving, HMAC + Salt storage
- [x] **Change Password**: validates current password, prevents reuse, enforces strength
- ![image](https://github.com/user-attachments/assets/caa8e7a8-e6a7-4988-a36d-4104fd1d5d63)
- [x] **Login**: username/password input, user existence check, proper response
- [x] **Add Customer**: new customer info submission + immediate display of customer name
- [x] **Forgot Password**: token sent via SHA-1 to email, used to reset password
- ![image](https://github.com/user-attachments/assets/bbc96407-4218-44b2-9744-359f512173d5)
- ![image](https://github.com/user-attachments/assets/0775819d-3338-4cef-a5a0-b2fe8fca717c)
- ![image](https://github.com/user-attachments/assets/33789571-f004-4692-a610-0f66a8da40f4)
- ![image](https://github.com/user-attachments/assets/02ffaf51-a64c-4973-b3cb-c8cdff8e8a80)




---

## 🔓 Part B – Attack Demonstrations

### 📌 Stored XSS (Part A, Section 4)
- ❌ Vulnerable version – `<img src=x onerror=alert("YO!")>` runs JavaScript alert
- ![image](https://github.com/user-attachments/assets/6629cb49-070f-4809-b019-58dcf421d98b)
- ✅ Secure version – special characters are encoded, preventing script execution
- - ![image](https://github.com/user-attachments/assets/0fc0ef9a-c4fb-48ae-83d7-15eef2fb3e97)

### 📌 SQL Injection

#### Section 1 – Registration
- `attacking'); DELETE FROM users; --` → SQL syntax error confirms injection
- ![image](https://github.com/user-attachments/assets/ae19d47e-000e-43e0-9265-5a07c641259b)


#### Section 3 – Login
- `' OR '1'='1` → login bypassed; lists all users in console
- ![image](https://github.com/user-attachments/assets/459ee2ba-f09c-432d-a0ee-45fdeeb4fac6)
- then:
- ![image](https://github.com/user-attachments/assets/1d6f7313-1e5b-4016-86ec-4c29ad26e8fd)

- ✅ Secure version uses parameterized query – login fails as expected

#### Section 4 – Customers
- `attacker'); DELETE FROM customers; --` → SQL structure broken → syntax error confirms injection
- ![image](https://github.com/user-attachments/assets/72093246-926c-4d3c-991c-9b32c5627671)


---

## 🛡️ Security Fixes Implemented

### ✔️ XSS – HTML Encoding
- `<` becomes `&lt;`, `>` becomes `&gt;` before saving to DB, preventing code execution

### ✔️ SQL Injection – Parameterized Queries (`?`)
- All secure versions (register, login, add customer) use prepared statements

---

## 🧷 Notes
- Password hashing uses HMAC + Salt
- Change Password endpoint validates current password and prevents reuse of last passwords

---

## 📁 Reminder
Attach screenshot proofs under the relevant test section above.
