
# Tutorial: Building an AI-Powered "Read-it-Later" App from Scratch (Part 1: The MVP)

Hello, future builder! Welcome to this beginner-friendly, step-by-step tutorial. Have you ever found yourself drowning in a sea of interesting articles and videos, wishing you had a personal librarian to sort them all out? That's exactly what we're going to build: a smart "Read-it-Later" service that not only saves your links but also uses AI to understand and organize them.

This tutorial series is for anyone who wants to learn programming by building a real, useful project. We'll start from the very beginning—I mean it! We'll cover how to open your computer's command line, write your first lines of code, and connect all the pieces to create a functional web application.

By the end of this first part, you will have a working **Minimum Viable Product (MVP)**: a web page where you can paste a link, save it to a database, and see a list of all your saved links. 

Let's begin!

---

## Part 0: Setting Up Your Workshop

Every builder needs a good workshop. For us, that means installing the necessary software and tools on our computer.

### Prerequisites (The Tools)

We need a few key tools. Don't worry, they are all free.

1.  **Visual Studio Code (VS Code):** This is our code editor. It's like a word processor, but for writing code, with lots of helpful features. [Download it here](https://code.visualstudio.com/).
2.  **Node.js:** This is a JavaScript runtime that we'll need for our frontend (the user interface). It comes with `npm` (Node Package Manager), which helps us install other tools. [Download the "LTS" version here](https://nodejs.org/).
3.  **Python:** This is the programming language we'll use for our backend (the brains of the operation). [Download the latest version here](https://www.python.org/). When installing on Windows, make sure to **check the box that says "Add Python to PATH"**.
4.  **Git:** This is a version control system. Think of it as a time machine for your code, allowing you to save "checkpoints" and track every change. [Download it here](https://git-scm.com/).
5.  **uv (from Astral):** A super-fast Python package manager that we'll use. We'll install this one using the command line.

### Opening Your Command Line (The Terminal)

This is one of the most important tools for a developer. It's a text-based way to interact with your computer.

*   **On Windows:** Press the `Windows Key`, type `PowerShell`, and press `Enter`. You'll see a blue window where you can type commands.
*   **On Linux (e.g., Ubuntu):** Press `Ctrl+Alt+T`. A terminal window will appear.

Now, let's install `uv`. In your newly opened terminal, type this command and press `Enter`:

```bash
pip install uv
```

If you get an error, try `pip3 install uv`.

### Setting Up Your Project on GitHub

GitHub is a website where you can store your code remotely. It's like a cloud backup for your Git projects.

1.  Go to [GitHub.com](https://github.com) and create a free account.
2.  On the main page, click the green "Create repository" button.
3.  Give your repository a name (e.g., `my-library-app`).
4.  Keep it "Public".
5.  **Do not** check any of the boxes ("Add a README file", "Add .gitignore", etc.). We will do all of this ourselves.
6.  Click "Create repository".
7.  On the next page, you'll see some commands under a "…or create a new repository on the command line" section. Keep this page open! We'll need the URL it gives you (e.g., `git@github.com:your-username/my-library-app.git`).

---

## Part 1: Scaffolding the Project

"Scaffolding" means creating the basic folder structure for our project.

1.  **Create a Project Folder:** In your terminal, let's create a folder for our project and move into it.

    ```bash
    mkdir library
    cd library
    ```

2.  **Initialize Git:** Now, we tell Git to start tracking this folder.

    ```bash
    git init
    ```
    You'll see a message saying "Initialized empty Git repository".

3.  **Create Subdirectories:** Our project has two main parts: the `backend` and the `frontend`. Let's create folders for them.

    ```bash
    mkdir backend frontend
    ```

4.  **First Commit (Our First Checkpoint):** Let's save our progress. A commit is a snapshot of your code at a specific point in time. It's a great practice to commit often.

    ```bash
    git add .
    git commit -m "Initial project structure"
    ```

---

## Part 2: Building the Backend (The Brains)

The backend is the part of our application that runs on a server. It handles logic, talks to the database, and does the heavy lifting.

### 1. Setting up the Python Environment

Navigate into your backend folder:

```bash
cd backend
```

We'll create a "virtual environment", which is an isolated space for our Python packages so they don't interfere with other projects.

```bash
uv venv
```

This creates a `.venv` folder. Now, we install the Python libraries we need.

```bash
uv pip install fastapi uvicorn supabase python-dotenv beautifulsoup4 readability-lxml
```

*   **fastapi:** The web framework we'll use to build our API.
*   **uvicorn:** The server that will run our FastAPI application.
*   **supabase:** The official library to talk to our Supabase database.
*   **python-dotenv:** A utility to read secret keys from a file.
*   **beautifulsoup4 & readability-lxml:** Libraries to parse web pages, which we'll use later.

### 2. Setting up the Database with Supabase

Supabase is a fantastic service that gives us a database and an API layer for free.

1.  Go to [Supabase.com](https://supabase.com) and sign up.
2.  Create a new project. Give it a name and a strong password.
3.  Once the project is ready, navigate to **Project Settings** (the gear icon).
4.  Go to the **API** section.
5.  You will see a **Project URL** and two keys. For now, we only need the `anon` `public` key.

### 3. Storing Our Secrets

**Best Practice:** Never write secret keys or passwords directly in your code. We use a special `.env` file for this.

In your `backend` folder, create a new file named `.env` and add the following, pasting your own URL and key from Supabase.

```
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_KEY=your-anon-public-key
```

Now, to prevent this secret file from ever being saved in our Git history, create another file in the `backend` folder named `.gitignore` and add this one line:

```
.env
```

### 4. Writing the Backend Code

Create a file named `main.py` in the `backend` folder and add the following code. We'll go through it step-by-step.

```python
import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# CORS Middleware: Allows our frontend (on a different address) to talk to our backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The address of our frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get our Supabase credentials from the .env file
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# A Pydantic model to define the structure of our incoming request
class LinkCreate(BaseModel):
    url: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Backend server is running"}

@app.get("/links")
def get_links():
    response = supabase.table('links').select("*").order('created_at', desc=True).execute()
    return response.data

@app.post("/links")
def add_link(link: LinkCreate):
    try:
        # Add a User-Agent header to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        page = requests.get(link.url, headers=headers)
        page.raise_for_status()

        soup = BeautifulSoup(page.content, 'html.parser')
        title = soup.title.string if soup.title else "No title found"

        response = supabase.table('links').insert({
            "url": link.url,
            "title": title
        }).execute()

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 5. Creating the Database Table

Our code needs a table in the database to store the links. Go to the **SQL Editor** in your Supabase dashboard and run this command:

```sql
CREATE TABLE links (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    url TEXT NOT NULL,
    title TEXT
);
```

### 6. Running the Backend

Go back to your terminal (make sure you are in the `backend` directory) and run the server:

```bash
.venv/bin/uvicorn main:app --reload
```

*   On Windows PowerShell, you might need to run it like this: `.venv\Scripts\uvicorn.exe main:app --reload`

You should see a message that Uvicorn is running. Your backend is now live on your local machine!

### 7. Commit the Backend

Open a **new terminal** window (leave the server running). Navigate back to your project's root `library` folder.

```bash
cd ..
git add .
git commit -m "feat: Create backend API for links"
```

---

## Part 3: Building the Frontend (The Face)

The frontend is the visual part of our application that users interact with in their browser.

### 1. Initializing the Next.js Project

In your second terminal, navigate into the `frontend` directory:

```bash
cd frontend
```

Now, run this command to create a new Next.js application.

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias='@/*' --use-npm
```

This will ask you a few questions. Just press `Enter` to accept the defaults.

### 2. Setting up the UI with shadcn/ui

`shadcn/ui` is a fantastic library of pre-built UI components.

First, initialize it:

```bash
npx shadcn@latest init
```

Answer the questions like this:
-   Base color: **Slate**
-   Accept all other defaults by pressing `Enter`.

Now, add the components we need:

```bash
npx shadcn@latest add button input card sonner
```

Finally, install `axios`, a library to help us talk to our backend:

```bash
npm install axios
```

### 3. Writing the Frontend Code

Open the file `frontend/src/app/page.tsx` and replace its entire content with this code:

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster, toast } from "sonner";

interface Link {
  id: number;
  url: string;
  title: string;
  created_at: string;
}

export default function Home() {
  const [links, setLinks] = useState<Link[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await axios.get(`${API_URL}/links`);
        setLinks(response.data);
      } catch (error) {
        toast.error("Failed to load links. Is the backend running?");
      }
    };
    fetchLinks();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/links`, { url: newLinkUrl });
      setLinks([response.data, ...links]);
      setNewLinkUrl("");
      toast.success(`Link "${response.data.title}" added!`);
    } catch (error) {
      toast.error("Failed to add link.");
    }
    setIsLoading(false);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <main className="flex min-h-screen flex-col items-center p-12 bg-slate-50">
        <h1 className="text-3xl font-bold mb-8">AI Read-it-Later</h1>
        <Card className="w-full max-w-4xl mb-8">
          <CardHeader>
            <CardTitle>Add a New Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl grid gap-4">
          {links.map((link) => (
            <Card key={link.id}>
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{new Date(link.created_at).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <a href={link.url} target="_blank" className="text-blue-600 break-all">
                  {link.url}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
```

### 4. Running the Frontend

In your second terminal (in the `frontend` directory), run the development server:

```bash
npm run dev
```

Open your web browser and go to **http://localhost:3000**. You should see your application!

### 5. Commit the Frontend

Go back to your terminal where you do git commands.

```bash
git add .
git commit -m "feat: Create frontend UI for links"
```

---

## Part 4: Pushing to GitHub

Now, let's push all our hard work to GitHub.

1.  **Add the Remote:** Remember that URL from when you created the repository on GitHub? It's time to use it. (Replace the URL with your own).

    ```bash
    git remote add origin git@github.com:your-username/my-library-app.git
    ```

2.  **Push:**

    ```bash
    git push -u origin main
    ```

## Conclusion

Congratulations! You have successfully built a fully functional web application from scratch. You have a backend API connected to a real database and a beautiful frontend to interact with it. You've learned how to set up a professional development environment, write code for both the server and the browser, and use Git to save your progress.

In the next part of this series, we'll dive into the "AI" part of our app, automatically parsing article content and preparing it for analysis. Stay tuned!

