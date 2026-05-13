/**
 * AadhaarIntel — Frontend Application
 * Single-page app with dynamic page loading, Chart.js visualizations, and live MongoDB data.
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================
// Helper Functions
// ============================================

function formatNumber(num) {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString('en-IN') ?? '0';
}

function formatFullNumber(num) {
    return num?.toLocaleString('en-IN') ?? '0';
}

function getBadgeClass(severity) {
    return `badge badge-${(severity || 'low').toLowerCase()}`;
}

let _apiOnline = null;

async function fetchAPI(endpoint) {
    if (window.generateMockResponse) {
        const mock = window.generateMockResponse(endpoint);
        if (mock) return mock;
    }
    return null;
}

function destroyCharts() {
    Object.values(Chart.instances).forEach(c => c.destroy());
}

// Chart.js global theme
Chart.defaults.color = '#8b8ba3';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(18, 18, 26, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 12;

// ============================================
// Theme Manager
// ============================================

const ThemeManager = {
    init() {
        const saved = localStorage.getItem('aadhaarintel_theme') || 'dark';
        this.setTheme(saved, false);

        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                this.setTheme(next, true);
            });
        }
    },

    setTheme(theme, notify = true) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('aadhaarintel_theme', theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07070d' : '#f0f0f8');

        // Update Chart.js colors
        if (theme === 'light') {
            Chart.defaults.color = '#5a5a7a';
            Chart.defaults.borderColor = 'rgba(0,0,0,0.08)';
            Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255,255,255,0.97)';
            Chart.defaults.plugins.tooltip.borderColor = 'rgba(0,0,0,0.1)';
            Chart.defaults.plugins.tooltip.bodyColor = '#1a1a2e';
            Chart.defaults.plugins.tooltip.titleColor = '#1a1a2e';
        } else {
            Chart.defaults.color = '#8b8ba3';
            Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
            Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(18, 18, 26, 0.95)';
            Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
            Chart.defaults.plugins.tooltip.bodyColor = '#eeeef8';
            Chart.defaults.plugins.tooltip.titleColor = '#eeeef8';
        }

        if (notify && window.showToast) {
            const label = theme === 'dark'
                ? (window.i18n ? window.i18n.t('ui.dark_mode') : 'Dark Mode')
                : (window.i18n ? window.i18n.t('ui.light_mode') : 'Light Mode');
            showToast(`${label} activated`, 'info');
        }
    }
};

// ============================================
// Landing Page Manager
// ============================================

const LandingPage = {
    selectedLang: null,

    init() {
        const overlay = document.getElementById('landing-overlay');
        if (!overlay) return;

        // Skip landing if user already selected a language
        const savedLang = localStorage.getItem('aadhaarintel_lang');
        if (savedLang) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.style.display = 'none', 600);
            return;
        }

        // Populate language cards
        const container = document.getElementById('landing-languages');
        if (!container) return;

        container.innerHTML = I18N_LANGUAGES.map((lang, i) => `
            <div class="landing-lang-card" data-lang="${lang.code}" style="animation-delay: ${0.05 + i * 0.04}s">
                <div class="landing-lang-native">${lang.nativeName}</div>
                <div class="landing-lang-name">${lang.name}</div>
            </div>
        `).join('');

        // Card click handlers
        container.querySelectorAll('.landing-lang-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.landing-lang-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedLang = card.dataset.lang;
                document.getElementById('landing-continue-btn').disabled = false;

                // Update landing text in selected language
                const titleEl = document.getElementById('landing-title');
                const subtitleEl = document.getElementById('landing-subtitle');
                const continueEl = document.getElementById('landing-continue-text');
                if (titleEl) titleEl.textContent = window.i18n.t('landing.title');
                if (subtitleEl) subtitleEl.textContent = window.i18n.t('landing.subtitle');

                // Preview translation
                window.i18n.currentLang = this.selectedLang;
                if (titleEl) titleEl.textContent = window.i18n.t('landing.title');
                if (subtitleEl) subtitleEl.textContent = window.i18n.t('landing.subtitle');
                if (continueEl) continueEl.textContent = window.i18n.t('landing.continue');
            });
        });

        // Continue button
        document.getElementById('landing-continue-btn')?.addEventListener('click', () => {
            if (!this.selectedLang) return;
            window.i18n.setLanguage(this.selectedLang);
            overlay.classList.add('hidden');
            setTimeout(() => overlay.style.display = 'none', 600);
        });
    }
};

// ============================================
// Page Renderers
// ============================================

const pages = {
    // ---- Dashboard (Module 5) ----
    async dashboard() {
        const [kpis, trend, states] = await Promise.all([
            fetchAPI('/dashboard/kpis'),
            fetchAPI('/dashboard/enrollment-trend'),
            fetchAPI('/dashboard/state-summary'),
        ]);


        const trendData = (trend || []).slice(0, 30);
        const topStates = (states || []).slice(0, 12);

        return `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon purple">📊</div>
                <div class="kpi-label" data-i18n="kpi.total_enrollments">${t('kpi.total_enrollments')}</div>
                <div class="kpi-value">${formatNumber(kpis.total_enrollments)}</div>
                <div class="kpi-change positive">↑ Across ${formatFullNumber(kpis.enrollment_records)} records</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon green">🔬</div>
                <div class="kpi-label" data-i18n="kpi.biometric_updates">${t('kpi.biometric_updates')}</div>
                <div class="kpi-value">${formatNumber(kpis.total_biometric_updates)}</div>
                <div class="kpi-change positive">Bio + Demo scans</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon blue">📋</div>
                <div class="kpi-label" data-i18n="kpi.demographic_updates">${t('kpi.demographic_updates')}</div>
                <div class="kpi-value">${formatNumber(kpis.total_demographic_updates)}</div>
                <div class="kpi-change positive">Address & name changes</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange">👶</div>
                <div class="kpi-label" data-i18n="kpi.age_0_5">${t('kpi.age_0_5')}</div>
                <div class="kpi-value">${formatNumber(kpis.enrollment_by_age?.age_0_5)}</div>
                <div class="kpi-change positive">New registrations</div>
            </div>
        </div>

        <div class="section-header">
            <h2 class="section-title"><span class="dot"></span> <span data-i18n="geo.title">${t('geo.title')}</span></h2>
        </div>
        
        <div class="india-map-section">
            <div class="map-card">
                <div class="map-controls">
                    <div class="map-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                        <span data-i18n="ui.map_title">${t('ui.map_title')}</span>
                    </div>
                    <div class="map-metric-tabs">
                        <button class="map-metric-tab active" data-metric="enrollment" data-i18n="map.enrollment">${t('map.enrollment')}</button>
                        <button class="map-metric-tab" data-metric="coverage" data-i18n="map.coverage">${t('map.coverage')}</button>
                        <button class="map-metric-tab" data-metric="fraud" data-i18n="map.fraud_alerts">${t('map.fraud_alerts')}</button>
                        <button class="map-metric-tab" data-metric="migration" data-i18n="map.migration">${t('map.migration')}</button>
                        <button class="map-metric-tab" data-metric="cbgi" data-i18n="map.bio_risk">${t('map.bio_risk')}</button>
                    </div>
                </div>
                <div class="india-map-svg-wrapper" id="india-map-container">
                    <!-- SVG gets injected here -->
                </div>
                <div class="map-legend">
                    <span class="map-legend-label">Low</span>
                    <div class="map-legend-gradient" id="map-legend-gradient" style="background: linear-gradient(90deg, #1e1e2e, #4f46e5)"></div>
                    <span class="map-legend-label">High</span>
                </div>
            </div>
            
            <div class="state-info-panel" id="state-info-panel">
                <div class="state-info-placeholder">
                    <div class="state-info-placeholder-icon">🖱️</div>
                    <div data-i18n="ui.click_state">${t('ui.click_state')}</div>
                </div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">Enrollment Trend</div>
                        <div class="card-subtitle">Daily enrollment volume over time</div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="enrollment-trend-chart"></canvas>
                </div>
            </div>
            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">Top States by Enrollment</div>
                        <div class="card-subtitle">State-wise enrollment distribution</div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="state-chart"></canvas>
                </div>
            </div>
        </div>

        <div class="card fade-in" style="margin-bottom: 20px;">
            <div class="card-header">
                <div class="card-title">State Summary</div>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr>
                        <th>State</th>
                        <th>Total Enrollments</th>
                        <th>Districts</th>
                        <th>Records</th>
                    </tr></thead>
                    <tbody>
                        ${topStates.map(s => `<tr>
                            <td style="color:var(--text-primary);font-weight:500;cursor:pointer;" onclick="if(mapManager) mapManager.triggerStateClick('${s.state}')">${s.state}</td>
                            <td>${formatFullNumber(s.total_enrollments)}</td>
                            <td>${s.district_count}</td>
                            <td>${formatFullNumber(s.records)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    dashboardCharts(trend, states) {
        const trendData = (trend || []).slice(0, 30);
        const topStates = (states || []).slice(0, 10);

        if (trendData.length && document.getElementById('enrollment-trend-chart')) {
            new Chart(document.getElementById('enrollment-trend-chart'), {
                type: 'line',
                data: {
                    labels: trendData.map(t => t.date),
                    datasets: [
                        { label: 'Total', data: trendData.map(t => t.total), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 },
                        { label: 'Youth (5-17)', data: trendData.map(t => t.youth), borderColor: '#8b5cf6', backgroundColor: 'transparent', tension: 0.4 },
                        { label: 'Adults (18+)', data: trendData.map(t => t.adults), borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.4 },
                    ],
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: true, ticks: { maxTicksLimit: 10, maxRotation: 45 } } } },
            });
        }

        if (topStates.length && document.getElementById('state-chart')) {
            new Chart(document.getElementById('state-chart'), {
                type: 'bar',
                data: {
                    labels: topStates.map(s => s.state.length > 15 ? s.state.slice(0, 14) + '…' : s.state),
                    datasets: [{ label: 'Total Enrollments', data: topStates.map(s => s.total_enrollments), backgroundColor: 'rgba(99,102,241,0.6)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 6 }],
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } },
            });
        }
    },

    // ---- Fraud Detection (Module 1) ----
    async fraud() {
        const [anomalies, spikes] = await Promise.all([
            fetchAPI('/fraud/anomaly-districts'),
            fetchAPI('/fraud/geo-spikes'),
        ]);

        const districts = anomalies?.districts || [];
        const spikeData = spikes || [];

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon red">🚨</div>
                <div class="kpi-label">Anomalous Districts</div>
                <div class="kpi-value">${anomalies?.anomaly_count || 0}</div>
                <div class="kpi-change negative">Z-score > ${anomalies?.threshold || 2.5}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon orange">📍</div>
                <div class="kpi-label">Geo Spikes</div>
                <div class="kpi-value">${spikeData.length}</div>
                <div class="kpi-change negative">High-concentration pincodes</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">🔍 Enrollment Anomalies by District</div>
                        <div class="card-subtitle">Districts with enrollment Z-score > 2.5</div>
                    </div>
                </div>
                <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>Z-Score</th><th>Mean</th><th>Std Dev</th></tr></thead>
                        <tbody>${districts.slice(0, 20).map(d => `<tr>
                            <td style="color:var(--text-primary);font-weight:500">${d.district}</td>
                            <td>${d.state}</td>
                            <td><span class="${getBadgeClass(d.z_max > 4 ? 'CRITICAL' : d.z_max > 3 ? 'HIGH' : 'MEDIUM')}">${d.z_max?.toFixed(2)}</span></td>
                            <td>${d.mean?.toFixed(1)}</td>
                            <td>${d.std_dev?.toFixed(1)}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>

            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">📍 Geo-Enrollment Spikes</div>
                        <div class="card-subtitle">Top pincodes by enrollment concentration</div>
                    </div>
                </div>
                <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>Pincode</th><th>District</th><th>State</th><th>Enrollments</th><th>Severity</th></tr></thead>
                        <tbody>${spikeData.slice(0, 20).map(s => `<tr>
                            <td style="color:var(--accent-primary);font-weight:600">${s.pincode}</td>
                            <td>${s.district}</td>
                            <td>${s.state}</td>
                            <td>${formatFullNumber(s.total_enrollments)}</td>
                            <td><span class="${getBadgeClass(s.severity)}">${s.severity}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    // ---- Coverage Gap (Module 2) ----
    async coverage() {
        const [stateCov, deserts, opi] = await Promise.all([
            fetchAPI('/coverage/state-coverage'),
            fetchAPI('/coverage/digital-deserts'),
            fetchAPI('/coverage/opi-scores'),
        ]);

        const coverageData = stateCov || [];
        const desertData = deserts || [];
        const opiData = opi || [];

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon blue">🗺️</div>
                <div class="kpi-label">States Analyzed</div>
                <div class="kpi-value">${coverageData.length}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon red">🏜️</div>
                <div class="kpi-label">Digital Deserts</div>
                <div class="kpi-value">${desertData.length}</div>
                <div class="kpi-change negative">Low-enrollment pincodes</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon purple">📊</div>
                <div class="kpi-label">OPI Tracked Districts</div>
                <div class="kpi-value">${opiData.length}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">State Coverage Density</div></div>
                <div class="chart-container"><canvas id="coverage-chart"></canvas></div>
            </div>
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Top OPI Districts (Need Outreach)</div></div>
                <div class="chart-container"><canvas id="opi-chart"></canvas></div>
            </div>
        </div>

        <div class="card fade-in">
            <div class="card-header"><div class="card-title">🏜️ Digital Deserts — Lowest Enrollment Pincodes</div></div>
            <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                <table class="data-table">
                    <thead><tr><th>Pincode</th><th>District</th><th>State</th><th>Total Enrollments</th></tr></thead>
                    <tbody>${desertData.slice(0, 20).map(d => `<tr>
                        <td style="color:var(--danger);font-weight:600">${d.pincode}</td>
                        <td>${d.district}</td>
                        <td>${d.state}</td>
                        <td>${formatFullNumber(d.total_enrollments)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
    },

    coverageCharts(stateCov, opi) {
        const covData = (stateCov || []).slice(0, 15);
        const opiData = (opi || []).slice(0, 15);

        if (covData.length && document.getElementById('coverage-chart')) {
            new Chart(document.getElementById('coverage-chart'), {
                type: 'bar',
                data: {
                    labels: covData.map(s => s.state?.length > 14 ? s.state.slice(0, 13) + '…' : s.state),
                    datasets: [{ label: 'Avg per Pincode', data: covData.map(s => s.avg_per_pincode?.toFixed(0)), backgroundColor: 'rgba(59,130,246,0.6)', borderRadius: 6 }],
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' },
            });
        }

        if (opiData.length && document.getElementById('opi-chart')) {
            new Chart(document.getElementById('opi-chart'), {
                type: 'bar',
                data: {
                    labels: opiData.map(d => d.district?.length > 14 ? d.district.slice(0, 13) + '…' : d.district),
                    datasets: [{ label: 'OPI Score', data: opiData.map(d => d.opi_score), backgroundColor: 'rgba(139,92,246,0.6)', borderRadius: 6 }],
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 1 } } },
            });
        }
    },

    // ---- Biometric Updates (Module 3) ----
    async biometric() {
        const [summary, cbgi, trend] = await Promise.all([
            fetchAPI('/biometric/summary'),
            fetchAPI('/biometric/cbgi'),
            fetchAPI('/biometric/trend'),
        ]);

        const cbgiData = cbgi || [];
        const trendData = (trend || []).slice(0, 30);

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon green">🔬</div>
                <div class="kpi-label">Bio Youth (5-17)</div>
                <div class="kpi-value">${formatNumber(summary?.total_bio_5_17)}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon blue">🧬</div>
                <div class="kpi-label">Bio Adult (17+)</div>
                <div class="kpi-value">${formatNumber(summary?.total_bio_17_plus)}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon orange">📋</div>
                <div class="kpi-label">Demo Youth (5-17)</div>
                <div class="kpi-value">${formatNumber(summary?.total_demo_5_17)}</div>
            </div>
            <div class="kpi-card fade-in stagger-4">
                <div class="kpi-icon purple">📄</div>
                <div class="kpi-label">Demo Adult (17+)</div>
                <div class="kpi-value">${formatNumber(summary?.total_demo_17_plus)}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Biometric Update Trend</div></div>
                <div class="chart-container"><canvas id="bio-trend-chart"></canvas></div>
            </div>
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">CBGI Risk Distribution</div></div>
                <div class="chart-container"><canvas id="cbgi-chart"></canvas></div>
            </div>
        </div>

        <div class="card fade-in">
            <div class="card-header"><div class="card-title">⚠️ High CBGI Districts (Need Biometric Drives)</div></div>
            <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                <table class="data-table">
                    <thead><tr><th>District</th><th>State</th><th>CBGI</th><th>Risk</th><th>Bio Youth</th><th>Demo Youth</th></tr></thead>
                    <tbody>${cbgiData.slice(0, 20).map(c => `<tr>
                        <td style="color:var(--text-primary);font-weight:500">${c.district}</td>
                        <td>${c.state}</td>
                        <td><strong>${c.cbgi}%</strong></td>
                        <td><span class="${getBadgeClass(c.risk_level)}">${c.risk_level}</span></td>
                        <td>${formatFullNumber(c.bio_youth)}</td>
                        <td>${formatFullNumber(c.demo_youth)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
    },

    biometricCharts(trend, cbgi) {
        const trendData = (trend || []).slice(0, 30);
        const cbgiData = cbgi || [];

        if (trendData.length && document.getElementById('bio-trend-chart')) {
            new Chart(document.getElementById('bio-trend-chart'), {
                type: 'line',
                data: {
                    labels: trendData.map(t => t.date),
                    datasets: [
                        { label: 'Biometric', data: trendData.map(t => t.total_bio), borderColor: '#10b981', fill: true, backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4 },
                        { label: 'Demographic', data: trendData.map(t => t.total_demo), borderColor: '#6366f1', fill: false, tension: 0.4 },
                    ],
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { maxTicksLimit: 10 } } } },
            });
        }

        if (cbgiData.length && document.getElementById('cbgi-chart')) {
            const risk = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
            cbgiData.forEach(c => risk[c.risk_level] = (risk[c.risk_level] || 0) + 1);
            new Chart(document.getElementById('cbgi-chart'), {
                type: 'doughnut',
                data: {
                    labels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    datasets: [{ data: [risk.LOW, risk.MEDIUM, risk.HIGH, risk.CRITICAL], backgroundColor: ['#34d399', '#60a5fa', '#fbbf24', '#f87171'], borderWidth: 0 }],
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%' },
            });
        }
    },

    // ---- Data Quality (Module 4) ----
    async dedup() {
        const [quality, dups, incons] = await Promise.all([
            fetchAPI('/dedup/quality-score'),
            fetchAPI('/dedup/duplicate-pincodes'),
            fetchAPI('/dedup/inconsistencies'),
        ]);

        const dupsData = dups || [];
        const inconsData = incons || [];
        const qs = quality?.quality_score || 0;
        const fillColor = qs >= 97 ? 'green' : qs >= 90 ? 'orange' : 'red';

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon ${qs >= 97 ? 'green' : 'orange'}">✅</div>
                <div class="kpi-label">Data Quality Score</div>
                <div class="kpi-value">${qs}%</div>
                <div class="progress-bar" style="margin-top:8px"><div class="progress-fill ${fillColor}" style="width:${qs}%"></div></div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon blue">📊</div>
                <div class="kpi-label">Total Records</div>
                <div class="kpi-value">${formatNumber(quality?.total_records)}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon orange">⚠️</div>
                <div class="kpi-label">Cross-District Pincodes</div>
                <div class="kpi-value">${dupsData.length}</div>
            </div>
            <div class="kpi-card fade-in stagger-4">
                <div class="kpi-icon red">🔴</div>
                <div class="kpi-label">Bio/Demo Inconsistencies</div>
                <div class="kpi-value">${inconsData.length}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Cross-District Pincodes</div></div>
                <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>Pincode</th><th>Districts</th><th>Count</th><th>Records</th></tr></thead>
                        <tbody>${dupsData.slice(0, 15).map(d => `<tr>
                            <td style="color:var(--warning);font-weight:600">${d.pincode}</td>
                            <td>${d.districts?.slice(0, 3).join(', ')}${d.district_count > 3 ? ' +more' : ''}</td>
                            <td>${d.district_count}</td>
                            <td>${d.record_count}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Bio vs Demo Inconsistencies</div></div>
                <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>Bio Total</th><th>Demo Total</th><th>Deviation</th></tr></thead>
                        <tbody>${inconsData.slice(0, 15).map(i => `<tr>
                            <td style="color:var(--text-primary);font-weight:500">${i.district}</td>
                            <td>${i.state}</td>
                            <td>${formatFullNumber(i.bio_total)}</td>
                            <td>${formatFullNumber(i.demo_total)}</td>
                            <td><span class="${getBadgeClass(i.deviation_ratio > 0.5 ? 'HIGH' : 'MEDIUM')}">${(i.deviation_ratio * 100).toFixed(1)}%</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    // ---- Consent Locker (Module 6) ----
    async consent() {
        const stats = await fetchAPI('/consent/stats');
        const s = stats || {};

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon purple">🔐</div>
                <div class="kpi-label">Total Consents</div>
                <div class="kpi-value">${s.total_consents}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon green">✅</div>
                <div class="kpi-label">Active</div>
                <div class="kpi-value">${s.active}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon red">🚫</div>
                <div class="kpi-label">Revoked</div>
                <div class="kpi-value">${s.revoked}</div>
            </div>
            <div class="kpi-card fade-in stagger-4">
                <div class="kpi-icon orange">⏰</div>
                <div class="kpi-label">Expired</div>
                <div class="kpi-value">${s.expired}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Grant New Consent</div></div>
                <div class="consent-form">
                    <div class="form-group">
                        <label class="form-label">Aadhaar ID Hash</label>
                        <input class="form-input" id="consent-aadhaar" placeholder="SHA256_USER_ID" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Requester ID</label>
                        <input class="form-input" id="consent-requester" placeholder="e.g. BANK_XYZ" value="">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data Scopes</label>
                        <input class="form-input" id="consent-scopes" placeholder="name,dob,address" value="name,dob,address">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Expiry (days)</label>
                        <input class="form-input" id="consent-expiry" type="number" value="30">
                    </div>
                    <div class="form-group full-width">
                        <button class="btn btn-primary" id="consent-grant-btn" onclick="grantConsent()">🔐 Grant Consent</button>
                    </div>
                </div>
                <div id="consent-result" style="margin-top:16px"></div>
            </div>

            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Lookup History</div></div>
                <div class="form-group" style="margin-bottom:16px">
                    <input class="form-input" id="lookup-hash" placeholder="Enter Aadhaar ID Hash" value="">
                    <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="lookupConsent()">Search</button>
                </div>
                <div id="consent-history"></div>
            </div>
        </div>

        <div class="card fade-in">
            <div class="card-header"><div class="card-title">Consent Distribution</div></div>
            <div class="chart-container" style="height:250px"><canvas id="consent-chart"></canvas></div>
        </div>`;
    },

    consentCharts(stats) {
        const s = stats || {};
        if (document.getElementById('consent-chart') && s.total_consents > 0) {
            new Chart(document.getElementById('consent-chart'), {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Revoked', 'Expired'],
                    datasets: [{ data: [s.active, s.revoked, s.expired], backgroundColor: ['#10b981', '#ef4444', '#6b7280'], borderWidth: 0 }],
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%' },
            });
        }
    },

    // ---- Migration Intelligence (Module 7) ----
    async migration() {
        const [stateFlow, districtMigration] = await Promise.all([
            fetchAPI('/migration/state-flow'),
            fetchAPI('/migration/district-migration'),
        ]);

        const stateData = stateFlow || [];
        const districtData = districtMigration || [];

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon purple">🌍</div>
                <div class="kpi-label">States Tracked</div>
                <div class="kpi-value">${stateData.length}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon red">🚨</div>
                <div class="kpi-label">High Inflow States</div>
                <div class="kpi-value">${stateData.filter(s => s.flow_indicator === 'HIGH_INFLOW').length}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon orange">📈</div>
                <div class="kpi-label">Surge Districts</div>
                <div class="kpi-value">${districtData.filter(d => d.surge_flag).length}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">State Flow Analysis</div></div>
                <div class="chart-container"><canvas id="migration-chart"></canvas></div>
            </div>
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Top Migration Index Districts</div></div>
                <div class="data-table-wrapper" style="max-height:380px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>Migration Index</th><th>Avg Daily</th><th>Surge</th></tr></thead>
                        <tbody>${districtData.slice(0, 20).map(d => `<tr>
                            <td style="color:var(--text-primary);font-weight:500">${d.district}</td>
                            <td>${d.state}</td>
                            <td><strong>${d.migration_index}</strong></td>
                            <td>${d.avg_daily}</td>
                            <td>${d.surge_flag ? '<span class="badge badge-critical">SURGE</span>' : '<span class="badge badge-low">Normal</span>'}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    migrationCharts(stateFlow) {
        const data = (stateFlow || []).slice(0, 12);
        if (data.length && document.getElementById('migration-chart')) {
            new Chart(document.getElementById('migration-chart'), {
                type: 'bar',
                data: {
                    labels: data.map(s => s.state?.length > 12 ? s.state.slice(0, 11) + '…' : s.state),
                    datasets: [{ label: 'Volatility Index', data: data.map(s => s.volatility), backgroundColor: data.map(s => s.flow_indicator === 'HIGH_INFLOW' ? 'rgba(239,68,68,0.6)' : s.flow_indicator === 'MODERATE_INFLOW' ? 'rgba(245,158,11,0.6)' : 'rgba(59,130,246,0.6)'), borderRadius: 6 }],
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' },
            });
        }
    },

    // ---- Demand Forecasting (Module 8) ----
    async forecast() {
        const [demand, resources] = await Promise.all([
            fetchAPI('/forecast/demand-by-state'),
            fetchAPI('/forecast/resource-plan'),
        ]);

        const demandData = demand || [];
        const resourceData = resources || [];

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon purple">📈</div>
                <div class="kpi-label">States Forecasted</div>
                <div class="kpi-value">${demandData.length}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon green">👥</div>
                <div class="kpi-label">Total Staff Needed</div>
                <div class="kpi-value">${formatNumber(resourceData.reduce((s, r) => s + (r.required_staff || 0), 0))}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon blue">🖥️</div>
                <div class="kpi-label">Devices Needed</div>
                <div class="kpi-value">${formatNumber(resourceData.reduce((s, r) => s + (r.required_devices || 0), 0))}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">State Demand Projection</div></div>
                <div class="chart-container"><canvas id="demand-chart"></canvas></div>
            </div>
            <div class="card fade-in">
                <div class="card-header"><div class="card-title">Resource Plan — Top Districts</div></div>
                <div class="data-table-wrapper" style="max-height:380px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>Avg Daily</th><th>Monthly</th><th>Staff</th><th>Devices</th></tr></thead>
                        <tbody>${resourceData.slice(0, 20).map(r => `<tr>
                            <td style="color:var(--text-primary);font-weight:500">${r.district}</td>
                            <td>${r.state}</td>
                            <td>${r.avg_daily_load}</td>
                            <td>${formatFullNumber(r.monthly_projected)}</td>
                            <td><strong>${r.required_staff}</strong></td>
                            <td><strong>${r.required_devices}</strong></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    forecastCharts(demand) {
        const data = (demand || []).slice(0, 10);
        if (data.length && document.getElementById('demand-chart')) {
            new Chart(document.getElementById('demand-chart'), {
                type: 'bar',
                data: {
                    labels: data.map(d => d.state?.length > 14 ? d.state.slice(0, 13) + '…' : d.state),
                    datasets: [
                        { label: 'Monthly Projected', data: data.map(d => d.projected_monthly), backgroundColor: 'rgba(99,102,241,0.6)', borderRadius: 6 },
                        { label: 'Quarterly', data: data.map(d => d.projected_quarterly), backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: 6 },
                    ],
                },
                options: { responsive: true, maintainAspectRatio: false },
            });
        }
    },

    // ---- Advanced Analytics (Modules 9-11) ----
    async analytics() {
        const [national, enrollAnom, bioAnom, dataSrc] = await Promise.all([
            fetchAPI('/analytics/multilevel/national'),
            fetchAPI('/analytics/anomalies/enrollment'),
            fetchAPI('/analytics/anomalies/biometric'),
            fetchAPI('/analytics/data-sources'),
        ]);

        const enrollAnomData = enrollAnom?.anomalies || [];
        const bioAnomData = bioAnom?.anomalies || [];
        const sources = dataSrc || [];
        const nat = national || {};

        return `
        <h2 class="section-title"><span class="dot"></span> Module 10: National Overview</h2>
        <div class="kpi-grid" style="margin-bottom:28px">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon purple">🇮🇳</div>
                <div class="kpi-label">Total Enrollments</div>
                <div class="kpi-value">${formatNumber(nat.enrollment?.total_enrollments)}</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon green">🗺️</div>
                <div class="kpi-label">States</div>
                <div class="kpi-value">${nat.enrollment?.state_count || 0}</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon blue">🏘️</div>
                <div class="kpi-label">Districts</div>
                <div class="kpi-value">${nat.enrollment?.district_count || 0}</div>
            </div>
            <div class="kpi-card fade-in stagger-4">
                <div class="kpi-icon orange">📍</div>
                <div class="kpi-label">Pincodes</div>
                <div class="kpi-value">${formatNumber(nat.enrollment?.pincode_count)}</div>
            </div>
        </div>

        <h2 class="section-title"><span class="dot" style="background:var(--danger)"></span> Module 9: Anomaly Detection</h2>
        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header">
                    <div class="card-title">Enrollment Anomalies (${enrollAnom?.anomaly_count || 0})</div>
                </div>
                <div class="data-table-wrapper" style="max-height:350px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>CV</th><th>Severity</th></tr></thead>
                        <tbody>${enrollAnomData.slice(0, 15).map(a => `<tr>
                            <td style="font-weight:500">${a.district}</td>
                            <td>${a.state}</td>
                            <td>${a.coefficient_of_variation}</td>
                            <td><span class="${getBadgeClass(a.severity)}">${a.severity}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
            <div class="card fade-in">
                <div class="card-header">
                    <div class="card-title">Biometric Anomalies (${bioAnom?.anomaly_count || 0})</div>
                </div>
                <div class="data-table-wrapper" style="max-height:350px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr><th>District</th><th>State</th><th>CV</th><th>Severity</th></tr></thead>
                        <tbody>${bioAnomData.slice(0, 15).map(a => `<tr>
                            <td style="font-weight:500">${a.district}</td>
                            <td>${a.state}</td>
                            <td>${a.cv}</td>
                            <td><span class="${getBadgeClass(a.severity)}">${a.severity}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <h2 class="section-title" style="margin-top:28px"><span class="dot" style="background:var(--info)"></span> Module 11: Data Sources</h2>
        <div class="card fade-in">
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Source</th><th>Status</th><th>Records</th></tr></thead>
                    <tbody>${sources.map(s => `<tr>
                        <td style="color:var(--text-primary);font-weight:500">${s.source || s.source_name}</td>
                        <td><span class="badge badge-active">${s.status}</span></td>
                        <td>${formatFullNumber(s.records || s.record_count)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
    },

    // ---- RFID Scanner (Merged from rfid-project) ----
    async rfid() {
        // Initialize RFID polling state
        window._rfidState = {
            previousUID: '',
            serverOnline: false,
            errorStreak: 0,
            scanCount: 0,
            scanHistory: [],
            scanTimestamps: [],
        };

        return `
        <div class="kpi-grid">
            <div class="kpi-card fade-in stagger-1">
                <div class="kpi-icon teal">📡</div>
                <div class="kpi-label">Scanner Status</div>
                <div class="kpi-value" style="font-size:1.4rem">
                    <span class="rfid-status-indicator" id="rfid-status-dot"></span>
                    <span id="rfid-status-label">Connecting…</span>
                </div>
                <div class="kpi-change" id="rfid-server-url">Polling localhost:3000</div>
            </div>
            <div class="kpi-card fade-in stagger-2">
                <div class="kpi-icon purple">🔢</div>
                <div class="kpi-label">Total Scans</div>
                <div class="kpi-value" id="rfid-scan-count">0</div>
                <div class="kpi-change positive">Lifetime count</div>
            </div>
            <div class="kpi-card fade-in stagger-3">
                <div class="kpi-icon blue">🕐</div>
                <div class="kpi-label">Last Scan Time</div>
                <div class="kpi-value" style="font-size:1.2rem" id="rfid-last-time">—</div>
                <div class="kpi-change">Most recent event</div>
            </div>
            <div class="kpi-card fade-in stagger-4">
                <div class="kpi-icon green">⚡</div>
                <div class="kpi-label">Scan Rate</div>
                <div class="kpi-value" id="rfid-scan-rate">0/min</div>
                <div class="kpi-change">Last 60 seconds</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">📡 Live RFID Card Reader</div>
                        <div class="card-subtitle">Real-time UID from MFRC522 module</div>
                    </div>
                    <div class="rfid-live-badge" id="rfid-live-badge">● LIVE</div>
                </div>
                <div class="rfid-uid-display" id="rfid-uid-container">
                    <div class="rfid-uid-label">Card UID</div>
                    <div class="rfid-uid-value" id="rfid-uid-value">Waiting…</div>
                    <div class="rfid-uid-sublabel" id="rfid-uid-sublabel">Present an RFID card to the reader</div>
                </div>
            </div>

            <div class="card fade-in">
                <div class="card-header">
                    <div>
                        <div class="card-title">📊 Scan Frequency</div>
                        <div class="card-subtitle">Per-second scan timeline</div>
                    </div>
                </div>
                <div class="chart-container"><canvas id="rfid-frequency-chart"></canvas></div>
            </div>
        </div>

        <div class="card fade-in" style="margin-top:16px">
            <div class="card-header">
                <div class="card-title">🗂️ Scan History Log</div>
            </div>
            <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
                <table class="data-table">
                    <thead><tr><th>#</th><th>Card UID</th><th>Timestamp</th><th>Status</th></tr></thead>
                    <tbody id="rfid-history-body">
                        <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">No scans yet — present a card to the reader</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },
};

// ============================================
// Consent helper functions (global scope for onclick)
// ============================================

async function grantConsent() {
    const aadhaar = document.getElementById('consent-aadhaar')?.value;
    const requester = document.getElementById('consent-requester')?.value;
    const scopes = document.getElementById('consent-scopes')?.value?.split(',').map(s => s.trim());
    const expiry = parseInt(document.getElementById('consent-expiry')?.value || '30');

    const resultDiv = document.getElementById('consent-result');
    try {
        const res = await fetch(`${API_BASE}/consent/grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aadhaar_id_hash: aadhaar, requester_id: requester, data_scope: scopes, expires_in_days: expiry }),
        });
        const data = await res.json();
        resultDiv.innerHTML = `<div class="badge badge-active" style="padding:8px 16px;font-size:0.85rem">✅ Consent granted: ${data.consent_id}</div>`;
    } catch (err) {
        resultDiv.innerHTML = `<div class="badge badge-critical" style="padding:8px 16px">❌ Error: ${err.message}</div>`;
    }
}

async function lookupConsent() {
    const hash = document.getElementById('lookup-hash')?.value;
    const container = document.getElementById('consent-history');
    if (!hash) return;

    const records = await fetchAPI(`/consent/history/${hash}`);
    if (!records || records.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No consent records found</p></div>';
        return;
    }

    container.innerHTML = `<table class="data-table"><thead><tr><th>Requester</th><th>Scope</th><th>Status</th><th>Granted</th></tr></thead>
        <tbody>${records.map(r => `<tr>
            <td>${r.requester_id}</td>
            <td>${(r.data_scope || []).join(', ')}</td>
            <td><span class="badge badge-${r.status?.toLowerCase()}">${r.status}</span></td>
            <td>${r.granted_at}</td>
        </tr>`).join('')}</tbody></table>`;
}

// ============================================
// Navigation & Page Router
// ============================================

const pageTitles = {
    dashboard: 'Operations Dashboard',
    fraud: 'Fraud Detection & Anomaly Intelligence',
    coverage: 'Coverage Gap & Digital Desert Mapping',
    biometric: 'Biometric Update Prediction',
    dedup: 'Data Quality & Duplicate Detection',
    consent: 'Consent Locker System',
    migration: 'Migration & Demand Intelligence',
    forecast: 'Demand Forecasting & Resources',
    analytics: 'Advanced Analytics',
    rfid: 'RFID Card Scanner',
};

// Cache fetched data for chart rendering
let cachedData = {};

async function navigateTo(page) {
    const container = document.getElementById('page-container');
    const title = document.getElementById('page-title');

    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    title.textContent = (window.i18n && window.i18n.t(`page.${page}`) !== `page.${page}`) ? window.i18n.t(`page.${page}`) : (pageTitles[page] || page);
    title.setAttribute('data-i18n', `page.${page}`);

    // Show loading with translated text
    const _lt = (window.i18n) ? window.i18n.t('ui.loading') : 'Loading real-time data...';
    container.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p data-i18n="ui.loading">${_lt}</p></div>`;

    destroyCharts();

    // Render page
    if (pages[page]) {
        const html = await pages[page]();
        container.innerHTML = html;

        // Render charts after DOM is ready
        requestAnimationFrame(() => {
            switch (page) {
                case 'dashboard':
                    Promise.all([fetchAPI('/dashboard/enrollment-trend'), fetchAPI('/dashboard/state-summary')])
                        .then(([trend, states]) => {
                            pages.dashboardCharts(trend, states);
                            if (window.mapManager) mapManager.renderMap('india-map-container');
                        });
                    break;
                case 'coverage':
                    Promise.all([fetchAPI('/coverage/state-coverage'), fetchAPI('/coverage/opi-scores')])
                        .then(([cov, opi]) => pages.coverageCharts(cov, opi));
                    break;
                case 'biometric':
                    Promise.all([fetchAPI('/biometric/trend'), fetchAPI('/biometric/cbgi')])
                        .then(([trend, cbgi]) => pages.biometricCharts(trend, cbgi));
                    break;
                case 'consent':
                    fetchAPI('/consent/stats').then(s => pages.consentCharts(s));
                    break;
                case 'migration':
                    fetchAPI('/migration/state-flow').then(f => pages.migrationCharts(f));
                    break;
                case 'forecast':
                    fetchAPI('/forecast/demand-by-state').then(d => pages.forecastCharts(d));
                    break;
                case 'rfid':
                    initRFIDPolling();
                    break;
            }
        });
    }
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // ---- Theme Manager ----
    ThemeManager.init();

    // ---- Landing Page ----
    LandingPage.init();

    // ---- Language Switcher Setup ----
    initLanguageSwitcher();

    // ---- Nav link clicks ----
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
            // Close mobile sidebar on nav click
            document.getElementById('sidebar')?.classList.remove('open');
        });
    });

    // Mobile menu toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Close sidebar on overlay click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && e.target.id !== 'menu-toggle') {
            sidebar.classList.remove('open');
        }
    });

    // Time display
    function updateTime() {
        const now = new Date();
        document.getElementById('time-display').textContent = now.toLocaleString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        });
    }
    updateTime();
    setInterval(updateTime, 1000);

    // Check API health and show mode
    fetchAPI('/health').then(data => {
        const badge = document.getElementById('api-status');
        if (data?.status === 'ok') {
            badge.classList.add('connected');
            const mode = data.mode === 'mock' ? '🔶 Mock Data' : '✅ Live Data';
            badge.querySelector('span:last-child').textContent = `API Online — ${mode}`;
            badge.title = data.mode === 'mock'
                ? 'Backend running but MongoDB not connected. Set MONGODB_URI in .env for live data.'
                : 'Connected to MongoDB Atlas with live data.';
        } else {
            badge.classList.add('error');
            badge.querySelector('span:last-child').textContent = '⚠️ Backend Offline';
            badge.title = 'Backend not detected';
        }
    });

    // Apply saved language
    if (window.i18n) {
        window.i18n.setLanguage(window.i18n.currentLang);
    }

    // Start on dashboard
    navigateTo('dashboard');
});

// ============================================
// Language Switcher
// ============================================
function initLanguageSwitcher() {
    const btn = document.getElementById('lang-btn');
    const dropdown = document.getElementById('lang-dropdown');
    const currentName = document.getElementById('lang-current-name');
    if (!btn || !dropdown) return;

    // Populate dropdown
    dropdown.innerHTML = I18N_LANGUAGES.map(lang => `
        <button class="lang-option ${lang.code === window.i18n.currentLang ? 'active' : ''}" data-lang="${lang.code}">
            <span>
                <span class="lang-option-name">${lang.nativeName}</span>
                <span class="lang-option-native"> · ${lang.name}</span>
            </span>
            <svg class="lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
        </button>
    `).join('');

    // Set initial display
    const currentLang = window.i18n.getCurrentLanguage();
    currentName.textContent = currentLang.nativeName;

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Language selection
    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.lang-option');
        if (!option) return;
        const langCode = option.dataset.lang;

        // Update i18n
        window.i18n.setLanguage(langCode);

        // Update UI
        const lang = I18N_LANGUAGES.find(l => l.code === langCode);
        currentName.textContent = lang.nativeName;
        dropdown.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        dropdown.classList.remove('open');

        // Show toast
        showToast(`Language changed to ${lang.nativeName}`, 'info');
    });
}

// ============================================
// Toast Notification System
// ============================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: '💡' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '💡'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Make globally accessible
window.showToast = showToast;

// ============================================
// RFID Scanner — Polling Engine & UI Updates
// ============================================
const RFID_SERVER = 'http://localhost:3000';
let _rfidPollInterval = null;
let _rfidChartInstance = null;
let _rfidChartLabels = [];
let _rfidChartData = [];

function initRFIDPolling() {
    // Clear any previous interval
    if (_rfidPollInterval) clearInterval(_rfidPollInterval);
    if (_rfidChartInstance) { _rfidChartInstance.destroy(); _rfidChartInstance = null; }

    _rfidChartLabels = [];
    _rfidChartData = [];

    // Initialize the frequency chart
    const ctx = document.getElementById('rfid-frequency-chart');
    if (ctx) {
        _rfidChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: _rfidChartLabels,
                datasets: [{
                    label: 'Scans',
                    data: _rfidChartData,
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.12)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#14b8a6',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true, ticks: { maxTicksLimit: 15, maxRotation: 45 } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                },
                plugins: { legend: { display: false } },
                animation: { duration: 300 },
            },
        });
    }

    // Start polling
    rfidPoll();
    _rfidPollInterval = setInterval(rfidPoll, 1000);

    // Stop polling when navigating away
    const origNav = window._origNavigateTo || navigateTo;
    if (!window._rfidNavPatched) {
        window._rfidNavPatched = true;
        const realNav = navigateTo;
        // We can't override navigateTo directly, so we use a MutationObserver
        // to detect when the RFID page is no longer visible
        const observer = new MutationObserver(() => {
            if (!document.getElementById('rfid-uid-value')) {
                if (_rfidPollInterval) { clearInterval(_rfidPollInterval); _rfidPollInterval = null; }
                if (_rfidChartInstance) { _rfidChartInstance.destroy(); _rfidChartInstance = null; }
                observer.disconnect();
                window._rfidNavPatched = false;
            }
        });
        const pageContainer = document.getElementById('page-container');
        if (pageContainer) observer.observe(pageContainer, { childList: true });
    }

    // Socket.IO real-time listener (instant push, supplements polling)
    if (typeof io !== 'undefined' && !window._rfidSocket) {
        try {
            window._rfidSocket = io(RFID_SERVER, { transports: ['websocket', 'polling'] });
            window._rfidSocket.on('rfid-data', (payload) => {
                const state = window._rfidState;
                if (!state || !document.getElementById('rfid-uid-value')) return;

                const uid = typeof payload === 'string' ? payload : payload?.uid;
                if (!uid) return;

                console.log('📡 Socket.IO push:', uid);

                // Update state immediately (don't wait for next poll)
                latestUID = uid;
                state.scanCount++;
                state.previousUID = uid;
                state.scanTimestamps.push(Date.now());

                // Update UI
                const uidEl = document.getElementById('rfid-uid-value');
                const sublabel = document.getElementById('rfid-uid-sublabel');
                const container = document.getElementById('rfid-uid-container');
                if (uidEl) { uidEl.textContent = uid; uidEl.classList.remove('waiting'); }
                if (sublabel) sublabel.textContent = 'Card detected ✅';
                if (container) {
                    container.classList.add('rfid-flash', 'rfid-scanned');
                    setTimeout(() => container.classList.remove('rfid-flash'), 600);
                    setTimeout(() => container.classList.remove('rfid-scanned'), 4000);
                }

                // Add to history
                const time = payload?.time || new Date().toISOString();
                state.scanHistory.unshift({ uid, time });
                if (state.scanHistory.length > 100) state.scanHistory.pop();
                updateRFIDHistory();

                // Update count
                const countEl = document.getElementById('rfid-scan-count');
                if (countEl) countEl.textContent = payload?.scanCount ?? state.scanCount;
            });
            window._rfidSocket.on('connect', () => console.log('🔌 Socket.IO connected to RFID server'));
            window._rfidSocket.on('disconnect', () => console.log('⚡ Socket.IO disconnected from RFID server'));
        } catch (e) {
            console.warn('Socket.IO not available, using polling only:', e.message);
        }
    }
}

async function rfidPoll() {
    const state = window._rfidState;
    if (!state) return;

    // Check if we're still on the RFID page
    if (!document.getElementById('rfid-uid-value')) {
        if (_rfidPollInterval) { clearInterval(_rfidPollInterval); _rfidPollInterval = null; }
        return;
    }

    try {
        const res = await fetch(`${RFID_SERVER}/api/latest`);
        const data = await res.json();

        state.errorStreak = 0;

        // Update status
        if (!state.serverOnline) {
            state.serverOnline = true;
            const dot = document.getElementById('rfid-status-dot');
            const label = document.getElementById('rfid-status-label');
            const badge = document.getElementById('rfid-live-badge');
            if (dot) dot.classList.add('online');
            if (label) label.textContent = data.arduinoConnected ? 'Connected' : 'Server OK · Arduino disconnected';
            if (badge) badge.classList.add('active');
        }

        // Update Arduino-specific status
        const statusLabel = document.getElementById('rfid-status-label');
        if (statusLabel && state.serverOnline) {
            statusLabel.textContent = data.arduinoConnected
                ? 'Connected'
                : 'Server OK · Waiting for Arduino…';
        }
        const urlLabel = document.getElementById('rfid-server-url');
        if (urlLabel) {
            urlLabel.textContent = data.arduinoConnected
                ? `Arduino on ${data.port || 'Serial'} @ ${RFID_SERVER}`
                : `Polling ${RFID_SERVER} · No Arduino`;
        }

        // Update UID
        const uidEl = document.getElementById('rfid-uid-value');
        const container = document.getElementById('rfid-uid-container');
        const sublabel = document.getElementById('rfid-uid-sublabel');

        if (data.uid) {
            uidEl.textContent = data.uid;
            uidEl.classList.remove('waiting');
            if (sublabel) sublabel.textContent = 'Card detected ✅';

            // Flash on new card
            if (data.uid !== state.previousUID) {
                state.previousUID = data.uid;
                if (container) {
                    container.classList.add('rfid-flash', 'rfid-scanned');
                    setTimeout(() => container.classList.remove('rfid-flash'), 600);
                    setTimeout(() => container.classList.remove('rfid-scanned'), 4000);
                }

                // Add to history
                state.scanHistory.unshift({
                    uid: data.uid,
                    time: data.time || new Date().toISOString(),
                });
                if (state.scanHistory.length > 100) state.scanHistory.pop();
                updateRFIDHistory();

                // Track timestamp for rate calc
                state.scanTimestamps.push(Date.now());
            }
        } else {
            uidEl.textContent = 'Waiting…';
            uidEl.classList.add('waiting');
            if (sublabel) sublabel.textContent = 'Present an RFID card to the reader';
        }

        // Update scan count
        const count = data.scanCount ?? state.scanHistory.length;
        state.scanCount = count;
        const countEl = document.getElementById('rfid-scan-count');
        if (countEl) countEl.textContent = count;

        // Update timestamp
        const timeEl = document.getElementById('rfid-last-time');
        if (timeEl && data.time) {
            const d = new Date(data.time);
            timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }

        // Update scan rate (scans in last 60s)
        const now = Date.now();
        state.scanTimestamps = state.scanTimestamps.filter(t => now - t < 60000);
        const rateEl = document.getElementById('rfid-scan-rate');
        if (rateEl) rateEl.textContent = `${state.scanTimestamps.length}/min`;

        // Update chart data
        updateRFIDChart(state.scanCount);

    } catch (_err) {
        state.errorStreak++;
        if (state.errorStreak >= 3) {
            state.serverOnline = false;
            const dot = document.getElementById('rfid-status-dot');
            const label = document.getElementById('rfid-status-label');
            const badge = document.getElementById('rfid-live-badge');
            if (dot) dot.classList.remove('online');
            if (label) label.textContent = 'Server offline — retrying…';
            if (badge) badge.classList.remove('active');
        }
    }
}

function updateRFIDHistory() {
    const state = window._rfidState;
    const tbody = document.getElementById('rfid-history-body');
    if (!tbody || !state) return;

    tbody.innerHTML = state.scanHistory.slice(0, 50).map((s, i) => {
        const d = new Date(s.time);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            + '  ' + d.toLocaleDateString([], { day: 'numeric', month: 'short' });
        return `<tr class="${i === 0 ? 'rfid-new-row' : ''}">
            <td style="color:var(--text-muted)">${state.scanHistory.length - i}</td>
            <td style="color:var(--accent-light);font-weight:700;font-family:var(--font-mono);letter-spacing:0.05em">${s.uid}</td>
            <td>${timeStr}</td>
            <td><span class="badge badge-active">Scanned</span></td>
        </tr>`;
    }).join('');
}

function updateRFIDChart(totalScans) {
    if (!_rfidChartInstance) return;
    const now = new Date();
    const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    _rfidChartLabels.push(label);
    _rfidChartData.push(totalScans);

    // Keep last 30 data points
    if (_rfidChartLabels.length > 30) {
        _rfidChartLabels.shift();
        _rfidChartData.shift();
    }

    _rfidChartInstance.update('none');
}

// ============================================
// IntersectionObserver for scroll reveals
// ============================================
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
        observer.observe(el);
    });
}

window.initScrollReveal = initScrollReveal;

// ============================================
// India Map Manager — HIGH PERFORMANCE
// Uses simplified GeoJSON (~700KB instead of 23MB)
// O(1) state lookup, precomputed colors, no transitions on click
// ============================================

let _cachedGeoData = null;

class IndiaMapManager {
    constructor() {
        this.currentMetric = 'enrollment';
        this.selectedState = null;
        this.svg = null;
        this.projection = null;
        this.pathGenerator = null;
        this.paths = null;
        this.wrapper = null;
        // Precompute color cache per metric (avoids recalculating on every render)
        this._colorCache = {};
    }

    async renderMap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        console.log("[Map] Initializing high-performance map...");
        
        container.style.height = '500px'; 
        container.style.width = '100%';
        container.innerHTML = '<div id="d3-map-wrapper" style="width:100%; height:100%; position:relative;"></div>';
        this.wrapper = document.getElementById('d3-map-wrapper');
        
        // Tooltip singleton
        if (!document.getElementById('d3-map-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'd3-map-tooltip';
            tooltip.className = 'map-tooltip';
            tooltip.style.cssText = 'position:fixed; display:none; background:rgba(10, 10, 18, 0.95); border:1px solid var(--accent-border); border-radius:12px; padding:16px; pointer-events:none; z-index:1000; color:#fff; font-family:var(--font); box-shadow:var(--shadow-lg); backdrop-filter:blur(10px); min-width:180px;';
            document.body.appendChild(tooltip);
        }

        await this.ensureDataLoaded();
        this.precomputeColors();
        this.setupMapBase();
        this.bindEvents();
        this.updateLegend();
        
        console.log("[Map] Render complete.");
    }

    async ensureDataLoaded() {
        if (_cachedGeoData) {
            console.log("[Map] Using cached GeoJSON");
            return;
        }

        console.log("[Map] Loading GeoJSON...");
        const start = performance.now();
        try {
            // Use pre-loaded global (works with file:// protocol)
            // Falls back to fetch if global not available
            let data;
            if (window._INDIA_GEOJSON) {
                data = window._INDIA_GEOJSON;
                console.log("[Map] Using pre-loaded GeoJSON global");
            } else {
                console.log("[Map] Fetching GeoJSON via network...");
                const response = await fetch('india_simplified.geojson');
                data = await response.json();
            }
            
            // PRE-NORMALIZE ALL FEATURES ONCE
            data.features.forEach(f => {
                const rawName = f.properties.NAME_1 || f.properties.st_nm || f.properties.name || f.properties.State || "Unknown";
                f.properties.normalizedName = window.normalizeStateName(rawName);
            });
            
            _cachedGeoData = data;
            const end = performance.now();
            console.log(`[Map] GeoJSON loaded and normalized in ${(end - start).toFixed(0)}ms — ${data.features.length} features`);
            
            // Debug: log all normalized name → data matches
            const misses = [];
            data.features.forEach(f => {
                const norm = f.properties.normalizedName;
                if (!window.INDIA_STATE_DATA[norm]) {
                    misses.push(`${f.properties.NAME_1} → "${norm}" (NO DATA)`);
                }
            });
            if (misses.length > 0) {
                console.warn("[Map] Name mismatches:", misses);
            } else {
                console.log("[Map] ✅ All GeoJSON states matched to mock data");
            }
        } catch(err) {
            console.error("[Map] Data load failed:", err);
            this.wrapper.innerHTML = '<div style="padding:40px;text-align:center;color:var(--danger)">Failed to load India Map data. Check console.</div>';
        }
    }

    // Precompute color for all states for current metric (avoids per-path calculation)
    precomputeColors() {
        const metrics = ['enrollment', 'coverage', 'fraud', 'cbgi', 'migration'];
        this._colorCache = {};
        metrics.forEach(metric => {
            this._colorCache[metric] = {};
            for (const [name] of Object.entries(window.INDIA_STATE_DATA)) {
                this._colorCache[metric][name] = window.getStateColor(name, metric, null);
            }
        });
    }

    setupMapBase() {
        const width = this.wrapper.clientWidth || 800;
        const height = this.wrapper.clientHeight || 500;
        console.log(`[Map] Container dimensions: ${width}x${height}`);

        this.svg = d3.select(this.wrapper)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
            
        this.projection = d3.geoMercator().fitSize([width, height], _cachedGeoData);
        this.pathGenerator = d3.geoPath().projection(this.projection);

        this.g = this.svg.append("g");

        const self = this;
        this.paths = this.g.selectAll("path")
            .data(_cachedGeoData.features)
            .enter()
            .append("path")
            .attr("d", this.pathGenerator)
            .attr("class", "state-path")
            .attr("data-state", d => d.properties.normalizedName)
            .attr("stroke", "rgba(255,255,255,0.15)")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function(e, d) { self.handleMouseOver(e, d, this); })
            .on("mousemove", (e) => this.handleMouseMove(e))
            .on("mouseout", function(e, d) { self.handleMouseOut(e, d, this); })
            .on("click", (e, d) => this.handleStateSelection(d.properties.normalizedName));

        this.applyColors();
    }

    bindEvents() {
        document.querySelectorAll('.map-metric-tab').forEach(tab => {
            tab.onclick = (e) => {
                document.querySelectorAll('.map-metric-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMetric = e.target.getAttribute('data-metric');
                this.applyColors();
                this.updateLegend();
                if (this.selectedState) this.updateStatePanel();
            };
        });
    }

    handleStateSelection(stateName) {
        const start = performance.now();
        console.log(`[Map] Click → "${stateName}"`);
        
        // O(1) lookup
        const lookupResult = window.INDIA_STATE_DATA[stateName];
        console.log(`[Map] Lookup: ${lookupResult ? 'HIT ✅' : 'MISS ❌'}`);

        // Toggle
        this.selectedState = this.selectedState === stateName ? null : stateName;

        // INSTANT visual feedback — no transitions, just direct attr set
        this.paths
            .attr("stroke", d => d.properties.normalizedName === this.selectedState ? '#8b5cf6' : 'rgba(255,255,255,0.15)')
            .attr("stroke-width", d => d.properties.normalizedName === this.selectedState ? 2.5 : 0.5)
            .attr("fill", d => {
                if (d.properties.normalizedName === this.selectedState) return '#8b5cf6';
                const cache = this._colorCache[this.currentMetric];
                return (cache && cache[d.properties.normalizedName]) || '#1e1e2e';
            });

        // Update panel from precomputed data (O(1))
        this.updateStatePanel();
        
        // Highlight matching table rows
        this.syncDashboardHighlight();

        const end = performance.now();
        console.log(`[Map] Click processed in ${(end - start).toFixed(1)}ms`);
    }

    syncDashboardHighlight() {
        document.querySelectorAll('.data-table tbody tr').forEach(tr => {
            const cell = tr.querySelector('td:first-child');
            if (!cell) return;
            const rowState = cell.textContent.trim();
            if (this.selectedState && (rowState === this.selectedState)) {
                tr.classList.add('row-highlight');
                tr.style.background = 'rgba(99,102,241,0.1)';
            } else {
                tr.classList.remove('row-highlight');
                tr.style.background = '';
            }
        });
    }

    triggerStateClick(stateName) {
        const norm = window.normalizeStateName(stateName);
        this.handleStateSelection(norm);
    }

    // Apply colors WITHOUT transitions for instant response
    applyColors() {
        const metric = this.currentMetric;
        const cache = this._colorCache[metric] || {};
        const selected = this.selectedState;
        this.paths.attr("fill", d => {
            if (d.properties.normalizedName === selected) return '#8b5cf6';
            return cache[d.properties.normalizedName] || '#1e1e2e';
        });
    }

    handleMouseOver(event, d, pathElement) {
        const stateName = d.properties.normalizedName;
        const tt = document.getElementById('d3-map-tooltip');
        const data = window.INDIA_STATE_DATA[stateName];
        
        // Hover highlight via stroke only — no fill change to avoid repaint
        d3.select(pathElement)
            .attr("stroke", "#a78bfa")
            .attr("stroke-width", 2);
        
        let html = `<div style="font-weight:800;font-size:1.1rem;margin-bottom:8px;color:var(--accent-light)">${stateName}</div>`;
        if (data) {
            html += `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem">
                    <div style="color:var(--text-muted)">Enrollment:</div><div style="font-weight:600">${formatNumber(data.enrollment)}</div>
                    <div style="color:var(--text-muted)">Coverage:</div><div style="font-weight:600">${(data.coverage * 100).toFixed(1)}%</div>
                    <div style="color:var(--text-muted)">Bio Risk:</div><div style="font-weight:600;color:${data.cbgi > 30 ? 'var(--danger)' : 'var(--success)'}">${data.cbgi}</div>
                </div>`;
        } else {
            html += `<div style="color:var(--text-muted);font-style:italic">No data available</div>`;
        }
        
        tt.innerHTML = html;
        tt.style.display = 'block';
        tt.style.left = (event.clientX + 20) + 'px';
        tt.style.top = (event.clientY + 20) + 'px';
    }

    handleMouseMove(event) {
        const tt = document.getElementById('d3-map-tooltip');
        tt.style.left = (event.clientX + 20) + 'px';
        tt.style.top = (event.clientY + 20) + 'px';
    }

    handleMouseOut(event, d, pathElement) {
        document.getElementById('d3-map-tooltip').style.display = 'none';
        const isSelected = d.properties.normalizedName === this.selectedState;
        d3.select(pathElement)
            .attr("stroke", isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.15)')
            .attr("stroke-width", isSelected ? 2.5 : 0.5);
    }

    updateLegend() {
        const legend = document.getElementById('map-legend-gradient');
        if (!legend) return;
        const colorMap = {
            enrollment: ['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 1)'],
            coverage: ['rgba(245, 158, 11, 0.4)', 'rgba(16, 185, 129, 1)'],
            fraud: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 1)'],
            cbgi: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 1)'],
            migration: ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 1)'],
        };
        const colors = colorMap[this.currentMetric] || ['#1e1e2e', '#4f46e5'];
        legend.style.background = `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`;
    }

    updateStatePanel() {
        const panel = document.getElementById('state-info-panel');
        if (!panel) return;
        
        if (!this.selectedState) {
            panel.innerHTML = `
                <div class="state-info-placeholder">
                    <div class="state-info-placeholder-icon">🖱️</div>
                    <div>Click a state on the map to unlock deep predictive analytics</div>
                </div>`;
            return;
        }

        const data = window.INDIA_STATE_DATA[this.selectedState];
        if (!data) {
            panel.innerHTML = `<div class="card" style="border-color:var(--danger-border)"><div class="card-title">${this.selectedState}</div><p style="color:var(--text-muted)">No data available for this region.</p></div>`;
            return;
        }

        // O(1) lookup from precomputed cache — NO generateMockResponse call
        const stateEntry = window.PRECOMPUTED_STATE_SUMMARY[this.selectedState] || { district_count: "N/A", records: "N/A" };

        panel.innerHTML = `
            <div class="state-info-header fade-in">
                <div class="state-info-name" style="font-size:1.8rem;letter-spacing:-0.03em">${this.selectedState}</div>
                <div class="state-info-code" style="color:var(--accent-light);font-weight:700">REGION CODE: ${data.code}</div>
            </div>
            
            <div class="state-metrics-grid fade-in" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px">
                <div class="kpi-card" style="padding:15px">
                    <div class="kpi-label" style="font-size:0.65rem">Enrollment</div>
                    <div class="kpi-value" style="font-size:1.4rem">${formatNumber(data.enrollment)}</div>
                </div>
                <div class="kpi-card" style="padding:15px">
                    <div class="kpi-label" style="font-size:0.65rem">Districts</div>
                    <div class="kpi-value" style="font-size:1.4rem">${stateEntry.district_count}</div>
                </div>
                <div class="kpi-card" style="padding:15px">
                    <div class="kpi-label" style="font-size:0.65rem">Coverage</div>
                    <div class="kpi-value" style="font-size:1.4rem;color:var(--success)">${(data.coverage * 100).toFixed(0)}%</div>
                </div>
                <div class="kpi-card" style="padding:15px">
                    <div class="kpi-label" style="font-size:0.65rem">Fraud Risk</div>
                    <div class="kpi-value" style="font-size:1.4rem;color:${data.fraud_alerts > 30 ? 'var(--danger)' : 'var(--text-primary)'}">${data.fraud_alerts}</div>
                </div>
            </div>

            <div class="card fade-in" style="margin-top:16px;background:var(--bg-glass)">
                <div class="card-title" style="font-size:0.8rem">Predictive Insights</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:8px;line-height:1.5">
                    ${this.selectedState} is showing a <b>${data.migration_index > 0 ? 'High Inflow' : 'Steady Outflow'}</b> migration pattern. 
                    Recommended resource buffer: <b>+${Math.ceil(data.enrollment * 0.0001)} staff units</b> for next quarter.
                </div>
            </div>
        `;
    }
}

window.mapManager = new IndiaMapManager();

