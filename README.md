# Communication Ltd Project

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

## Notes

- The server uses SHA-1 for password hashing and validation
- The system supports both username and email for login credentials
