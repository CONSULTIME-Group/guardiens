import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

const StarRating = ({ value, onChange, size = "md", readonly = false }: StarRatingProps) => {
  const sizeClass = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`${sizeClass} ${i <= value ? "fill-[#C4956A] text-[#C4956A]" : "fill-[#E6E2D9] text-[#E6E2D9]"}`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
