interface LoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export default function Loader({ size = "md", text }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-iris animate-spin" />
      </div>
      {text && (
        <p className="text-sm text-muted">{text}</p>
      )}
    </div>
  );
}
