"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function LeveyJenningsChart({
  labels,
  zScores,
}: {
  labels: string[];
  zScores: number[];
}) {
  const options: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "straight", width: 2 },
    markers: { size: 4 },
    xaxis: {
      categories: labels,
      labels: { style: { colors: "var(--muted-foreground)" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: -4,
      max: 4,
      tickAmount: 8,
      labels: { style: { colors: "var(--muted-foreground)" } },
    },
    annotations: {
      yaxis: [
        { y: 3, borderColor: "#dc2626", label: { text: "+3SD", style: { background: "#dc2626", color: "#fff" } } },
        { y: 2, borderColor: "#d97706", label: { text: "+2SD", style: { background: "#d97706", color: "#fff" } } },
        { y: 0, borderColor: "var(--border)", label: { text: "Mean" } },
        { y: -2, borderColor: "#d97706", label: { text: "-2SD", style: { background: "#d97706", color: "#fff" } } },
        { y: -3, borderColor: "#dc2626", label: { text: "-3SD", style: { background: "#dc2626", color: "#fff" } } },
      ],
    },
    grid: { borderColor: "var(--border)" },
    colors: ["#0f6e5f"],
    tooltip: { theme: "dark" },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "Z-score", data: zScores }]}
      type="line"
      height={260}
    />
  );
}
