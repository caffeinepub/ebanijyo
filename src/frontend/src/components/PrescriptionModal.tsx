import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileCheck, Pill, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../data/products";

interface PrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export default function PrescriptionModal({
  open,
  onClose,
  product,
  onSuccess,
}: PrescriptionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload your prescription first.");
      return;
    }
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setUploading(false);
    toast.success("Prescription verified! Item added to cart.");
    onSuccess();
    onClose();
    setFile(null);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        data-ocid="prescription.dialog"
      >
        <div className="bg-primary p-5 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground flex items-center gap-2 text-lg">
              <Pill className="w-5 h-5" />
              Prescription Required
            </DialogTitle>
          </DialogHeader>
          {product && (
            <p className="text-primary-foreground/80 text-sm mt-1">
              <strong>{product.name}</strong> requires a valid doctor's
              prescription.
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <button
            type="button"
            onDrop={handleFileDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={triggerFileInput}
            onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
            data-ocid="prescription.dropzone"
            className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <FileCheck className="w-10 h-10" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-10 h-10" />
                <p className="font-medium">Drop prescription here</p>
                <p className="text-xs">or click to browse</p>
                <p className="text-xs">Supports: JPG, PNG, PDF (max 5MB)</p>
              </div>
            )}
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ Please ensure your prescription is valid, legible, and issued by a
            registered physician.
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="prescription.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!file || uploading}
              data-ocid="prescription.submit_button"
            >
              {uploading ? "Verifying..." : "Submit & Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
