/**
 * India Map Data — State boundaries, centroids, and metadata
 * Includes all Indian States and Union Territories explicitly.
 */

// Central state list including Delhi, Uttarakhand, Odisha, etc. All missing ones default to 0.
const INDIA_STATE_DATA = {
  "Andaman and Nicobar Islands": { code: "AN", enrollment: 0, coverage: 0, opi: 0, fraud_alerts: 0, migration_index: 0, cbgi: 0 },
  "Andhra Pradesh": { code: "AP", enrollment: 49000000, coverage: 0.89, opi: 0.32, fraud_alerts: 12, migration_index: 4.2, cbgi: 22 },
  "Arunachal Pradesh": { code: "AR", enrollment: 1100000, coverage: 0.54, opi: 0.71, fraud_alerts: 2, migration_index: 2.1, cbgi: 41 },
  "Assam": { code: "AS", enrollment: 26000000, coverage: 0.72, opi: 0.58, fraud_alerts: 18, migration_index: 5.8, cbgi: 35 },
  "Bihar": { code: "BR", enrollment: 88000000, coverage: 0.67, opi: 0.65, fraud_alerts: 34, migration_index: -6.4, cbgi: 48 },
  "Chandigarh": { code: "CH", enrollment: 980000, coverage: 0.97, opi: 0.09, fraud_alerts: 2, migration_index: 8.4, cbgi: 8 },
  "Chhattisgarh": { code: "CG", enrollment: 22000000, coverage: 0.78, opi: 0.49, fraud_alerts: 9, migration_index: 1.8, cbgi: 28 },
  "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", enrollment: 0, coverage: 0, opi: 0, fraud_alerts: 0, migration_index: 0, cbgi: 0 },
  "Delhi": { code: "DL", enrollment: 18000000, coverage: 0.95, opi: 0.16, fraud_alerts: 28, migration_index: 11.2, cbgi: 12 },
  "Goa": { code: "GA", enrollment: 1100000, coverage: 0.93, opi: 0.18, fraud_alerts: 3, migration_index: 9.2, cbgi: 14 },
  "Gujarat": { code: "GJ", enrollment: 55000000, coverage: 0.86, opi: 0.38, fraud_alerts: 21, migration_index: 7.1, cbgi: 20 },
  "Haryana": { code: "HR", enrollment: 22000000, coverage: 0.88, opi: 0.30, fraud_alerts: 14, migration_index: 6.8, cbgi: 17 },
  "Himachal Pradesh": { code: "HP", enrollment: 6000000, coverage: 0.91, opi: 0.22, fraud_alerts: 4, migration_index: -1.2, cbgi: 15 },
  "Jammu and Kashmir": { code: "JK", enrollment: 11000000, coverage: 0.73, opi: 0.55, fraud_alerts: 8, migration_index: 1.6, cbgi: 34 },
  "Jharkhand": { code: "JH", enrollment: 28000000, coverage: 0.74, opi: 0.56, fraud_alerts: 16, migration_index: -3.8, cbgi: 39 },
  "Karnataka": { code: "KA", enrollment: 54000000, coverage: 0.85, opi: 0.36, fraud_alerts: 22, migration_index: 8.5, cbgi: 21 },
  "Kerala": { code: "KL", enrollment: 31000000, coverage: 0.97, opi: 0.12, fraud_alerts: 7, migration_index: -2.1, cbgi: 10 },
  "Ladakh": { code: "LA", enrollment: 280000, coverage: 0.58, opi: 0.69, fraud_alerts: 1, migration_index: 3.5, cbgi: 44 },
  "Lakshadweep": { code: "LD", enrollment: 0, coverage: 0, opi: 0, fraud_alerts: 0, migration_index: 0, cbgi: 0 },
  "Madhya Pradesh": { code: "MP", enrollment: 68000000, coverage: 0.74, opi: 0.55, fraud_alerts: 27, migration_index: -1.5, cbgi: 37 },
  "Maharashtra": { code: "MH", enrollment: 104000000, coverage: 0.88, opi: 0.31, fraud_alerts: 41, migration_index: 9.8, cbgi: 18 },
  "Manipur": { code: "MN", enrollment: 2200000, coverage: 0.68, opi: 0.62, fraud_alerts: 5, migration_index: 1.4, cbgi: 38 },
  "Meghalaya": { code: "ML", enrollment: 2400000, coverage: 0.61, opi: 0.67, fraud_alerts: 4, migration_index: 1.8, cbgi: 43 },
  "Mizoram": { code: "MZ", enrollment: 890000, coverage: 0.72, opi: 0.51, fraud_alerts: 2, migration_index: 0.9, cbgi: 30 },
  "Nagaland": { code: "NL", enrollment: 1500000, coverage: 0.62, opi: 0.65, fraud_alerts: 3, migration_index: 0.7, cbgi: 42 },
  "Odisha": { code: "OD", enrollment: 38000000, coverage: 0.80, opi: 0.47, fraud_alerts: 15, migration_index: -2.8, cbgi: 31 },
  "Puducherry": { code: "PY", enrollment: 840000, coverage: 0.94, opi: 0.14, fraud_alerts: 2, migration_index: 4.1, cbgi: 11 },
  "Punjab": { code: "PB", enrollment: 23000000, coverage: 0.86, opi: 0.28, fraud_alerts: 11, migration_index: -0.8, cbgi: 14 },
  "Rajasthan": { code: "RJ", enrollment: 66000000, coverage: 0.76, opi: 0.52, fraud_alerts: 26, migration_index: 2.4, cbgi: 33 },
  "Sikkim": { code: "SK", enrollment: 520000, coverage: 0.81, opi: 0.38, fraud_alerts: 1, migration_index: 3.2, cbgi: 22 },
  "Tamil Nadu": { code: "TN", enrollment: 67000000, coverage: 0.91, opi: 0.23, fraud_alerts: 19, migration_index: 3.8, cbgi: 13 },
  "Telangana": { code: "TS", enrollment: 35000000, coverage: 0.87, opi: 0.33, fraud_alerts: 17, migration_index: 7.9, cbgi: 20 },
  "Tripura": { code: "TR", enrollment: 3200000, coverage: 0.82, opi: 0.44, fraud_alerts: 4, migration_index: 0.5, cbgi: 27 },
  "Uttar Pradesh": { code: "UP", enrollment: 180000000, coverage: 0.69, opi: 0.62, fraud_alerts: 68, migration_index: -4.8, cbgi: 46 },
  "Uttarakhand": { code: "UK", enrollment: 9200000, coverage: 0.84, opi: 0.35, fraud_alerts: 5, migration_index: -2.4, cbgi: 23 },
  "West Bengal": { code: "WB", enrollment: 84000000, coverage: 0.81, opi: 0.44, fraud_alerts: 33, migration_index: 1.2, cbgi: 29 }
};

