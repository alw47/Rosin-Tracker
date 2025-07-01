import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface MultiStrainInputProps {
  value: string[];
  onChange: (strains: string[]) => void;
  placeholder?: string;
}

export function MultiStrainInput({ value = [], onChange, placeholder = "e.g., Blue Dream" }: MultiStrainInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addStrain = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue("");
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