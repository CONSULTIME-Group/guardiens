import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { PawPrint, Cat } from "lucide-react";

interface Props {
  pillClass: string;
  animalsLabel: string;
  animalTypes: string[];
  toggleAnimalFilter: (animal: string) => void;
}

export default function AnimalsPickerPopover({
  pillClass, animalsLabel, animalTypes, toggleAnimalFilter,
}: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={pillClass}>
          <PawPrint className="h-4 w-4 text-primary" />
          <span className="text-foreground">{animalsLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          {["Chiens", "Chats"].map(animal => (
            <label key={animal} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
              {animal === "Chiens" && <PawPrint className="h-3.5 w-3.5 text-muted-foreground" />}
              {animal === "Chats" && <Cat className="h-3.5 w-3.5 text-muted-foreground" />}
              {animal}
            </label>
          ))}
          {!showMore && (
            <button className="text-xs text-primary hover:underline" onClick={() => setShowMore(true)}>
              Voir plus ▾
            </button>
          )}
          {showMore && ["Chevaux", "Oiseaux", "Animaux de ferme", "NAC"].map(animal => (
            <label key={animal} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
              {animal}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
