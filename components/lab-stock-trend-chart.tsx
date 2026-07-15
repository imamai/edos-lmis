"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function LabStockTrendChart({ labels, values }: { labels: string[]; values: number[] }) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    dataLabels: { enabled: false },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
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
    tooltip: { theme: "dark" },
  };

  return <Chart options={options} series={[{ name: "Quantity used", data: values }]} type="bar" height={220} />;
}
