export default function Loading({ size = "large" }: { size?: "small" | "large" }) {
  const sizeClass = size === "large" ? "w-12 h-12" : "w-6 h-6";
  const borderClass = size === "large" ? "border-4" : "border-2";

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClass} ${borderClass} border-gray-300 border-t-blue-600 rounded-full animate-spin`}
      />
    </div>
  );
}
