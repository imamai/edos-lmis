"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function SampleTrendChart({ labels, values }: { labels: string[]; values: number[] }) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: labels,
      labels: { style: { colors: "var(--muted-foreground)" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "var(--muted-foreground)" } },
      min: 0,
    },
    grid: { borderColor: "var(--border)" },
    colors: ["#0f6e5f"],
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0 },
    },
    tooltip: { theme: "dark" },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "Specimens collected", data: values }]}
      type="area"
      height={220}
    />
  );
}
