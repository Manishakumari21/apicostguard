interface LoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
};

export default function Loader({ size = "md", text }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizes[size]} rounded-full border-line border-t-accent animate-spin`}
      />
      {text && <p className="text-sm text-muted animate-pulse">{text}</p>}
    </div>
  );
}