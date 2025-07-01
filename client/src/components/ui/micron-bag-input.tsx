import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnits } from "@/contexts/units-context";

interface MicronBag {
  micron: number;
  size: string;
  layer: number;
}

interface MicronBagInputProps {
  value?: MicronBag[];
  onChange: (bags: MicronBag[]) => void;
  className?: string;
}

interface FrequentlyUsed {
  micronSizes: { value: number; count: number }[];
  bagSizes: { value: string; count: number }[];
}

export function MicronBagInput({ value = [], onChange, className }: MicronBagInputProps) {
  const [newBag, setNewBag] = useState<Partial<MicronBag>>({ micron: undefined, size: "" });
  const [frequentlyUsed, setFrequentlyUsed] = useState<FrequentlyUsed>({ micronSizes: [], bagSizes: [] });
  const { unitSystem } = useUnits();

  // Detect the stored format based on typical size ranges
  const detectSizeFormat = (size: string): "metric" | "imperial" => {
    // Strip units first for detection
    const cleanSize = size.replace(/mm|"|inch|inches/gi, '').trim();
    const dimensionMatch = cleanSize.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!dimensionMatch) return "imperial"; // Default fallback
    
    const width = parseFloat(dimensionMatch[1]);
    const height = parseFloat(dimensionMatch[2]);
    
    // If dimensions are large (>15), likely in mm; if small (<15), likely in inches
    return (width > 15 || height > 15) ? "metric" : "imperial";
  };

  // Convert bag size between inches and mm
  const convertBagSize = (size: string, fromSystem: "metric" | "imperial", toSystem: "metric" | "imperial"): string => {
    if (!size) return size;
    
    // Always strip any existing units first
    const cleanSize = size.replace(/mm|"|inch|inches/gi, '').trim();
    const dimensionMatch = cleanSize.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!dimensionMatch) return cleanSize;
    
    const [, width, height] = dimensionMatch;
    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);
    
    // If no conversion needed, return clean size without units
    if (fromSystem === toSystem) {
      return cleanSize;
    }
    
    if (fromSystem === "imperial" && toSystem === "metric") {
      // Convert inches to mm
      const widthMm = (widthNum * 25.4).toFixed(0);
      const heightMm = (heightNum * 25.4).toFixed(0);
      return `${widthMm}x${heightMm}`;
    } else if (fromSystem === "metric" && toSystem === "imperial") {
      // Convert mm to inches
      const widthIn = (widthNum / 25.4).toFixed(1);
      const heightIn = (heightNum / 25.4).toFixed(1);
      return `${widthIn}x${heightIn}`;
    }
    
    return cleanSize;
  };

  // Get unit label for bag size
  const getBagSizeUnit = () => unitSystem === "metric" ? "mm" : "inches";

  // Load frequently used sizes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("micron-bag-frequently-used");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Clean up any existing duplicates by consolidating similar sizes
        const normalizedBagSizes = new Map<string, { value: string; count: number }>();
        
        // Process each bag size and consolidate duplicates
        data.bagSizes.forEach((bag: { value: string; count: number }) => {
          // Simple normalization: trim and standardize units
          let normalized = bag.value.trim().toLowerCase();
          
          // Extract dimensions and standardize format
          const dimensionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
          if (dimensionMatch) {
            const width = parseFloat(dimensionMatch[1]);
            const height = parseFloat(dimensionMatch[2]);
            
            // Determine if it's metric or imperial based on size
            const isMetric = (width > 15 || height > 15);
            
            if (unitSystem === "imperial") {
              if (isMetric) {
                // Convert mm to inches
                const wInches = (width / 25.4).toFixed(1);
                const hInches = (height / 25.4).toFixed(1);
                normalized = `${wInches}x${hInches}"`;
              } else {
                normalized = `${width.toFixed(1)}x${height.toFixed(1)}"`;
              }
            } else {
              if (!isMetric) {
                // Convert inches to mm
                const wMm = Math.round(width * 25.4);
                const hMm = Math.round(height * 25.4);
                normalized = `${wMm}x${hMm}mm`;
              } else {
                normalized = `${Math.round(width)}x${Math.round(height)}mm`;
              }
            }
          }
          
          if (normalizedBagSizes.has(normalized)) {
            // Add counts together for duplicates
            const existing = normalizedBagSizes.get(normalized)!;
            existing.count += bag.count;
          } else {
            normalizedBagSizes.set(normalized, { value: normalized, count: bag.count });
          }
        });
        
        // Convert back to array and sort by frequency
        const cleanedBagSizes = Array.from(normalizedBagSizes.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Keep top 10
        
        const cleanedData = {
          micronSizes: data.micronSizes.sort((a: any, b: any) => b.count - a.count).slice(0, 10),
          bagSizes: cleanedBagSizes
        };
        
        setFrequentlyUsed(cleanedData);
        // Save the cleaned data back to localStorage
        localStorage.setItem("micron-bag-frequently-used", JSON.stringify(cleanedData));
      } catch (e) {
        // Invalid data, start fresh
        setFrequentlyUsed({ micronSizes: [], bagSizes: [] });
      }
    }
  }, [unitSystem]);

  // Normalize bag size for consistent storage
  const normalizeBagSize = (size: string): string => {
    if (!size) return size;
    
    // Remove extra spaces and convert to lowercase
    let normalized = size.trim().toLowerCase();
    
    // Extract dimensions using regex
    const dimensionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!dimensionMatch) return size; // Return original if no dimensions found
    
    let width = parseFloat(dimensionMatch[1]);
    let height = parseFloat(dimensionMatch[2]);
    
    // Convert to a standard format (always use metric internally for normalization)
    const detectedFormat = detectSizeFormat(size);
    if (detectedFormat === "imperial") {
      // Convert inches to mm for normalization
      width = width * 25.4;
      height = height * 25.4;
    }
    
    // Always store in current unit system for display
    if (unitSystem === "imperial") {
      // Convert back to inches if needed
      if (detectedFormat === "metric") {
        width = width / 25.4;
        height = height / 25.4;
      }
      return `${width.toFixed(1)}x${height.toFixed(1)}"`;
    } else {
      // Keep in mm
      if (detectedFormat === "imperial") {
        // Already converted above
      }
      return `${Math.round(width)}x${Math.round(height)}mm`;
    }
  };

  // Save usage data to localStorage
  const saveUsageData = (micron: number, size: string) => {
    const updated = { ...frequentlyUsed };
    
    // Update micron size frequency
    const micronIndex = updated.micronSizes.findIndex(item => item.value === micron);
    if (micronIndex >= 0) {
      updated.micronSizes[micronIndex].count++;
    } else {
      updated.micronSizes.push({ value: micron, count: 1 });
    }
    
    // Normalize the size before storing to prevent duplicates
    const normalizedSize = normalizeBagSize(size);
    
    // Update bag size frequency using normalized size
    const sizeIndex = updated.bagSizes.findIndex(item => item.value === normalizedSize);
    if (sizeIndex >= 0) {
      updated.bagSizes[sizeIndex].count++;
    } else {
      updated.bagSizes.push({ value: normalizedSize, count: 1 });
    }
    
    // Sort by frequency and keep top 10
    updated.micronSizes.sort((a, b) => b.count - a.count).splice(10);
    updated.bagSizes.sort((a, b) => b.count - a.count).splice(10);
    
    setFrequentlyUsed(updated);
    localStorage.setItem("micron-bag-frequently-used", JSON.stringify(updated));
  };

  const addBag = () => {
    if (newBag.micron && newBag.size) {
      const nextLayer = value.length + 1;
      // Store size without units - just raw dimensions like "51x89"
      const cleanSize = newBag.size.replace(/mm|"|inch|inches/gi, '').trim();
      onChange([...value, { micron: newBag.micron, size: cleanSize, layer: nextLayer }]);
      saveUsageData(newBag.micron, cleanSize);
      setNewBag({ micron: undefined, size: "" });
    }
  };

  const removeBag = (index: number) => {
    const filteredBags = value.filter((_, i) => i !== index);
    // Reassign layer numbers after removal
    const reorderedBags = filteredBags.map((bag, i) => ({
      ...bag,
      layer: i + 1
    }));
    onChange(reorderedBags);
  };

  const selectFrequentMicron = (micron: number) => {
    setNewBag({ ...newBag, micron });
  };

  const selectFrequentSize = (size: string) => {
    setNewBag({ ...newBag, size });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Frequently Used Quick Selection */}
      {(frequentlyUsed.micronSizes.length > 0 || frequentlyUsed.bagSizes.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <Label className="text-sm text-gray-600">Frequently Used</Label>
          </div>
          
          {frequentlyUsed.micronSizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Micron Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {frequentlyUsed.micronSizes.slice(0, 6).map((item) => (
                  <Badge
                    key={item.value}
                    variant={newBag.micron === item.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => selectFrequentMicron(item.value)}
                  >
                    {item.value}μ
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {frequentlyUsed.bagSizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Bag Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {frequentlyUsed.bagSizes.slice(0, 6).map((item) => {
                  const storedFormat = detectSizeFormat(item.value);
                  const displaySize = convertBagSize(item.value, storedFormat, unitSystem);
                  const isSelected = newBag.size === displaySize;
                  
                  return (
                    <Badge
                      key={item.value}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => selectFrequentSize(displaySize)}
                    >
                      {displaySize}{unitSystem === "metric" ? "mm" : '"'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Input Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="micron-size">Micron Size</Label>
          <Input
            id="micron-size"
            type="number"
            placeholder="e.g., 160"
            value={newBag.micron || ""}
            onChange={(e) => setNewBag({ ...newBag, micron: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bag-size">Bag Size ({getBagSizeUnit()})</Label>
          <Input
            id="bag-size"
            placeholder={unitSystem === "metric" ? "e.g., 51x102 or 76x178" : "e.g., 2x4 or 3x7"}
            value={newBag.size || ""}
            onChange={(e) => setNewBag({ ...newBag, size: e.target.value })}
          />
        </div>
      </div>

      <Button 
        type="button" 
        onClick={addBag}
        className="w-full"
        disabled={!newBag.micron || !newBag.size}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Micron Bag
      </Button>

      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Added Bags</Label>
          <div className="space-y-2">
            {value.map((bag, index) => {
              // For stored dimensions, treat them as raw numbers and apply current unit system
              const cleanSize = bag.size.replace(/mm|"|inch|inches/gi, '').trim();
              const unitLabel = unitSystem === "metric" ? "mm" : '"';
              const layer = bag.layer || (index + 1); // Fallback for existing bags without layer
              return (
                <Card key={index}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Layer {layer}
                      </Badge>
                      <span className="text-sm font-medium">
                        {bag.micron}μ ({cleanSize}{unitLabel})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBag(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}