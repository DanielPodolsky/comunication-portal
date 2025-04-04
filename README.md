
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/213c7402-3255-4718-accd-3042b1990914

## How to set up this project with MySQL locally

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- MySQL Server installed on your machine

### Step 1: MySQL Setup

1. **Install MySQL Server**
   - For Windows: Download and install from [MySQL Official Website](https://dev.mysql.com/downloads/installer/)
   - For macOS: `brew install mysql` (using Homebrew)
   - For Linux: `sudo apt install mysql-server` (Ubuntu/Debian) or `sudo yum install mysql-server` (RedHat/CentOS)

2. **Start MySQL Server**
   - Windows: MySQL service should start automatically
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`

3. **Create Database and User**
   - Open a terminal/command prompt
   - Log in to MySQL: `mysql -u root -p` (enter your root password when prompted)
   - Run these SQL commands:

   ```sql
   CREATE DATABASE communication_ltd;
   CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'yourpassword';
   GRANT ALL PRIVILEGES ON communication_ltd.* TO 'appuser'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

### Step 2: Project Setup

1. **Clone the repository**
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Update MySQL Connection Settings**
   
   Open `src/lib/mysql.ts` and update the connection details to match your MySQL setup:
   
   ```javascript
   pool = mysql.createPool({
     host: 'localhost',
     user: 'appuser',            // The user you created
     password: 'yourpassword',   // The password you set
     database: 'communication_ltd', // The database name
     waitForConnections: true,
     connectionLimit: 10,
     queueLimit: 0
   });
   ```

4. **Run the development server**
   ```sh
   npm run dev
   ```

   The application will now try to connect to your MySQL database. If you're in a browser environment, it will fall back to using localStorage.

### Step 3: Running with Node.js Backend (Optional)

For a true MySQL experience, you'll need a Node.js backend server:

1. **Create a simple backend**
   Create a file called `server.js` in the project root:

   ```javascript
   const express = require('express');
   const cors = require('cors');
   const { initializeDatabase } = require('./src/lib/mysql');
   const app = express();

   app.use(cors());
   app.use(express.json());

   // Initialize database
   initializeDatabase().then(() => {
     console.log('Database initialized successfully');
   }).catch(err => {
     console.error('Failed to initialize database:', err);
   });

   // Start server
   const PORT = 3001;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

2. **Install required packages**
   ```sh
   npm install express cors
   ```

3. **Run the backend**
   ```sh
   node server.js
   ```

4. **Run the frontend**
   In another terminal window:
   ```sh
   npm run dev
   ```

### How to Verify It's Working

1. Check the console output for successful database connection messages
2. Register a new user through the interface
3. Connect to your MySQL database and verify the data was stored:
   ```sql
   USE communication_ltd;
   SELECT * FROM users;
   SELECT * FROM customers;
   SELECT * FROM packages;
   ```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/213c7402-3255-4718-accd-3042b1990914) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/213c7402-3255-4718-accd-3042b1990914) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
