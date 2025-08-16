'use client';

import { useState, useEffect, FormEvent, useMemo } from "react";
import axios from "axios";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster, toast } from "sonner";

// The list of categories should match the backend prompt
const CATEGORIES = [
  "All", "Technology", "History", "Health & Wellness", "Science", 
  "Business & Finance", "Arts & Culture", "Productivity", "Other"
];

interface Link {
  id: number;
  url: string;
  title: string;
  created_at: string;
  category?: string; // Category is now part of the link
}

export default function Home() {
  const [links, setLinks] = useState<Link[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await axios.get(`${API_URL}/links`);
        setLinks(response.data);
      } catch (error) {
        console.error("Failed to fetch links:", error);
        toast.error("Failed to load links. Is the backend running?");
      }
    };
    fetchLinks();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl) {
      toast.warning("Please enter a URL.");
      return;
    }
    setIsLoading(true);
    const promise = () =>
      new Promise(async (resolve, reject) => {
        try {
          const response = await axios.post(`${API_URL}/links`, { url: newLinkUrl });
          setLinks([response.data, ...links]);
          setNewLinkUrl("");
          resolve(response.data);
        } catch (error: any) {
          reject(error.response?.data?.detail || "An error occurred.");
        }
      });

    toast.promise(promise, {
      loading: "Saving and categorizing link...",
      success: (data: any) => {
        setIsLoading(false);
        return `Link "${data.title}" added successfully!`;
      },
      error: (error) => {
        setIsLoading(false);
        return `Error: ${error}`;
      },
    });
  };

  // Filter links based on the active filter
  const filteredLinks = useMemo(() => {
    if (activeFilter === "All") {
      return links;
    }
    return links.filter(link => link.category === activeFilter);
  }, [links, activeFilter]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="z-10 w-full max-w-4xl mb-8">
          <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">
            AI Read-it-Later
          </h1>
        </div>

        <Card className="w-full max-w-4xl mb-8 shadow-md">
          <CardHeader>
            <CardTitle>Add a New Link</CardTitle>
            <CardDescription>Paste a URL below to save and categorize it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                disabled={isLoading}
                className="flex-grow"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Add Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <Button 
                key={category} 
                variant={activeFilter === category ? "default" : "outline"}
                onClick={() => setActiveFilter(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-4xl grid gap-4">
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link) => (
              <Link href={`/read/${link.id}`} key={link.id}>
                <Card className="shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg pr-4">{link.title}</CardTitle>
                      {link.category && <Badge>{link.category}</Badge>}
                    </div>
                    <CardDescription className="text-xs pt-2">
                      Added on: {new Date(link.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                      {link.url}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
              <p>No links found for the category "{activeFilter}".</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
