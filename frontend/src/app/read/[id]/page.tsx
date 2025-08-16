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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    if (id) {
      const fetchLink = async () => {
        try {
          setIsLoading(true);
          const response = await axios.get(`${API_URL}/links/${id}`);
          setLink(response.data);
        } catch (err) {
          setError('Failed to load the article. Please try again later.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLink();
    }
  }, [id]);

  if (isLoading) {
    return <div className="text-center p-12">Loading article...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-12">{error}</div>;
  }

  if (!link) {
    return <div className="text-center p-12">Article not found.</div>;
  }

  // Sanitize the HTML content before rendering
  const sanitizedContent = DOMPurify.sanitize(link.content);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-4xl">
        <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-8 block">&larr; Back to all links</a>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100">{link.title}</CardTitle>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 dark:text-gray-400 hover:underline break-all pt-2">
              {link.url}
            </a>
          </CardHeader>
          <CardContent>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