// Precompute state name dictionary for O(1) lookup
const STATE_LOOKUP_MAP = {};
for (let key in INDIA_STATE_DATA) {
    STATE_LOOKUP_MAP[key.toLowerCase()] = key;
}

// ============================================================
// EXHAUSTIVE STATE NAME NORMALIZATION
// Maps ALL known GeoJSON variations → INDIA_STATE_DATA keys
// ============================================================
const STATE_NAME_ALIASES = {
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar islands': 'Andaman and Nicobar Islands',
  'a & n islands': 'Andaman and Nicobar Islands',
  'orissa': 'Odisha',
  'odisha': 'Odisha',
  'uttaranchal': 'Uttarakhand',
  'uttarakhand': 'Uttarakhand',
  'nct of delhi': 'Delhi',
  'nct': 'Delhi',
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra & nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman & diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'telangana': 'Telangana',
  'lakshadweep': 'Lakshadweep',
  'pondicherry': 'Puducherry',
  'puducherry': 'Puducherry',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'j&k': 'Jammu and Kashmir',
  'ladakh': 'Ladakh',
};

function normalizeStateName(name) {
  if (!name) return "Unknown";
  let n = name.replace(/&/g, 'and').trim();
  
  // 1. Fast direct match
  if (INDIA_STATE_DATA[n]) return n;
  
  // 2. Alias table (case-insensitive)
  const lower = n.toLowerCase();
  if (STATE_NAME_ALIASES[lower]) return STATE_NAME_ALIASES[lower];
  
  // 3. Case-insensitive match against data keys
  if (STATE_LOOKUP_MAP[lower]) return STATE_LOOKUP_MAP[lower];
  
  // 4. Substring fallbacks
  if (lower.includes('andaman')) return 'Andaman and Nicobar Islands';
  if (lower.includes('dadra') || lower.includes('daman')) return 'Dadra and Nagar Haveli and Daman and Diu';
  if (lower.includes('delhi')) return 'Delhi';
  
  return n;
}

