"use client";

import { useState, useEffect, memo } from "react";
import {
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { FileText, TrendingUp } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/getTranslations";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  postsByType: {
    news: number;
    events: number;
  };
}

interface InterestData {
  interest: string;
  count: number;
}

type ChartType = "posts" | "interests";

interface ChartsSectionProps {
  locale: Locale;
}

export const ChartsSection = memo(function ChartsSection({ locale }: ChartsSectionProps) {
  const t = getTranslations(locale);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [selectedChart, setSelectedChart] = useState<ChartType>("posts");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsRes, interestsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/users-interests"),
      ]);

      const statsData = await statsRes.json();
      const interestsData = await interestsRes.json();

      setStats(statsData);
      setInterests(interestsData);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  }

  const postsByTypeData = {
    labels: [t.common.news, t.common.events],
    datasets: [
      {
        data: stats
          ? [
              stats.postsByType.news,
              stats.postsByType.events,
            ]
          : [0, 0],
        backgroundColor: [
          "rgba(0, 95, 153, 0.8)",
          "rgba(0, 153, 76, 0.8)",
        ],
        borderColor: [
          "rgba(0, 95, 153, 1)",
          "rgba(0, 153, 76, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const interestsChartData = {
    labels: (Array.isArray(interests) ? interests.slice(0, 10) : []).map((item) => item.interest),
    datasets: [
      {
        label: t.dashboard.totalUsers,
        data: (Array.isArray(interests) ? interests.slice(0, 10) : []).map((item) => item.count),
        backgroundColor: "rgba(0, 119, 204, 0.7)",
        borderColor: "rgba(0, 119, 204, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
  };

  if (loading) {
    return (
      <section className="charts-section">
        <div className="container">
          <div className="charts-loading">
            <div className="loading-spinner"></div>
            <p>{t.charts.loading}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="charts-section" data-aos="fade-up">
      <div className="container">
        <div className="charts-section-header" data-aos="fade-up">
          <h2 className="charts-section-title">{t.charts.title}</h2>
          <p className="charts-section-subtitle">
            {t.charts.subtitle}
          </p>
        </div>

        <div className="chart-display-wrapper" data-aos="fade-up" data-aos-delay="200">
          <div className="chart-display-card">
            <div className="chart-display-header">
              <h3>
                <FileText size={24} />
                {t.dashboard.postsByType}
              </h3>
            </div>
            <div className="chart-display-body">
              {stats && stats.postsByType ? (
                <Doughnut data={postsByTypeData} options={doughnutOptions} />
              ) : (
                <div className="chart-empty">{t.dashboard.noDataAvailable}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
