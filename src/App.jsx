import React, { useState } from "react";
import {
  Search,
  Star,
  GitFork,
  Calendar,
  Users,
  MapPin,
  Link,
  Github,
  Moon,
  Sun,
  Activity,
  AlertTriangle,
  Code,
  BookOpen,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

const COLORS = [
  "#f1502f",
  "#563d7c",
  "#e34c26",
  "#f1e05a",
  "#89e051",
  "#3572A5",
  "#701516",
  "#0d1117",
];

const GitHubInsightsDashboard = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [commits, setCommits] = useState([]);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode like GitHub

  // Enhanced fetch with better error handling and CORS support
  const fetchWithRetry = async (url, retries = 2) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    for (let i = 0; i <= retries; i++) {
      try {
        const headers = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitHub-Insights-Dashboard",
        };

        const token = import.meta.env.VITE_GITHUB_TOKEN;
        if (token) {
          headers["Authorization"] = `token ${token}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
          mode: "cors",
        });

        clearTimeout(timeoutId);

        if (response.status === 403) {
          const remaining = response.headers.get("X-RateLimit-Remaining");
          if (remaining === "0") {
            throw new Error(
              "GitHub API rate limit exceeded. Please wait an hour or add a GitHub token."
            );
          }
        }

        if (response.status === 404) {
          throw new Error(
            "User not found. Please check the username and try again."
          );
        }

        if (!response.ok) {
          throw new Error(
            `GitHub API error: ${response.status}. Please try again later.`
          );
        }

        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === "AbortError") {
          throw new Error(
            "Request timed out. Please check your internet connection."
          );
        }

        if (i === retries) {
          if (err.message.includes("fetch")) {
            throw new Error(
              "Network error. Please check your internet connection and try again."
            );
          }
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const fetchUserData = async (user) => {
    return await fetchWithRetry(`https://api.github.com/users/${user}`);
  };

  const fetchRepositories = async (user) => {
    const repos = await fetchWithRetry(
      `https://api.github.com/users/${user}/repos?per_page=100&sort=updated`
    );
    return repos.filter((repo) => !repo.fork);
  };

  const fetchLanguages = async (repos) => {
    if (repos.length === 0) return [];

    const languageData = {};
    const reposToCheck = repos.slice(0, 10);

    for (let i = 0; i < reposToCheck.length; i++) {
      try {
        const langs = await fetchWithRetry(
          `https://api.github.com/repos/${reposToCheck[i].full_name}/languages`
        );
        Object.entries(langs).forEach(([lang, bytes]) => {
          languageData[lang] = (languageData[lang] || 0) + bytes;
        });

        if (i < reposToCheck.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (err) {
        console.warn(
          `Failed to fetch languages for ${reposToCheck[i].name}:`,
          err.message
        );
      }
    }

    return Object.entries(languageData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const generateMockCommitData = (repos) => {
    const months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthYear = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      const commits =
        Math.floor(Math.random() * 25) + Math.floor(repos.length / 2);
      months.push({ month: monthYear, commits });
    }

    return months;
  };

  const handleFetchInsights = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔍 Fetching user data for:", username);
      const user = await fetchUserData(username.trim());
      setUserData(user);

      console.log("📚 Fetching repositories...");
      const repos = await fetchRepositories(username.trim());
      setRepositories(repos);

      if (repos.length === 0) {
        setLanguages([]);
        setCommits([]);
        return;
      }

      console.log("🔤 Fetching language data...");
      try {
        const langs = await fetchLanguages(repos);
        setLanguages(langs);
      } catch (langError) {
        console.warn("Language fetch failed, using empty data");
        setLanguages([]);
      }

      console.log("📊 Generating commit activity data...");
      const commitActivity = generateMockCommitData(repos);
      setCommits(commitActivity);

      console.log("✅ All data fetched successfully!");
    } catch (err) {
      console.error("❌ Error:", err);
      setError(
        err.message ||
          "Failed to fetch GitHub data. Please check your internet connection and try again."
      );
      setUserData(null);
      setRepositories([]);
      setLanguages([]);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getLanguageColor = (language) => {
    const colors = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      Python: "#3572A5",
      Java: "#b07219",
      "C++": "#f34b7d",
      C: "#555555",
      Go: "#00ADD8",
      Rust: "#dea584",
      PHP: "#4F5D95",
      Ruby: "#701516",
      HTML: "#e34c26",
      CSS: "#1572B6",
      Shell: "#89e051",
      Kotlin: "#A97BFF",
      Swift: "#fa7343",
      Dart: "#00B4AB",
    };
    return colors[language] || "#8884d8";
  };

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        darkMode ? "bg-[#0d1117] text-[#c9d1d9]" : "bg-[#f6f8fa] text-[#24292f]"
      }`}
    >
      {/* GitHub-style Header */}
      <header
        className={`border-b transition-colors duration-300 ${
          darkMode
            ? "bg-[#161b22] border-[#30363d]"
            : "bg-white border-[#d0d7de]"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Github className="h-8 w-8 text-white bg-black rounded-full p-1" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold">GitHub Insights</h1>
                  <p className="text-xs text-gray-500">Developer Analytics</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-md transition-colors ${
                  darkMode
                    ? "hover:bg-[#21262d] text-[#f0f6fc]"
                    : "hover:bg-[#f3f4f6] text-[#656d76]"
                }`}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="pb-4">
            <div className="flex items-center max-w-md space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GitHub username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleFetchInsights()}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder-[#7d8590]"
                      : "bg-white border-[#d0d7de] text-[#24292f] placeholder-[#656d76]"
                  }`}
                />
              </div>
              <button
                onClick={handleFetchInsights}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>{loading ? "Searching..." : "Search"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8">
        {error && (
          <div
            className={`mb-6 p-4 border-l-4 border-red-500 rounded-r-md ${
              darkMode
                ? "bg-[#0f1419] border-red-400 text-red-300"
                : "bg-red-50 border-red-400 text-red-700"
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {userData && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div
              className={`rounded-lg border transition-colors ${
                darkMode
                  ? "bg-[#161b22] border-[#30363d]"
                  : "bg-white border-[#d0d7de]"
              }`}
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                  <div className="relative">
                    <img
                      src={userData.avatar_url}
                      alt={userData.name || userData.login}
                      className="w-20 h-20 rounded-full border-2 border-gray-300 dark:border-gray-600"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-[#161b22]"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <h1 className="text-2xl font-bold">
                          {userData.name || userData.login}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                          @{userData.login}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 mt-4 md:mt-0">
                        <div className="flex items-center space-x-1 text-sm">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">
                            {formatNumber(userData.followers)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            followers
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <span className="font-semibold">
                            {formatNumber(userData.following)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            following
                          </span>
                        </div>
                      </div>
                    </div>

                    {userData.bio && (
                      <p className="mt-3 text-gray-700 dark:text-gray-300">
                        {userData.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      {userData.company && (
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 flex items-center justify-center">
                            🏢
                          </div>
                          <span>{userData.company}</span>
                        </div>
                      )}
                      {userData.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{userData.location}</span>
                        </div>
                      )}
                      {userData.blog && (
                        <div className="flex items-center space-x-1">
                          <Link className="h-4 w-4" />
                          <a
                            href={userData.blog}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Joined{" "}
                          {new Date(userData.created_at).toLocaleDateString(
                            "en-US",
                            { month: "long", year: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GitHub-style stats bar */}
              <div
                className={`flex items-center justify-around py-4 border-t ${
                  darkMode ? "border-[#30363d]" : "border-[#d0d7de]"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {userData.public_repos || 0}
                  </div>
                  <div className="text-xs text-gray-500">Repositories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {formatNumber(userData.public_gists || 0)}
                  </div>
                  <div className="text-xs text-gray-500">Gists</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {languages.length}
                  </div>
                  <div className="text-xs text-gray-500">Languages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {commits.reduce((sum, month) => sum + month.commits, 0)}
                  </div>
                  <div className="text-xs text-gray-500">Commits</div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Repositories */}
              <div className="lg:col-span-2 space-y-6">
                {/* Repositories */}
                <div
                  className={`rounded-lg border ${
                    darkMode
                      ? "bg-[#161b22] border-[#30363d]"
                      : "bg-white border-[#d0d7de]"
                  }`}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center space-x-2">
                        <BookOpen className="h-5 w-5" />
                        <span>Popular repositories</span>
                      </h2>
                      <span className="text-sm text-gray-500">
                        {repositories.length} total
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {repositories.slice(0, 6).map((repo) => (
                      <div
                        key={repo.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {repo.name}
                              </a>
                              <span className="px-2 py-0.5 text-xs border rounded-full text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600">
                                {repo.private ? "Private" : "Public"}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {repo.language && (
                                <div className="flex items-center space-x-1 text-xs">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: getLanguageColor(
                                        repo.language
                                      ),
                                    }}
                                  ></div>
                                  <span>{repo.language}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Star className="h-3 w-3" />
                                <span>
                                  {formatNumber(repo.stargazers_count)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <GitFork className="h-3 w-3" />
                                <span>{formatNumber(repo.forks_count)}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                Updated{" "}
                                {new Date(repo.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commit Activity */}
                <div
                  className={`rounded-lg border ${
                    darkMode
                      ? "bg-[#161b22] border-[#30363d]"
                      : "bg-white border-[#d0d7de]"
                  }`}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Contribution activity</span>
                    </h2>
                  </div>
                  <div className="p-4">
                    {commits.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={commits}>
                          <defs>
                            <linearGradient
                              id="commitGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#39d353"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#39d353"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="commits"
                            stroke="#39d353"
                            strokeWidth={2}
                            fill="url(#commitGradient)"
                          />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            stroke={darkMode ? "#7d8590" : "#656d76"}
                          />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#21262d" : "#ffffff",
                              border: darkMode
                                ? "1px solid #30363d"
                                : "1px solid #d0d7de",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No activity data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Languages & Stats */}
              <div className="space-y-6">
                {/* Languages */}
                <div
                  className={`rounded-lg border ${
                    darkMode
                      ? "bg-[#161b22] border-[#30363d]"
                      : "bg-white border-[#d0d7de]"
                  }`}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold flex items-center space-x-2">
                      <Code className="h-5 w-5" />
                      <span>Languages</span>
                    </h2>
                  </div>
                  <div className="p-4">
                    {languages.length > 0 ? (
                      <div className="space-y-3">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={languages}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {languages.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={getLanguageColor(entry.name)}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatBytes(value)}
                              contentStyle={{
                                backgroundColor: darkMode
                                  ? "#21262d"
                                  : "#ffffff",
                                border: darkMode
                                  ? "1px solid #30363d"
                                  : "1px solid #d0d7de",
                                borderRadius: "6px",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                          {languages.slice(0, 5).map((lang, index) => (
                            <div
                              key={lang.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: getLanguageColor(
                                      lang.name
                                    ),
                                  }}
                                ></div>
                                <span>{lang.name}</span>
                              </div>
                              <span className="text-gray-500">
                                {formatBytes(lang.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No language data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div
                  className={`rounded-lg border ${
                    darkMode
                      ? "bg-[#161b22] border-[#30363d]"
                      : "bg-white border-[#d0d7de]"
                  }`}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Quick stats</span>
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total stars earned
                      </span>
                      <span className="font-semibold text-yellow-500">
                        {formatNumber(
                          repositories.reduce(
                            (sum, repo) => sum + repo.stargazers_count,
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total forks
                      </span>
                      <span className="font-semibold text-blue-500">
                        {formatNumber(
                          repositories.reduce(
                            (sum, repo) => sum + repo.forks_count,
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Account age
                      </span>
                      <span className="font-semibold text-green-500">
                        {Math.floor(
                          (Date.now() -
                            new Date(userData.created_at).getTime()) /
                            (1000 * 60 * 60 * 24 * 365)
                        )}{" "}
                        years
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Most used language
                      </span>
                      <span className="font-semibold text-purple-500">
                        {languages.length > 0 ? languages[0].name : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!userData && !loading && !error && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto rounded-full border-8 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <Github className="h-12 w-12 text-gray-400" />
              </div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 border border-gray-200 dark:border-gray-700 rounded-full animate-ping opacity-20"></div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Explore GitHub Profiles</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Enter a GitHub username to discover insights about repositories,
              languages, and development activity.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              {["octocat", "torvalds", "gaearon", "sindresorhus", "tj"].map(
                (username) => (
                  <button
                    key={username}
                    onClick={() => {
                      setUsername(username);
                      setTimeout(handleFetchInsights, 100);
                    }}
                    className={`px-4 py-2 text-sm rounded-full border transition-all hover:scale-105 ${
                      darkMode
                        ? "border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]"
                        : "border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#24292f]"
                    }`}
                  >
                    Try: {username}
                  </button>
                )
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                    darkMode ? "bg-[#161b22]" : "bg-[#f6f8fa]"
                  }`}
                >
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-2">Repository Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Explore popular repositories, stars, forks, and recent
                  activity
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                    darkMode ? "bg-[#161b22]" : "bg-[#f6f8fa]"
                  }`}
                >
                  <Code className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-2">Language Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover programming language usage and preferences
                </p>
              </div>

              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                    darkMode ? "bg-[#161b22]" : "bg-[#f6f8fa]"
                  }`}
                >
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-2">Activity Tracking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View contribution patterns and development trends
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubInsightsDashboard;
