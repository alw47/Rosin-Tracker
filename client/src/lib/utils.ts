import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateYieldPercentage(yieldAmount: number, startAmount: number): number {
  if (startAmount === 0) return 0;
  return (yieldAmount / startAmount) * 100;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatWeight(weight: number, unit: string, decimals = 2): string {
  return `${weight.toFixed(decimals)}${unit}`;
}

export function formatTemperature(temp: number, unit: string, decimals = 0): string {
  return `${temp.toFixed(decimals)}${unit}`;
}

export function formatPressure(pressure: number, unit: string, decimals = 0): string {
  return `${pressure.toFixed(decimals)} ${unit}`;
}

export function formatMicronBags(bags: { micron: number; size: string; layer?: number }[] | null | string, unitSystem: "metric" | "imperial" = "imperial"): string {
  if (!bags) return "None";
  
  // Handle case where bags is stored as a JSON string
  let parsedBags: { micron: number; size: string; layer?: number }[];
  if (typeof bags === 'string') {
    try {
      parsedBags = JSON.parse(bags);
    } catch (error) {
      console.error('Failed to parse micron bags:', error);
      return "Invalid data";
    }
  } else {
    parsedBags = bags;
  }
  
  if (!Array.isArray(parsedBags) || parsedBags.length === 0) return "None";
  
  const convertBagSize = (size: string, fromSystem: "metric" | "imperial", toSystem: "metric" | "imperial"): string => {
    if (fromSystem === toSystem || !size) return size;
    
    const dimensionMatch = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!dimensionMatch) return size;
    
    const [, width, height] = dimensionMatch;
    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);
    
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
    
    return size;
  };
  
  // Detect the stored format based on typical size ranges and context
  const detectSizeFormat = (size: string): "metric" | "imperial" => {
    if (!size) return "imperial";
    
    // If size explicitly contains 'mm', it's metric
    if (size.includes('mm')) return "metric";
    
    // If size contains quote marks, it's imperial
    if (size.includes('"') || size.includes("'")) return "imperial";
    
    const dimensionMatch = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (!dimensionMatch) return "imperial"; // Default fallback
    
    const width = parseFloat(dimensionMatch[1]);
    const height = parseFloat(dimensionMatch[2]);
    
    // If either dimension is very large (likely corrupted), treat as corrupted data
    if (width > 500 || height > 500) {
      console.warn(`Detected unusually large micron bag dimensions: ${size}. This appears to be corrupted data.`);
      return "imperial"; // Return imperial to avoid conversion
    }
    
    // Since we store raw dimensions, we need smarter detection:
    // - Very small decimals (like 2.0, 3.1) are likely inches
    // - Whole numbers in 25-200 range are likely mm
    // - Decimals with .0 or .5 pattern under 10 are likely inches
    
    if ((width <= 10 && height <= 10) && (width % 0.5 === 0 || height % 0.5 === 0)) {
      return "imperial"; // Likely inches with common fractional sizes
    }
    
    if (width >= 20 && height >= 20 && width === Math.round(width) && height === Math.round(height)) {
      return "metric"; // Likely whole mm values
    }
    
    // Default based on size ranges
    if (width <= 15 && height <= 15) return "imperial"; // Likely inches
    if (width >= 20 && height >= 20) return "metric"; // Likely mm
    
    return "imperial"; // Default fallback for edge cases
  };
  
  const unitLabel = unitSystem === "metric" ? "mm" : '"';
  
  // Sort bags by layer for proper display order
  const sortedBags = parsedBags.sort((a, b) => (a.layer || 0) - (b.layer || 0));
  
  return sortedBags.map((bag, index) => {
    const layer = bag.layer || (index + 1); // Fallback for existing bags without layer
    
    // Check if the size appears to be corrupted pixel data
    const dimensionMatch = bag.size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (dimensionMatch) {
      const width = parseFloat(dimensionMatch[1]);
      const height = parseFloat(dimensionMatch[2]);
      
      // If dimensions are very large (likely pixel dimensions), show as "corrupted data"
      if (width > 500 || height > 500) {
        return `L${layer}: ${bag.micron}μ (size data corrupted)`;
      }
    }
    
    const storedFormat = detectSizeFormat(bag.size);
    const displaySize = convertBagSize(bag.size, storedFormat, unitSystem);
    return `L${layer}: ${bag.micron}μ (${displaySize}${unitLabel})`;
  }).join(", ");
}
