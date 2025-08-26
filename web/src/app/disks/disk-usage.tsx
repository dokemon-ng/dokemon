import { useEffect, useRef } from "react";
import Loading from "@/components/widgets/loading";
import useDisk from "@/hooks/useDisk";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import MainArea from "@/components/widgets/main-area";
import TopBar from "@/components/widgets/top-bar";
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbCurrent, BreadcrumbLink, BreadcrumbSeparator } from "@/components/widgets/breadcrumb";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainContent from "@/components/widgets/main-content";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DiskUsage() {
  const { isLoading, diskUsage, mutateDisk } = useDisk();
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      mutateDisk();
    }, 30000);

    return () => clearInterval(interval);
  }, [mutateDisk]);

  if (isLoading) return <Loading />;
  if (!diskUsage) return <div>No disk usage data available</div>;

  const chartData = {
    labels: diskUsage.categories.map((cat) => cat.type),
    datasets: [
      {
        data: diskUsage.categories.map((cat) => {
          // Extract numeric value from size string (e.g., "1.5GB" -> 1.5)
          const sizeValue = parseFloat(cat.size.replace(/[^\d.]/g, ""));
          const unit = cat.size.replace(/[\d.]/g, "").toUpperCase();

          switch(unit) {
            case "GB": return sizeValue * 1024;
            case "TB": return sizeValue * 1024 * 1024;
            case "KB": return sizeValue / 1024;
            default: return sizeValue;
          }
        }),
        backgroundColor: [
          "rgba(54, 162, 235, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(153, 102, 255, 0.8)",
        ],
        borderColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          font: {
            size: 14,
            family: "'Inter', 'sans-serif'",
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          color: "#e5e7eb",
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const category = diskUsage.categories[context.dataIndex];
            return `${label}: ${category.size} (${category.reclaimable} reclaimable)`;
          }
        },
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        titleFont: {
          size: 16,
          family: "'Inter', 'sans-serif'",
        },
        bodyFont: {
          size: 14,
          family: "'Inter', 'sans-serif'",
        },
        padding: 12,
        boxPadding: 6,
      },
    },
    cutout: "65%",
  };

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Local</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Disk Usage</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <Button
            variant="default"
            className="flex items-center"
            onClick={() => mutateDisk()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Data
          </Button>
        </TopBarActions>
      </TopBar>

      <MainContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-gray-200">
              Storage Distribution
            </h2>
            <div className="h-96">
              <Doughnut ref={chartRef} data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-gray-200">
              Usage Details
            </h2>
            <div className="space-y-6">
              {diskUsage.categories.map((category, index) => (
                <div key={category.type} className="border-b border-gray-700 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-200 flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: chartData.datasets[0].backgroundColor[
                            index
                          ] as string,
                        }}
                      ></span>
                      {category.type}
                    </h3>
                    <span className="text-sm font-semibold text-gray-400">
                      {category.size}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                    <div>
                      <span className="text-gray-500">Total: </span>
                      {category.total}
                    </div>
                    <div>
                      <span className="text-gray-500">Active: </span>
                      {category.active}
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Reclaimable: </span>
                      <span className="text-green-400 font-medium">
                        {category.reclaimable}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {diskUsage.categories.map((category, index) => (
            <div
              key={category.type}
              className="bg-gray-800 p-4 rounded-lg shadow-sm border-l-4"
              style={{
                borderLeftColor: chartData.datasets[0].backgroundColor[
                  index
                ] as string,
              }}
            >
              <h3 className="font-semibold text-gray-200 mb-2">
                {category.type}
              </h3>
              <p className="text-2xl font-bold text-white">
                {category.size}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {category.reclaimable} reclaimable
              </p>
            </div>
          ))}
        </div>
      </MainContent>
    </MainArea>
  );
}
