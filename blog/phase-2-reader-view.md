
# Tutorial: Building an AI-Powered "Read-it-Later" App (Part 2: Content Parsing & Reader View)

Welcome back to our building journey! In [Part 1](link-to-part-1), we laid the foundation and built a functional Minimum Viable Product (MVP). We have a web app that can save a link and its title to a database. That's a huge accomplishment!

But our goal is to build an *AI-powered* app, and for that, the AI needs something to analyze. In this part, we're going to upgrade our application to save the *entire text* of an article and then build a beautiful, clean "Reader View" to display it.

Let's get our tools ready and continue building.

---

## Part 1: Saving the Article's Content

Right now, our backend fetches a webpage and just grabs the `<title>` tag. We need to tell it to also grab the main article content, stripping away all the ads, navigation bars, and other clutter.

### 1. Upgrading Our Database (Database Migration)

Our `links` table in the database currently has columns for `id`, `url`, `title`, and `created_at`. We need a new column to store the article content.

In software development, changing the structure of your database is called a **database migration**. It's a formal step in evolving your application.

Go to the **SQL Editor** in your Supabase dashboard and run the following command:

```sql
ALTER TABLE links
ADD COLUMN content TEXT;
```

*   `ALTER TABLE links` tells the database we want to change the `links` table.
*   `ADD COLUMN content TEXT` tells it to add a new column named `content` with the data type `TEXT`, which can hold long strings of text.

**How to Check If It Worked:** Go to the **Table Editor**, click on your `links` table, and you should see the new `content` column!

### 2. Upgrading the Backend Code

Now, let's teach our Python backend how to parse the article.

Open your `backend/main.py` file. We are going to make two changes.

First, we need to import the `Document` class from the `readability` library we installed in Part 1. Find this line:

```python
from bs4 import BeautifulSoup
```

And change it to:

```python
from bs4 import BeautifulSoup
from readability import Document
```

Next, find the `@app.post("/links")` function. We are going to replace the logic that gets the title and inserts the data. Find this block of code:

```python
        # Parse the HTML and get the title
        soup = BeautifulSoup(page.content, 'html.parser')
        title = soup.title.string if soup.title else "No title found"

        # Insert into Supabase
        response = supabase.table('links').insert({
            "url": link.url,
            "title": title
        }).execute()
```

And replace it with this new block:

```python
        # Use readability to parse the main content and title
        doc = Document(page.text) # We use page.text to avoid encoding errors
        title = doc.title()
        content = doc.summary(html_partial=True) # Get clean HTML content

        # Insert into Supabase
        response = supabase.table('links').insert({
            "url": link.url,
            "title": title,
            "content": content
        }).execute()
```

**What did we just do?**

*   Instead of using `BeautifulSoup` to just get the title, we now feed the entire page's HTML into `readability`'s `Document` class.
*   `doc.title()` gives us a cleaner title.
*   `doc.summary(html_partial=True)` is the magic function. It finds the main article content and returns it as clean HTML.
*   Finally, our `insert` command now also saves the extracted `content` into our new database column.

**A Quick Debugging Story (A Real-World Lesson):**
Initially, you might have tried using `page.content` instead of `page.text`. This would cause an error: `cannot use a string pattern on a bytes-like object`. This is because `page.content` gives you raw computer bytes, but `readability` expects a human-readable string. `page.text` is a handy feature from the `requests` library that automatically decodes the bytes into a string for us. This is a perfect example of a small bug you might encounter and how to solve it!

Your backend server (the `uvicorn` process) should have automatically reloaded after you saved the file. It's now ready to parse articles!

---

## Part 2: Building the "Reader View"

Now that we're saving the content, let's create a page to display it.

### 1. Understanding Dynamic Routing in Next.js

We don't want to create a separate page for every single link we save. We want to create one *template* page that can display any article based on the ID in the URL (e.g., `/read/1`, `/read/2`, etc.).

