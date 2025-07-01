import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, Clock } from "lucide-react";

interface MultiStrainInputProps {
  value: string[];
  onChange: (strains: string[]) => void;
  placeholder?: string;
}

interface FrequentlyUsedStrains {
  strains: { value: string; count: number }[];
}

export function MultiStrainInput({ value = [], onChange, placeholder = "e.g., Blue Dream" }: MultiStrainInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [frequentlyUsed, setFrequentlyUsed] = useState<FrequentlyUsedStrains>({ strains: [] });

  // Load frequently used strains from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("frequently-used-strains");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Sort by frequency and keep top 10
        const sortedStrains = data.strains
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10);
        setFrequentlyUsed({ strains: sortedStrains });
      } catch (e) {
        // Invalid data, start fresh
        setFrequentlyUsed({ strains: [] });
      }
    }
  }, []);

  // Save usage data to localStorage
  const saveUsageData = (strain: string) => {
    const updated = { ...frequentlyUsed };
    
    // Update strain frequency
    const strainIndex = updated.strains.findIndex(item => item.value.toLowerCase() === strain.toLowerCase());
    if (strainIndex >= 0) {
      updated.strains[strainIndex].count++;
    } else {
      updated.strains.push({ value: strain, count: 1 });
    }
    
    // Sort by frequency and keep top 10
    updated.strains.sort((a, b) => b.count - a.count).splice(10);
    
    setFrequentlyUsed(updated);
    localStorage.setItem("frequently-used-strains", JSON.stringify(updated));
  };

  const addStrain = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      saveUsageData(trimmedValue);
      setInputValue("");
    }
  };

  const selectFrequentStrain = (strain: string) => {
    if (!value.includes(strain)) {
      onChange([...value, strain]);
      saveUsageData(strain);
    }
  };

  const removeStrain = (strainToRemove: string) => {
    onChange(value.filter(strain => strain !== strainToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStrain();
    }
  };

  return (
    <div className="space-y-3">
      {/* Frequently Used Quick Selection */}
      {frequentlyUsed.strains.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <Label className="text-sm text-gray-600">Frequently Used Strains</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {frequentlyUsed.strains.slice(0, 8).map((item) => (
              <Badge
                key={item.value}
                variant={value.includes(item.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => selectFrequentStrain(item.value)}
              >
                {item.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input field for adding new strains */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addStrain}
          disabled={!inputValue.trim()}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Display added strains as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((strain) => (
            <Badge key={strain} variant="secondary" className="flex items-center gap-1">
              {strain}
              <button
                type="button"
                onClick={() => removeStrain(strain)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Add multiple strains for hash made from different varieties. Press Enter or click + to add.
      </p>
    </div>
  );
}