import { createContext, useContext, useState, useEffect } from "react";

type UnitSystem = "metric" | "imperial";

interface UnitsContextType {
  unitSystem: UnitSystem;
  toggleUnits: () => void;
  convertTemperature: (temp: number, fromSystem?: UnitSystem) => number;
  convertWeight: (weight: number, fromSystem?: UnitSystem) => number;
  convertPressure: (pressure: number, fromSystem?: UnitSystem) => number;
  getTemperatureUnit: () => string;
  getWeightUnit: () => string;
  getPressureUnit: () => string;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  useEffect(() => {
    const saved = localStorage.getItem("unitSystem");
    if (saved === "metric" || saved === "imperial") {
      setUnitSystem(saved);
    }
  }, []);

  const toggleUnits = () => {
    const newSystem = unitSystem === "metric" ? "imperial" : "metric";
    setUnitSystem(newSystem);
    localStorage.setItem("unitSystem", newSystem);
  };

  const convertTemperature = (temp: number, fromSystem: UnitSystem = "metric") => {
    if (unitSystem === fromSystem) return temp;
    if (unitSystem === "imperial") {
      // Convert C to F
      return (temp * 9/5) + 32;
    } else {
      // Convert F to C
      return (temp - 32) * 5/9;
    }
  };

  const convertWeight = (weight: number, fromSystem: UnitSystem = "metric") => {
    if (unitSystem === fromSystem) return weight;
    if (unitSystem === "imperial") {
      // Convert g to oz
      return weight * 0.035274;
    } else {
      // Convert oz to g
      return weight / 0.035274;
    }
  };

  const convertPressure = (pressure: number, fromSystem: UnitSystem = "metric") => {
    if (unitSystem === fromSystem) return pressure;
    if (unitSystem === "imperial") {
      // Convert bar to PSI (1 bar = 14.5038 PSI)
      return pressure * 14.5038;
    } else {
      // Convert PSI to bar (1 PSI = 0.0689476 bar)
      return pressure * 0.0689476;
    }
  };

  const getTemperatureUnit = () => unitSystem === "metric" ? "°C" : "°F";
  const getWeightUnit = () => unitSystem === "metric" ? "g" : "oz";
  const getPressureUnit = () => unitSystem === "metric" ? "bar" : "PSI";

  return (
    <UnitsContext.Provider value={{
      unitSystem,
      toggleUnits,
      convertTemperature,
      convertWeight,
      convertPressure,
      getTemperatureUnit,
      getWeightUnit,
      getPressureUnit,
    }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error("useUnits must be used within a UnitsProvider");
  }
  return context;
}
