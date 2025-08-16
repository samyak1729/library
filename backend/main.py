
import os
import requests
from bs4 import BeautifulSoup
from readability import Document
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# CORS (Cross-Origin Resource Sharing) middleware
# Allows the frontend to communicate with the backend
origins = [
    "http://localhost:3000",  # Next.js default port
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Configure Gemini AI
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def get_category_from_ai(content: str) -> str:
    """Uses the Gemini API to categorize the article content."""
    prompt = '''
    Based on the following article content, classify it into ONE of the following categories:
    "Technology", "History", "Health & Wellness", "Science", "Business & Finance", "Arts & Culture", "Productivity", "Other".
    Return only the category name as a single string, and nothing else.

    Article Content:
    ---
    {content}
    ---
    '''
    try:
        # Limit content length to avoid exceeding API limits
        response = model.generate_content(prompt.format(content=content[:10000]))
        return response.text.strip()
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return "Other" # Default category on error


# Pydantic models for request bodies
class LinkCreate(BaseModel):
    url: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    """A root endpoint to check if the server is running."""
    return {"message": "Backend server is running"}

@app.get("/links")
def get_links():
    """Fetches all links from the database."""
    try:
        response = supabase.table('links').select("*").order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/links")
def add_link(link: LinkCreate):
    """Receives a URL, fetches its title, and saves it to the database."""
    try:
        # Set a browser-like User-Agent header
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        # Fetch the webpage content
        page = requests.get(link.url, headers=headers)
        page.raise_for_status()  # Raise an exception for bad status codes

        # Use readability to parse the main content and title
        doc = Document(page.text)
        title = doc.title()
        content_html = doc.summary(html_partial=True)
        content_text = BeautifulSoup(content_html, 'html.parser').get_text(strip=True, separator=' ')

        # Get category from AI
        category = get_category_from_ai(content_text)

        # Insert into Supabase
        response = supabase.table('links').insert({
            "url": link.url,
            "title": title,
            "content": content_html,
            "category": category
        }).execute()

        # Check for errors in the response
        if len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to insert link")

        return response.data[0]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/links/{link_id}")
def get_link(link_id: int):
    """Fetches a single link by its ID."""
    try:
        response = supabase.table('links').select("*").eq('id', link_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Link not found")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
