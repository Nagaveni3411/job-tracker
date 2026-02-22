import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { Search, MapPin, Briefcase, RefreshCw, ExternalLink, DollarSign, Building, Building2 } from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/jobs';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function App() {
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveUpdatesCount, setLiveUpdatesCount] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const [page, setPage] = useState(1);
  const JOBS_PER_PAGE = 20;

  // Filters state
  const [filters, setFilters] = useState({
    role: '',
    location: '',
    experience: '',
    jobType: '',
    freshness: '',
    company: ''
  });

  const fetchJobs = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.location) params.append('location', filters.location);
      if (filters.experience) params.append('experience', filters.experience);
      if (filters.jobType) params.append('jobType', filters.jobType);
      if (filters.freshness) params.append('freshness', filters.freshness);
      if (filters.company) params.append('company', filters.company);

      params.append('page', currentPage);
      params.append('limit', JOBS_PER_PAGE);

      const response = await axios.get(`${API_URL}?${params.toString()}`);
      setJobs(response.data.data);
      setTotalJobs(response.data.total);
      setLiveUpdatesCount(0); // Clear live upates toast on manual fresh fetch
      setPage(currentPage);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Initial Fetch & Live WebSocket subscriptions
  useEffect(() => {
    fetchJobs(1);
    // eslint-disable-next-line
  }, [filters]); // Refetch fully natively on filter change

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('new_jobs', (data) => {
      setLiveUpdatesCount(prev => prev + data.count);
    });
    return () => socket.disconnect();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const manuallyScrapeJobs = async () => {
    setIsScraping(true);
    try {
      await axios.post(`${API_URL}/sync`);
      fetchJobs(1); // Fetch new jobs from pipeline
    } catch (error) {
      console.error('Failed to trigger job scraping pipeline:', error);
    } finally {
      setIsScraping(false);
    }
  };

  const handlePrevPage = () => { if (page > 1) fetchJobs(page - 1); };
  const handleNextPage = () => { if ((page * JOBS_PER_PAGE) < totalJobs) fetchJobs(page + 1); };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Briefcase size={28} />
          <span>Job Notification Tracker</span>
        </div>
        <div className="nav-links">
          <button
            className="btn-secondary"
            onClick={manuallyScrapeJobs}
            disabled={isScraping}
          >
            {isScraping ? <RefreshCw size={18} className="spin" /> : <RefreshCw size={18} />}
            {isScraping ? 'Syncing...' : 'Fetch Job Updates'}
          </button>
          <div className="live-badge" title="Connected to WebSocket pipeline">
            <div className="live-dot"></div>
            Live
          </div>
        </div>
      </nav>

      <main className="main-content">
        <aside className="sidebar">
          <h2 className="sidebar-header">Find your next job</h2>

          <div className="filter-group">
            <label>What</label>
            <div className="filter-input-wrapper">
              <Search size={18} className="filter-icon" />
              <input
                type="text"
                name="role"
                placeholder="Job title, keywords"
                className="filter-input"
                value={filters.role}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Where</label>
            <div className="filter-input-wrapper">
              <MapPin size={18} className="filter-icon" />
              <input
                type="text"
                name="location"
                placeholder="City, state, or Remote"
                className="filter-input"
                value={filters.location}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Company</label>
            <div className="filter-input-wrapper">
              <Building size={18} className="filter-icon" />
              <input
                type="text"
                name="company"
                placeholder="Company Name"
                className="filter-input"
                value={filters.company}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Date Posted</label>
            <select name="freshness" className="filter-select" value={filters.freshness} onChange={handleFilterChange}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Experience Level</label>
            <select name="experience" className="filter-select" value={filters.experience} onChange={handleFilterChange}>
              <option value="">Any experience</option>
              <option value="Entry level">Entry level</option>
              <option value="Mid-Senior level">Mid-Senior level</option>
              <option value="Director">Director</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Job Type</label>
            <select name="jobType" className="filter-select" value={filters.jobType} onChange={handleFilterChange}>
              <option value="">Any type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </aside>

        <section className="job-listings">
          {liveUpdatesCount > 0 && (
            <div className="refresh-toast">
              <span className="refresh-toast-text">{liveUpdatesCount} new job{liveUpdatesCount !== 1 && 's'} detected in pipeline</span>
              <button className="btn-primary" onClick={() => fetchJobs(1)}>View new jobs</button>
            </div>
          )}

          <div className="job-list-header">
            <span className="job-count-title">
              {filters.role || 'Job'} Feed
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: 'normal' }}>
                ({totalJobs} jobs)
              </span>
            </span>
          </div>

          <div className="jobs-grid">
            {loading ? (
              // Skeleton Layouts matching Indeed Cards
              [1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="skeleton skeleton-card"></div>
              ))
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', gridColumn: '1 / -1' }}>
                <Search size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
                <h3>No exact matches found</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Try adjusting your search criteria or removing filters.</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job._id} className="job-card" onClick={(e) => {
                  // Make whole card clickable but prevent routing if clicking link
                  if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') {
                    window.open(job.jobUrl, '_blank', 'noopener,noreferrer');
                  }
                }}>
                  <div className="job-header">
                    <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="job-title">
                      {job.title}
                    </a>
                    <div className="job-company">
                      {job.company}
                    </div>
                    <div className="job-location">
                      {job.location}
                    </div>
                  </div>

                  <div className="job-badges">
                    {job.salaryRange && job.salaryRange !== 'Not specified' && (
                      <span className="salary-badge">
                        <DollarSign size={14} /> {job.salaryRange}
                      </span>
                    )}
                    {job.jobType !== 'Not specified' && (
                      <span className="info-badge">
                        <Briefcase size={12} /> {job.jobType}
                      </span>
                    )}
                    {job.workplaceType && job.workplaceType !== 'Not specified' && (
                      <span className="info-badge">
                        {job.workplaceType}
                      </span>
                    )}
                  </div>

                  <div className="job-snippet">
                    {job.description}
                    {job.skills && job.skills.length > 0 && (
                      <ul style={{ listStyleType: 'circle', color: 'var(--text-muted)' }}>
                        <li>Core: {job.skills.join(', ')}</li>
                      </ul>
                    )}
                  </div>

                  <div className="job-footer">
                    <span className="job-posted-date">
                      Posted {formatDistanceToNow(new Date(job.postedDate), { addSuffix: true })}
                      <span style={{ margin: '0 6px' }}>•</span>
                      via {job.source}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && totalJobs > 0 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="page-info">Page {page} of {Math.ceil(totalJobs / JOBS_PER_PAGE)}</span>
              <button
                className="page-btn"
                onClick={handleNextPage}
                disabled={(page * JOBS_PER_PAGE) >= totalJobs}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
