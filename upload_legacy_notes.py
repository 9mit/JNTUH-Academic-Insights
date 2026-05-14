import os
import time
from supabase import create_client, Client
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

NOTES_DIR = Path("JNTUH NOTES")
BUCKET_NAME = "notes_files"

def upload_directory():
    if not NOTES_DIR.exists():
        print(f"Directory {NOTES_DIR} not found.")
        return

    print("Starting bulk upload to Supabase...")
    for pdf_file in NOTES_DIR.rglob("*.pdf"):
        rel_path = pdf_file.relative_to(NOTES_DIR)
        parts = rel_path.parts
        if len(parts) >= 3:
            year = parts[0]
            sem = parts[1]
            subject = parts[2]
            
            timestamp = int(time.time() * 1000)
            safe_filename = pdf_file.name.replace(" ", "_")
            supabase_path = f"R18/{timestamp}_{safe_filename}"
            
            print(f"Uploading {pdf_file.name} to {supabase_path}...")
            
            try:
                with open(pdf_file, "rb") as f:
                    supabase.storage.from_(BUCKET_NAME).upload(supabase_path, f)
                
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(supabase_path)
                
                supabase.table("notes").insert({
                    "regulation": "R18",
                    "year": year,
                    "semester": sem,
                    "subject": subject,
                    "file_name": safe_filename,
                    "file_url": public_url,
                    "file_size": pdf_file.stat().st_size,
                    "status": "approved"
                }).execute()
                
                print(f"Success: {pdf_file.name}")
            except Exception as e:
                print(f"Failed to upload {pdf_file.name}: {e}")
                
        time.sleep(0.5)
        
    print("Bulk upload complete!")

if __name__ == "__main__":
    upload_directory()