// ============================================================
// PRECOMPUTED STATE SUMMARY CACHE
// Avoids calling generateMockResponse on every click
// ============================================================
const PRECOMPUTED_STATE_SUMMARY = {};
(function buildStateSummaryCache() {
    for (const [name, data] of Object.entries(INDIA_STATE_DATA)) {
        PRECOMPUTED_STATE_SUMMARY[name] = {
            state: name,
            total_enrollments: data.enrollment,
            district_count: Math.max(1, Math.floor(data.enrollment / 1000000)),
            records: Math.round(data.enrollment * 1.1),
        };
    }
})();
window.PRECOMPUTED_STATE_SUMMARY = PRECOMPUTED_STATE_SUMMARY;

// Color scheme for map metrics
function getStateColor(state, metric = 'enrollment', selectedState = null) {
  const data = INDIA_STATE_DATA[state];
  if (!data) return '#1e1e2e';
  
  const isSelected = state === selectedState;
  
  let intensity = 0;
  switch (metric) {
    case 'enrollment':
      const maxEnroll = 180000000;
      intensity = Math.min(data.enrollment / maxEnroll, 1);
      break;
    case 'coverage':
      intensity = data.coverage;
      break;
    case 'fraud':
      intensity = Math.min(data.fraud_alerts / 68, 1);
      break;
    case 'cbgi':
      intensity = Math.min(data.cbgi / 50, 1);
      break;
    case 'migration':
      intensity = Math.min(Math.abs(data.migration_index) / 12, 1);
      break;
    default:
      intensity = 0.5;
  }
  
  // Return a numeric array for echarts-gl or hex for normal
  const r = intensity;
  
  if (isSelected) {
    return '#8b5cf6'; // Highlight color
  }
  
  // For simplicity return hex colors roughly matching the previous HSL
  switch (metric) {
    case 'enrollment': return `rgba(99, 102, 241, ${0.2 + intensity*0.8})`;
    case 'coverage':   return intensity > 0.8 ? `rgba(16, 185, 129, ${0.2 + intensity*0.8})` : `rgba(245, 158, 11, ${0.4 + intensity*0.6})`;
    case 'fraud':      return `rgba(239, 68, 68, ${0.2 + intensity*0.8})`;
    case 'cbgi':       return `rgba(239, 68, 68, ${0.2 + intensity*0.8})`;
    case 'migration':  return `rgba(59, 130, 246, ${0.2 + intensity*0.8})`;
    default:           return '#312e81';
  }
}

// Simple absolute value mapped for 3D extrusion Height (0 to 1)
function getStateHeight(state, metric = 'enrollment') {
  const data = INDIA_STATE_DATA[state];
  if (!data) return 0.1;
  let intensity = 0.1;
  switch (metric) {
    case 'enrollment': intensity = data.enrollment / 180000000; break;
    case 'coverage': intensity = data.coverage; break;
    case 'fraud': intensity = data.fraud_alerts / 68; break;
    case 'cbgi': intensity = data.cbgi / 50; break;
    case 'migration': intensity = Math.abs(data.migration_index) / 12; break;
  }
  return 0.1 + (intensity * 2); // Base height + variable height
}

