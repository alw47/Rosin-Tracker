import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PressForm } from "@/components/forms/press-form";
import { useLocation } from "wouter";

export default function NewPress() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">New Rosin Press</h1>
        <p className="text-gray-500 mt-1">Create a new rosin press batch record</p>
      </div>

      <PressForm onSuccess={handleSuccess} />
    </div>
  );
}
