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
import Link from "next/link";

// Define the type for a single link object
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

  // Fetch all links from the backend when the component mounts
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

  // Handle form submission to add a new link
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
          const response = await axios.post(`${API_URL}/links`, {
            url: newLinkUrl,
          });
          // Add the new link to the top of the list
          setLinks([response.data, ...links]);
          setNewLinkUrl("");
          resolve(response.data);
        } catch (error: any) {
          reject(error.response?.data?.detail || "An error occurred.");
        }
      });

    toast.promise(promise, {
      loading: "Saving link...",
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

  return (
    <>
      <Toaster position="top-center" richColors />
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="z-10 w-full max-w-4xl items-center justify-between font-mono text-sm lg:flex">
          <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">
            AI Read-it-Later
          </h1>
        </div>

        <Card className="w-full max-w-4xl mb-8 shadow-md">
          <CardHeader>
            <CardTitle>Add a New Link</CardTitle>
            <CardDescription>
              Paste a URL below to save and process it.
            </CardDescription>
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
                {isLoading ? "Adding..." : "Add Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl grid gap-4">
          {links.length > 0 ? (
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                      {link.url}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
              <p>No links saved yet. Add one above to get started!</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}