// ----------------------------------------------------
// ONE CENTRAL MOCK DATA SOURCE
// Every dashboard endpoint is driven dynamically by INDIA_STATE_DATA
// IF INDIA_STATE_DATA CHANGES, ENTIRE WEBSITE UPDATES
// ----------------------------------------------------
window.generateMockResponse = function(endpoint) {
    const states = Object.entries(INDIA_STATE_DATA).map(([name, data]) => ({name, ...data}));
    const sortedByEnrollment = [...states].sort((a,b) => b.enrollment - a.enrollment);
    const sortedByOPI = [...states].sort((a,b) => b.opi - a.opi);
    const totalEnrollments = states.reduce((sum, s) => sum + s.enrollment, 0);

    if (endpoint === '/health') {
        return { status: 'ok', mode: 'mock' };
    }
    if (endpoint === '/dashboard/kpis') {
        return {
            total_enrollments: totalEnrollments,
            total_biometric_updates: totalEnrollments * 0.08,
            total_demographic_updates: totalEnrollments * 0.05,
            enrollment_records: states.length * 12345,
            enrollment_by_age: {
                age_0_5: totalEnrollments * 0.1,
                age_5_17: totalEnrollments * 0.2,
                age_18_plus: totalEnrollments * 0.7
            }
        };
    }
    if (endpoint === '/dashboard/enrollment-trend') {
        const trend = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const total = 50000 + Math.random() * 20000;
            trend.push({
                date: d.toISOString().split('T')[0],
                total: total,
                youth: total * 0.3,
                adults: total * 0.7
            });
        }
        return trend;
    }
    if (endpoint === '/dashboard/state-summary') {
        return sortedByEnrollment.map(s => ({
            state: s.name,
            total_enrollments: s.enrollment,
            district_count: Math.max(1, Math.floor(s.enrollment / 1000000)),
            records: s.enrollment * 1.1
        }));
    }
    if (endpoint === '/fraud/anomaly-districts') {
        const anomalies = states.filter(s => s.fraud_alerts > 15).map(s => ({
            district: s.name + ' Central',
            state: s.name,
            z_max: 2.5 + (s.fraud_alerts / 10),
            mean: 1500,
            std_dev: 200
        }));
        return {
            anomaly_count: anomalies.length,
            threshold: 2.5,
            districts: anomalies
        };
    }
    if (endpoint === '/fraud/geo-spikes') {
        return states.filter(s => s.fraud_alerts > 10).map(s => ({
            pincode: '1100' + Math.floor(Math.random() * 99),
            district: s.name + ' District',
            state: s.name,
            total_enrollments: s.fraud_alerts * 1000,
            severity: s.fraud_alerts > 40 ? 'CRITICAL' : s.fraud_alerts > 20 ? 'HIGH' : 'MEDIUM'
        }));
    }
    if (endpoint === '/coverage/state-coverage') {
        return states.map(s => ({
            state: s.name,
            avg_per_pincode: (s.coverage * 10000)
        })).sort((a,b) => b.avg_per_pincode - a.avg_per_pincode);
    }
    if (endpoint === '/coverage/digital-deserts') {
        return states.filter(s => s.coverage < 0.7).map(s => ({
            pincode: '110' + Math.floor(Math.random() * 999),
            district: s.name + ' Rural',
            state: s.name,
            total_enrollments: s.enrollment * 0.001
        }));
    }
    if (endpoint === '/coverage/opi-scores') {
        return sortedByOPI.map(s => ({
            district: s.name + ' Region',
            state: s.name,
            opi_score: s.opi
        }));
    }
    if (endpoint === '/biometric/summary') {
        return {
            total_bio_5_17: totalEnrollments * 0.15,
            total_bio_17_plus: totalEnrollments * 0.05,
            total_demo_5_17: totalEnrollments * 0.02,
            total_demo_17_plus: totalEnrollments * 0.04
        };
    }
    if (endpoint === '/biometric/cbgi') {
        return [...states].sort((a,b) => b.cbgi - a.cbgi).map(s => ({
            district: s.name + ' District',
            state: s.name,
            cbgi: s.cbgi,
            risk_level: s.cbgi > 40 ? 'CRITICAL' : s.cbgi > 30 ? 'HIGH' : s.cbgi > 20 ? 'MEDIUM' : 'LOW',
            bio_youth: s.enrollment * 0.1,
            demo_youth: s.enrollment * 0.05
        }));
    }
    if (endpoint === '/biometric/trend') {
        const trend = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trend.push({
                date: d.toISOString().split('T')[0],
                total_bio: 10000 + Math.random() * 5000,
                total_demo: 15000 + Math.random() * 10000
            });
        }
        return trend;
    }
    if (endpoint === '/dedup/quality-score') {
        const qs = states.reduce((sum, s) => sum + (s.coverage * 100), 0) / states.length;
        return {
            quality_score: parseFloat(qs.toFixed(1)),
            total_records: totalEnrollments
        };
    }
    if (endpoint === '/dedup/duplicate-pincodes') {
        return states.filter(s => s.fraud_alerts > 10).map(s => ({
            pincode: 'PIN' + Math.floor(Math.random() * 9999),
            districts: [s.name, 'Other Region'],
            district_count: 2,
            record_count: Math.floor(Math.random() * 500)
        }));
    }
    if (endpoint === '/dedup/inconsistencies') {
        return states.filter(s => s.cbgi > 25).map(s => ({
            district: s.name + ' District',
            state: s.name,
            bio_total: s.enrollment * 0.08,
            demo_total: s.enrollment * 0.12,
            deviation_ratio: 0.1 + (Math.random() * 0.4)
        }));
    }
    if (endpoint === '/consent/stats') {
        return {
            total_consents: 154200,
            active: 130000,
            revoked: 12000,
            expired: 12200
        };
    }
    if (endpoint === '/migration/state-flow') {
        return states.map(s => ({
            state: s.name,
            flow_indicator: s.migration_index > 5 ? 'HIGH_INFLOW' : s.migration_index < -2 ? 'HIGH_OUTFLOW' : 'MODERATE_INFLOW',
            volatility: Math.abs(s.migration_index)
        })).sort((a,b) => b.volatility - a.volatility);
    }
    if (endpoint === '/migration/district-migration') {
        return [...states].sort((a,b) => Math.abs(b.migration_index) - Math.abs(a.migration_index)).map(s => ({
            district: s.name + ' Regional',
            state: s.name,
            migration_index: s.migration_index,
            avg_daily: Math.floor(Math.abs(s.migration_index) * 100),
            surge_flag: s.migration_index > 7
        }));
    }
    if (endpoint === '/forecast/demand-by-state') {
        return states.map(s => ({
            state: s.name,
            projected_monthly: s.enrollment * 0.015,
            projected_quarterly: s.enrollment * 0.045
        }));
    }
    if (endpoint === '/forecast/resource-plan') {
        return sortedByEnrollment.map(s => ({
            district: s.name + ' Metro',
            state: s.name,
            avg_daily_load: Math.floor(s.enrollment * 0.0005),
            monthly_projected: Math.floor(s.enrollment * 0.015),
            required_staff: Math.floor(s.enrollment * 0.00001),
            required_devices: Math.floor(s.enrollment * 0.000012)
        }));
    }
    if (endpoint === '/analytics/multilevel/national') {
        return {
            enrollment: {
                total_enrollments: totalEnrollments,
                state_count: states.length,
                district_count: states.reduce((sum, s) => sum + Math.max(1, Math.floor(s.enrollment / 1000000)), 0),
                pincode_count: states.reduce((sum, s) => sum + Math.max(10, Math.floor(s.enrollment / 100000)), 0)
            }
        };
    }
    if (endpoint === '/analytics/anomalies/enrollment') {
        const anomalies = states.filter(s => s.fraud_alerts > 5).map(s => ({
            district: s.name + ' Anomaly',
            state: s.name,
            coefficient_of_variation: (0.1 + Math.random() * 0.3).toFixed(2),
            severity: s.fraud_alerts > 30 ? 'CRITICAL' : s.fraud_alerts > 15 ? 'HIGH' : 'MEDIUM'
        }));
        return { anomaly_count: anomalies.length, anomalies };
    }
    if (endpoint === '/analytics/anomalies/biometric') {
        const anomalies = states.filter(s => s.cbgi > 15).map(s => ({
            district: s.name + ' Bio Spike',
            state: s.name,
            cv: (0.15 + Math.random() * 0.2).toFixed(2),
            severity: s.cbgi > 35 ? 'CRITICAL' : s.cbgi > 25 ? 'HIGH' : 'MEDIUM'
        }));
        return { anomaly_count: anomalies.length, anomalies };
    }
    if (endpoint === '/analytics/data-sources') {
        return [
            { source: 'UIDAI Master', status: 'Online', records: totalEnrollments },
            { source: 'Census 2011', status: 'Static', records: 1210000000 },
            { source: 'NSSO Migration', status: 'Online', records: 450000 }
        ];
    }
    
    return null;
};

window.INDIA_STATE_DATA = INDIA_STATE_DATA;
window.normalizeStateName = normalizeStateName;
window.getStateColor = getStateColor;
window.getStateHeight = getStateHeight;
