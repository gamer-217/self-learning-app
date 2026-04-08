interface Props {
  value: number; // 0~100
  color?: string;
  height?: string;
}

export default function ProgressBar({ value, color = "#6366f1", height = "8px" }: Props) {
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}
