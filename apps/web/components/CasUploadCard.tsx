"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CasUploadCardProps {
  userId: string;
}

const CasUploadCard = ({ userId }: CasUploadCardProps) => {
  const router = useRouter();
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
      
      // Refresh without hard page reload
      router.refresh();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage, { id: "cas-upload" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white/85 rounded-2xl p-6 shadow-xs border border-slate-200/90 backdrop-blur-md">
      <form onSubmit={handleSubmit}>
        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl py-8 px-4 text-center cursor-pointer transition-all duration-200
            ${isDragging ? "border-[#002766] bg-blue-50/50 scale-[0.99]" : "border-slate-300/80 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50/80"}
            ${file ? "border-emerald-500 bg-emerald-50/40" : ""}
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
              <div className="size-12 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Attached</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="size-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002766]">
                <Upload className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Drag & drop your CAS PDF statement
                </p>
                <p className="text-xs text-slate-500 mt-0.5">or click to browse local files</p>
              </div>
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            CAS Encryption Password (PAN / DOB)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="password"
              placeholder="Enter PAN (capital letters) or DOB (DDMMYYYY)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 bg-white/90 border-slate-200 text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-[#002766]/30"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className={`w-full mt-5 h-11 rounded-xl text-sm font-bold transition-all ${
            (!file || !password) 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200' 
              : 'bg-gradient-to-r from-[#002766] to-[#001A43] hover:from-[#001f52] hover:to-[#001333] text-white shadow-xs'
          }`}
          disabled={isUploading || !file || !password}
        >
          {isUploading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Decrypting & Ingesting Portfolio...
            </>
          ) : (
            "Parse & Sync Portfolio Holdings"
          )}
        </Button>
      </form>
    </div>
  );
};

export default CasUploadCard;