Next.js has a brilliant feature for this. In the `src/app` directory, if you create a folder with square brackets in its name, like `[id]`, it becomes a dynamic segment of the URL.

### 2. Installing a Security Tool

**Best Practice (Security):** When you display HTML content that comes from an external source (like an article we saved), you must **sanitize** it first. This prevents a security vulnerability called Cross-Site Scripting (XSS), where malicious code from the article could run in your app.

In your terminal (the one you use for git commands), navigate to the `frontend` directory and install a library called `dompurify`:

```bash
cd frontend
npm install dompurify @types/dompurify
cd ..
```

### 3. Creating the Reader Page File

1.  In your `frontend/src/app` directory, create a new folder named `read`.
2.  Inside that `read` folder, create another folder named `[id]`.
3.  Inside the `[id]` folder, create a new file named `page.tsx`.

Your folder structure should look like this:
`frontend/src/app/read/[id]/page.tsx`

Now, paste the following code into that new `page.tsx` file:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Link {
  id: number;
  url: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ReadPage() {
  const params = useParams();
  const id = params.id;
  const [link, setLink] = useState<Link | null>(null);

  useEffect(() => {
    if (id) {
      const fetchLink = async () => {
        // This is our new backend endpoint!
        const response = await axios.get(`http://localhost:8000/links/${id}`);
        setLink(response.data);
      };
      fetchLink();
    }
  }, [id]);

  if (!link) {
    return <div className="text-center p-12">Loading article...</div>;
  }

  // Sanitize the HTML content before rendering!
  const sanitizedContent = DOMPurify.sanitize(link.content);

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-slate-50">
      <div className="w-full max-w-4xl">
        <a href="/" className="text-blue-600 mb-8 block">&larr; Back to all links</a>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{link.title}</CardTitle>
            <a href={link.url} target="_blank" className="text-sm text-gray-500 pt-2">
              {link.url}
            </a>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

**Code Breakdown:**
*   `useParams()` is a Next.js hook that lets us read the dynamic part of the URL (the `id`).
*   `useEffect` runs when the page loads, fetches the specific link's data from our new backend endpoint (`/links/${id}`).
*   `DOMPurify.sanitize(link.content)` is where we use our security tool to clean the HTML.
*   `dangerouslySetInnerHTML` is the React way to render a string as HTML. We only use it because we have just sanitized the content.

### 4. Linking to the Reader Page

The final step is to make the cards on our main page clickable. Open `frontend/src/app/page.tsx`.

First, add an import for the `Link` component at the top:

```tsx
import { Toaster, toast } from "sonner";
import Link from "next/link";
```

Next, find the `links.map(...)` section. We need to wrap the entire `<Card>` component with a `<Link>` component.

Replace this:

```tsx
            links.map((link) => (
              <Card key={link.id} className="shadow-sm hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <CardDescription className="text-xs pt-2">
                    Added on: {new Date(link.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {link.url}
                  </a>
                </CardContent>
              </Card>
            ))
```

With this:

```tsx
            links.map((link) => (
              <Link href={`/read/${link.id}`} key={link.id}>
                <Card className="shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    <CardDescription className="text-xs pt-2">
                      Added on: {new Date(link.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 break-all">
                      {link.url}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
```

Now, each card is a link to its own reader page!

---

## Part 3: Saving Our Progress

We've completed another major phase. Let's commit our work.

In your terminal (the one for git), run:

```bash
git add .
git commit -m "feat: Implement content parsing and reader view"
git push origin main
```

## Conclusion

Incredible work! Our application is now much more powerful. It doesn't just bookmark links; it archives their content for later reading in a clean, distraction-free interface. We've learned about database migrations, dynamic routing, and the critical importance of sanitizing user-generated content.

In the next and final part of our core tutorial, we will finally bring in the AI to automatically generate summaries, categories, and tags for our articles. See you there!

