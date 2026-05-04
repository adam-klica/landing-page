"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
import {
  Users,
  FileText,
  UserCheck,
  MessageSquare,
  TrendingUp,
  Activity,
  Globe,
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { localeLink } from "@/lib/localeLink";
import { type Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";

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
  stats: {
    totalUsers: number;
    totalPosts: number;
    totalConnections: number;
    totalMessages: number;
    publishedPosts: number;
    draftPosts: number;
    acceptedConnections: number;
    onlineUsers: number;
  };
  postsByType: {
    news: number;
    events: number;
  };
  recentPosts: Array<{
    _id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    slug: string;
  }>;
  recentUsers: Array<{
    _id: string;
    username: string;
    displayName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

interface LocationData {
  city?: string;
  region?: string;
  country?: string;
  total: string;
}

interface InterestData {
  interest: string;
  count: number;
}

interface RegisteredPlatforms {
  lms?: boolean;
  ecommerce?: boolean;
  dms?: boolean;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usersByCity, setUsersByCity] = useState<LocationData[]>([]);
  const [usersByRegion, setUsersByRegion] = useState<LocationData[]>([]);
  const [usersByCountry, setUsersByCountry] = useState<LocationData[]>([]);
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [visitors, setVisitors] = useState({ today: "0", total: "0" });
  const [registeredPlatforms, setRegisteredPlatforms] = useState<RegisteredPlatforms>({
    lms: false,
    ecommerce: false,
    dms: false,
  });
  const router = useRouter();
  const pathname = usePathname();

  // Extract locale from pathname
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();

  const t = getTranslations(locale);

  useEffect(() => {
    checkAuth();
  }, [pathname]); // Re-check when route changes (e.g., after login)

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setAuthenticated(true);
        setUserRole(data.user.role || "");
        setRegisteredPlatforms(data.user.registeredPlatforms || {
          lms: false,
          ecommerce: false,
          dms: false,
        });
        loadDashboardData();
      } else {
        router.push(localeLink("/login", locale));
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push(localeLink("/login", locale));
    }
  }

  async function loadDashboardData() {
    try {
      setLoading(true);
      // Reduced from 6 API calls to 3 by combining location/interests data
      const [
        statsRes,
        allDataRes,
        visitorsRes,
      ] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/all-data"),
        fetch("/api/dashboard/visitors"),
      ]);

      if (!statsRes.ok) {
        console.error("Failed to fetch stats:", statsRes.status);
        setStats(null);
      } else {
        const statsData = await statsRes.json();
        // Check if statsData has the expected structure
        if (statsData && statsData.stats) {
          setStats(statsData);
        } else {
          console.error("Invalid stats data structure:", statsData);
          setStats(null);
        }
      }

      if (allDataRes.ok) {
        const allData = await allDataRes.json();
        setUsersByCity(Array.isArray(allData.cities) ? allData.cities : []);
        setUsersByRegion(Array.isArray(allData.regions) ? allData.regions : []);
        setUsersByCountry(Array.isArray(allData.countries) ? allData.countries : []);
        setInterests(Array.isArray(allData.interests) ? allData.interests : []);
      } else {
        setUsersByCity([]);
        setUsersByRegion([]);
        setUsersByCountry([]);
        setInterests([]);
      }

      if (visitorsRes.ok) {
        const visitorsData = await visitorsRes.json();
        setVisitors(visitorsData);
      } else {
        setVisitors({ today: "0", total: "0" });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setStats(null);
      setUsersByCity([]);
      setUsersByRegion([]);
      setUsersByCountry([]);
      setInterests([]);
      setVisitors({ today: "0", total: "0" });
    } finally {
      setLoading(false);
    }
  }

      // Chart configurations
      const cityChartData = {
        labels: (Array.isArray(usersByCity) ? usersByCity.slice(0, 10) : []).map((item) => item.city || t.common.unknown || "Unknown"),
        datasets: [
          {
            label: t.dashboard.totalUsers,
            data: (Array.isArray(usersByCity) ? usersByCity.slice(0, 10) : []).map((item) => parseInt(item.total)),
        backgroundColor: "rgba(0, 95, 153, 0.7)",
        borderColor: "rgba(0, 95, 153, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

      const regionChartData = {
        labels: (Array.isArray(usersByRegion) ? usersByRegion.slice(0, 10) : []).map((item) => item.region || t.common.unknown || "Unknown"),
        datasets: [
          {
            label: t.dashboard.totalUsers,
            data: (Array.isArray(usersByRegion) ? usersByRegion.slice(0, 10) : []).map((item) => parseInt(item.total)),
        backgroundColor: "rgba(0, 153, 76, 0.7)",
        borderColor: "rgba(0, 153, 76, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const countryChartData = {
    labels: (Array.isArray(usersByCountry) ? usersByCountry : []).map((item) => item.country || t.common.unknown || "Unknown"),
    datasets: [
      {
        label: t.dashboard.totalUsers,
        data: (Array.isArray(usersByCountry) ? usersByCountry : []).map((item) => parseInt(item.total)),
        backgroundColor: "rgba(255, 165, 0, 0.7)",
        borderColor: "rgba(255, 165, 0, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

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

  if (loading || !authenticated) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>{t.dashboard.loading}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{t.dashboard.title}</h1>
        <p className="dashboard-subtitle">
          {t.dashboard.subtitle}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats-grid">
        <Link 
          href={localeLink("/search", locale)} 
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="stat-card stat-card-primary" style={{ cursor: "pointer" }}>
            <div className="stat-card-icon">
              <Users size={28} />
            </div>
            <div className="stat-card-content">
              <h3>{t.dashboard.totalUsers}</h3>
              <p className="stat-card-value">{stats?.stats?.totalUsers ?? 0}</p>
              <span className="stat-card-label">
                {stats?.stats?.onlineUsers ?? 0} {t.dashboard.online}
              </span>
            </div>
          </div>
        </Link>

        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">
            <FileText size={28} />
          </div>
          <div className="stat-card-content">
            <h3>{t.dashboard.totalPosts}</h3>
            <p className="stat-card-value">{stats?.stats?.totalPosts ?? 0}</p>
            <span className="stat-card-label">
              {stats?.stats?.publishedPosts ?? 0} {t.dashboard.published}
            </span>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-card-icon">
            <UserCheck size={28} />
          </div>
          <div className="stat-card-content">
            <h3>{t.dashboard.connections}</h3>
            <p className="stat-card-value">
              {stats?.stats?.acceptedConnections ?? 0}
            </p>
            <span className="stat-card-label">
              {stats?.stats?.totalConnections ?? 0} {t.dashboard.total}
            </span>
          </div>
        </div>

        <div className="stat-card stat-card-visitors">
          <div className="stat-card-icon">
            <Eye size={28} />
          </div>
          <div className="stat-card-content">
            <h3>{t.dashboard.visitorsToday}</h3>
            <p className="stat-card-value">{visitors.today}</p>
            <span className="stat-card-label">{visitors.total} {t.dashboard.total}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>
              <Globe size={20} />
              {t.dashboard.usersByCity}
            </h3>
          </div>
          <div className="chart-card-body">
            {usersByCity.length > 0 ? (
              <Bar data={cityChartData} options={chartOptions} />
            ) : (
              <div className="chart-empty">{t.dashboard.noDataAvailable}</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>
              <Activity size={20} />
              {t.dashboard.usersByRegion}
            </h3>
          </div>
          <div className="chart-card-body">
            {usersByRegion.length > 0 ? (
              <Bar data={regionChartData} options={chartOptions} />
            ) : (
              <div className="chart-empty">{t.dashboard.noDataAvailable}</div>
            )}
          </div>
        </div>

        <div className="chart-card chart-card-full">
          <div className="chart-card-header">
            <h3>
              <Globe size={20} />
              {t.dashboard.usersByCountry}
            </h3>
          </div>
          <div className="chart-card-body">
            {usersByCountry.length > 0 ? (
              <Bar data={countryChartData} options={chartOptions} />
            ) : (
              <div className="chart-empty">{t.dashboard.noDataAvailable}</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>
              <FileText size={20} />
              {t.dashboard.postsByType}
            </h3>
          </div>
          <div className="chart-card-body">
            {stats && stats.postsByType ? (
              <Doughnut data={postsByTypeData} options={doughnutOptions} />
            ) : (
              <div className="chart-empty">{t.dashboard.noDataAvailable}</div>
            )}
          </div>
        </div>

      </div>

      {/* Platform Links Section */}
      {(registeredPlatforms.lms || registeredPlatforms.ecommerce || registeredPlatforms.dms) && (
        <div className="dashboard-platforms-section">
          <h3>
            <Globe size={20} />
            {t.dashboard.yourPlatforms}
          </h3>
          <div className="dashboard-platforms-grid">
            {registeredPlatforms.lms && (
              <a
                href="http://edu.southadriaticskills.org"
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-platform-link"
                style={{
                  "--platform-color-1": "#667eea",
                  "--platform-color-2": "#764ba2",
                } as React.CSSProperties}
              >
                <div className="dashboard-platform-icon">
                  <FileText size={20} />
                </div>
                <div className="dashboard-platform-content">
                  <div className="dashboard-platform-title">{t.dashboard.eLearning}</div>
                  <div className="dashboard-platform-subtitle">{t.dashboard.lmsPlatform}</div>
                </div>
                <ArrowRight size={16} className="dashboard-platform-arrow" />
              </a>
            )}
            {registeredPlatforms.ecommerce && (
              <a
                href="https://market.southadriaticskills.org"
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-platform-link"
                style={{
                  "--platform-color-1": "#f093fb",
                  "--platform-color-2": "#f5576c",
                } as React.CSSProperties}
              >
                <div className="dashboard-platform-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="dashboard-platform-content">
                  <div className="dashboard-platform-title">{t.dashboard.marketplace}</div>
                  <div className="dashboard-platform-subtitle">{t.dashboard.ecommercePlatform}</div>
                </div>
                <ArrowRight size={16} className="dashboard-platform-arrow" />
              </a>
            )}
            {registeredPlatforms.dms && (
              <a
                href="https://info.southadriaticskills.org"
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-platform-link"
                style={{
                  "--platform-color-1": "#4facfe",
                  "--platform-color-2": "#00f2fe",
                } as React.CSSProperties}
              >
                <div className="dashboard-platform-icon">
                  <FileText size={20} />
                </div>
                <div className="dashboard-platform-content">
                  <div className="dashboard-platform-title">{t.dashboard.documents}</div>
                  <div className="dashboard-platform-subtitle">{t.dashboard.dmsPlatform}</div>
                </div>
                <ArrowRight size={16} className="dashboard-platform-arrow" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="dashboard-activity-grid">
        <div className="activity-card">
          <div className="activity-card-header">
            <h3>
              <FileText size={20} />
              {t.dashboard.recentPosts}
            </h3>
            <Link href={localeLink("/news", locale)} className="activity-card-link">
              {t.dashboard.viewAll} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="activity-card-body">
            {stats?.recentPosts && stats.recentPosts.length > 0 ? (
              <ul className="activity-list">
                {stats.recentPosts.map((post) => (
                  <li key={post._id} className="activity-item">
                    <div className="activity-item-content">
                      <Link
                        href={localeLink(`/posts/${post.slug}`, locale)}
                        className="activity-item-title"
                      >
                        {post.title}
                      </Link>
                      <div className="activity-item-meta">
                        <span className="activity-item-type">{post.type}</span>
                        <span
                          className={`activity-item-status status-${post.status}`}
                        >
                          {post.status === "published" ? (
                            <CheckCircle size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                          {post.status}
                        </span>
                        <span className="activity-item-date">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="activity-empty">{t.dashboard.noRecentPosts}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
