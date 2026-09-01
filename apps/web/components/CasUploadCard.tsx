"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CasUploadCardProps {
  userId: string;
}

const CasUploadCard = ({ userId }: CasUploadCardProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      toast.success("PDF file selected");
    } else {
      toast.error("Please upload a valid PDF file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        toast.success("PDF file selected");
      } else {
        toast.error("Please upload a valid PDF file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a CAS PDF file");
      return;
    }
    
    if (!password) {
      toast.error("Please enter your PAN or DOB as password");
      return;
    }

    setIsUploading(true);
    toast.loading("Processing your CAS file...", { id: "cas-upload" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      formData.append("userId", userId);

      const response = await fetch("/api/cas/parse", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse CAS file");
      }

      toast.success("Portfolio synced successfully!", { id: "cas-upload" });
      setPassword("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage, { id: "cas-upload" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit}>
        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg py-8 px-4 text-center cursor-pointer transition-all
            ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${file ? "border-green-500 bg-green-50" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-green-600" />
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                Drag & drop your CAS PDF here
              </p>
              <p className="text-xs text-gray-400">or click to browse</p>
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CAS Password (PAN / DOB)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="password"
              placeholder="Enter your PAN or date of birth"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className={`w-full mt-4 ${
            (!file || !password) 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-bank-gradient hover:opacity-90 text-white'
          }`}
          disabled={isUploading || !file || !password}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Parse & Sync Portfolio"
          )}
        </Button>
      </form>
    </div>
  );
};

export default CasUploadCard;
