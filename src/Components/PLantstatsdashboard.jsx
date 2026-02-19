import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ReferenceLine,
} from "recharts";
import {
    Building, TrendingUp, TrendingDown, Target, Users, Activity,
    BarChart3, Layers, Award, AlertTriangle, CheckCircle, RefreshCw,
    Minus, Globe, ChevronRight, ChevronDown,
    Zap, Shield, Database, PieChartIcon, SlidersHorizontal,
    LayoutDashboard, Settings, Menu, X, Calendar, Filter,
    ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ─── Design Tokens ───────────────────────────────────────────
const T = {
    indigo: "#4F46E5",
    indigoL: "#EEF2FF",
    indigoM: "#C7D2FE",
    coral: "#F05252",
    coralL: "#FEF2F2",
    emerald: "#059669",
    emeraldL: "#ECFDF5",
    amber: "#D97706",
    amberL: "#FFFBEB",
    sky: "#0284C7",
    skyL: "#F0F9FF",
    violet: "#7C3AED",
    violetL: "#F5F3FF",
    slate: "#64748B",
    slateL: "#F8FAFC",
    border: "#E2E8F0",
    text: "#0F172A",
    textSub: "#64748B",
    white: "#FFFFFF",
    bg: "#F1F5F9",
};

const PIE_PALETTE = [T.indigo, T.sky, T.emerald, T.amber, T.coral, T.violet];
const DEPT_COLORS = [T.indigo, T.emerald, T.coral, T.amber, T.sky, T.violet, "#F97316", "#06B6D4", "#EC4899", "#84CC16", "#6366F1", "#F59E0B"];
const API = "https://kpi-form.azurewebsites.net/api";
const fmt = n => Number(n || 0).toLocaleString();

// ── Week Utilities ────────────────────────────────────────────
const ALL_WEEKS = (() => {
    const weeks = [];
    for (let w = 1; w <= 52; w++) weeks.push(`2025-Week${w}`);
    for (let w = 1; w <= 20; w++) weeks.push(`2026-Week${w}`);
    return weeks;
})();
const weekLabel = w => {
    const [year, wk] = w.split("-Week");
    return `W${wk}'${year.slice(2)}`;
};

// ─── Custom Tooltip ──────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", boxShadow: "0 10px 40px rgba(15,23,42,0.12)", minWidth: 140 }}>
            <p style={{ color: T.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
            {payload.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.stroke || T.indigo }} />
                    <span style={{ fontSize: 12, color: T.textSub }}>{p.name}:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

const AnalyticsTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    const green = payload.find(p => p.dataKey === "on_target")?.value || 0;
    const pct = total > 0 ? Math.round((green / total) * 100) : 0;
    return (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 18px", boxShadow: "0 12px 40px rgba(15,23,42,0.14)", minWidth: 180 }}>
            <p style={{ color: T.text, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{label}</p>
            {payload.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 3, background: p.color }} />
                    <span style={{ fontSize: 12, color: T.textSub }}>{p.name}:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{p.value}</span>
                </div>
            ))}
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.textSub, fontWeight: 600 }}>Health</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: pct >= 70 ? T.emerald : pct >= 40 ? T.amber : T.coral }}>{pct}%</span>
            </div>
        </div>
    );
};

const KpiCard = ({ icon: Icon, label, value, sub, accent, accentLight, idx }) => (
    <div style={{ background: T.white, borderRadius: 18, padding: "22px 24px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${accent}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)", transition: "transform 0.2s, box-shadow 0.2s", animation: `fadeUp 0.5s ease both`, animationDelay: `${idx * 0.08}s` }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.1), 0 0 0 1px ${accent}25`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)"; }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ background: accentLight, borderRadius: 12, padding: 10 }}>
                <Icon size={21} color={accent} strokeWidth={2} />
            </div>
        </div>
        <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: "-1.5px" }}>{fmt(value)}</div>
            <div style={{ fontSize: 13, color: T.textSub, marginTop: 6, fontWeight: 500 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 700 }}>{sub}</div>}
        </div>
    </div>
);

const Card = ({ title, icon: Icon, accent = T.indigo, children, span, idx = 0 }) => (
    <div style={{ background: T.white, borderRadius: 18, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)", padding: "24px 24px 20px", gridColumn: span ? `span ${span}` : undefined, animation: `fadeUp 0.5s ease both`, animationDelay: `${idx * 0.07 + 0.15}s` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ background: `${accent}14`, borderRadius: 10, padding: 8 }}>
                <Icon size={17} color={accent} strokeWidth={2.5} />
            </div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>{title}</h3>
        </div>
        {children}
    </div>
);

const TabBtn = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} style={{ background: active ? T.indigo : T.white, border: `1.5px solid ${active ? T.indigo : T.border}`, borderRadius: 10, padding: "9px 22px", color: active ? T.white : T.textSub, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, transition: "all 0.16s", fontFamily: "inherit", boxShadow: active ? `0 4px 14px ${T.indigo}35` : "none" }}>
        <Icon size={15} strokeWidth={2.5} /> {label}
    </button>
);

const PerfBadge = ({ status }) => {
    const map = { GREEN: { bg: T.emeraldL, color: T.emerald, label: "On Target", Icon: CheckCircle }, RED: { bg: T.coralL, color: T.coral, label: "Off Target", Icon: AlertTriangle }, "NO DATA": { bg: T.slateL, color: T.slate, label: "No Data", Icon: Minus } };
    const c = map[status] || map["NO DATA"];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.color, borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700 }}><c.Icon size={11} strokeWidth={2.5} /> {c.label}</span>;
};

const HealthBar = ({ pct }) => {
    const color = pct >= 70 ? T.emerald : pct >= 40 ? T.amber : T.coral;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 34, textAlign: "right" }}>{pct}%</span>
        </div>
    );
};

// ── Week Picker Dropdown ──────────────────────────────────────
const WeekPickerDropdown = ({ value, onChange, onClose }) => (
    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(15,23,42,0.18)", width: 200, maxHeight: 260, overflowY: "auto" }}>
        {[...ALL_WEEKS].reverse().map(w => (
            <div key={w} onClick={() => { onChange(w); onClose(); }} style={{ padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: value === w ? T.indigo : T.textSub, background: value === w ? T.indigoL : "transparent", display: "flex", alignItems: "center", gap: 7, transition: "background 0.1s" }}
                onMouseEnter={e => { if (value !== w) e.currentTarget.style.background = T.slateL; }}
                onMouseLeave={e => { if (value !== w) e.currentTarget.style.background = "transparent"; }}
            >
                {value === w && <CheckCircle size={10} color={T.indigo} />}
                {w}
            </div>
        ))}
    </div>
);

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const PlantStatsDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [stats, setStats] = useState(null);
    const [rootPlants, setRootPlants] = useState([]);
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState("2026-Week6");
    const [tab, setTab] = useState("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [perfData, setPerfData] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [perfLoading, setPerfLoading] = useState(false);

    const [plantPerf, setPlantPerf] = useState([]);
    const [deptPerf, setDeptPerf] = useState([]);
    const [analyticsPlantFilter, setAnalyticsPlantFilter] = useState("all");
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [plantView, setPlantView] = useState("all");

    // ── Dept Weekly state ─────────────────────────────────────
    const [deptWeeklyData, setDeptWeeklyData] = useState({}); // { week: [rows] }
    const [deptWeeklyLoading, setDeptWeeklyLoading] = useState(false);
    const [deptWeeklyProgress, setDeptWeeklyProgress] = useState(0);
    const [deptPlantFilter, setDeptPlantFilter] = useState("all");
    const [deptWeekStart, setDeptWeekStart] = useState("2025-Week48");
    const [deptWeekEnd, setDeptWeekEnd] = useState("2026-Week7");
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [deptChartMode, setDeptChartMode] = useState("table"); // table | trend | bar

    useEffect(() => { fetchAll(); }, []);
    useEffect(() => { if (selectedPlant) fetchPerf(selectedPlant, currentWeek); }, [selectedPlant, currentWeek]);
    useEffect(() => { fetchAnalytics(); }, [currentWeek]);
    useEffect(() => { fetchDeptPerf(); }, [analyticsPlantFilter, currentWeek]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, r, h] = await Promise.all([
                axios.get(`${API}/stats`),
                axios.get(`${API}/plants/roots`),
                axios.get(`${API}/plants/hierarchy`),
            ]);
            setStats(s.data); setRootPlants(r.data); setHierarchy(h.data);
            if (r.data.length) setSelectedPlant(r.data[0].plant_id);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchPerf = async (plantId, week) => {
        setPerfLoading(true);
        try {
            const res = await axios.get(`${API}/plants/${plantId}/performance?week=${week}`);
            setPerfData(res.data);
        } catch (e) { setPerfData([]); }
        setPerfLoading(false);
    };

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const res = await axios.get(`${API}/performance/by-plants?week=${currentWeek}`);
            setPlantPerf(res.data);
        } catch (e) { setPlantPerf([]); }
        setAnalyticsLoading(false);
    };

    const fetchDeptPerf = async () => {
        try {
            const params = analyticsPlantFilter === "all" ? `week=${currentWeek}` : `week=${currentWeek}&plantId=${analyticsPlantFilter}`;
            const res = await axios.get(`${API}/performance/by-departments?${params}`);
            setDeptPerf(res.data);
        } catch (e) { setDeptPerf([]); }
    };

    // ── Selected week range for dept tab ─────────────────────
    const selectedWeeks = useMemo(() => {
        const si = ALL_WEEKS.indexOf(deptWeekStart);
        const ei = ALL_WEEKS.indexOf(deptWeekEnd);
        if (si === -1 || ei === -1) return [];
        const [s, e] = si <= ei ? [si, ei] : [ei, si];
        return ALL_WEEKS.slice(s, e + 1);
    }, [deptWeekStart, deptWeekEnd]);

    // Fetch dept weekly data
    const fetchDeptWeekly = useCallback(async () => {
        if (!selectedWeeks.length) return;
        setDeptWeeklyLoading(true);
        setDeptWeeklyProgress(0);
        const results = {};
        const params = deptPlantFilter !== "all" ? `&plantId=${deptPlantFilter}` : "";
        let done = 0;
        await Promise.all(selectedWeeks.map(async (week) => {
            try {
                const res = await axios.get(`${API}/performance/by-departments?week=${week}${params}`);
                results[week] = res.data;
            } catch { results[week] = []; }
            done++;
            setDeptWeeklyProgress(Math.round((done / selectedWeeks.length) * 100));
        }));
        setDeptWeeklyData(results);
        setDeptWeeklyLoading(false);
    }, [selectedWeeks, deptPlantFilter]);

    useEffect(() => {
        if (tab === "departments") fetchDeptWeekly();
    }, [tab, fetchDeptWeekly]);

    // ── Dept names ────────────────────────────────────────────
    const allDepts = useMemo(() => {
        const names = new Set();
        Object.values(deptWeeklyData).forEach(rows => rows.forEach(r => names.add(r.department_name)));
        return [...names].sort();
    }, [deptWeeklyData]);

    // ── Per-dept per-week totals ──────────────────────────────
    const deptWeekMatrix = useMemo(() => {
        // { deptName: { week: { on, off, noData, total } } }
        const matrix = {};
        Object.entries(deptWeeklyData).forEach(([week, rows]) => {
            rows.forEach(r => {
                if (!matrix[r.department_name]) matrix[r.department_name] = {};
                const on = +r.on_target || 0;
                const off = +r.off_target || 0;
                const noData = +r.no_data || 0;
                matrix[r.department_name][week] = {
                    on, off, noData,
                    total: on + off + noData,
                    health: (on + off) > 0 ? Math.round(on / (on + off) * 100) : null,
                };
            });
        });
        return matrix;
    }, [deptWeeklyData]);

    // ── Aggregated dept totals across all selected weeks ──────
    const deptAggregated = useMemo(() =>
        allDepts.map(dept => {
            const weekData = deptWeekMatrix[dept] || {};
            let on = 0, off = 0, noData = 0;
            Object.values(weekData).forEach(w => { on += w.on; off += w.off; noData += w.noData; });
            return {
                name: dept.length > 24 ? dept.slice(0, 24) + "…" : dept,
                fullName: dept,
                on_target: on,
                off_target: off,
                no_data: noData,
                total: on + off + noData,
                health: (on + off) > 0 ? Math.round(on / (on + off) * 100) : 0,
            };
        }).sort((a, b) => b.total - a.total),
        [allDepts, deptWeekMatrix]);

    // ── Trend data for line chart ─────────────────────────────
    const deptTrendData = useMemo(() =>
        selectedWeeks.map(week => {
            const row = { week: weekLabel(week), fullWeek: week };
            const rows = deptWeeklyData[week] || [];
            rows.forEach(r => {
                const on = +r.on_target || 0;
                const off = +r.off_target || 0;
                row[r.department_name] = on + off > 0 ? Math.round(on / (on + off) * 100) : null;
            });
            return row;
        }), [selectedWeeks, deptWeeklyData]);

    // ── Bar chart data (totals per dept across weeks) ─────────
    const deptBarData = useMemo(() =>
        deptAggregated.slice(0, 15).map(d => ({
            name: d.name,
            fullName: d.fullName,
            on_target: d.on_target,
            off_target: d.off_target,
        })),
        [deptAggregated]);

    // ── Global summary ────────────────────────────────────────
    const deptGlobalSummary = useMemo(() => {
        const totOn = deptAggregated.reduce((s, d) => s + d.on_target, 0);
        const totOff = deptAggregated.reduce((s, d) => s + d.off_target, 0);
        const health = (totOn + totOff) > 0 ? Math.round(totOn / (totOn + totOff) * 100) : 0;
        return { on: totOn, off: totOff, health, depts: allDepts.length, weeks: selectedWeeks.length };
    }, [deptAggregated, allDepts, selectedWeeks]);

    // ── existing derived ──────────────────────────────────────
    const levelData = useMemo(() => {
        const map = {};
        hierarchy.forEach(p => { const l = `L${p.level}`; map[l] = (map[l] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [hierarchy]);

    const rootBarData = useMemo(() => rootPlants.map(p => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name, fullName: p.name, responsible: +p.responsible_count || 0, children: +p.child_plant_count || 0, kpis: +p.total_child_kpis || 0 })), [rootPlants]);

    const perfSummary = useMemo(() => {
        const g = perfData.filter(d => d.performance_status === "GREEN").reduce((s, d) => s + +d.count, 0);
        const r = perfData.filter(d => d.performance_status === "RED").reduce((s, d) => s + +d.count, 0);
        const n = perfData.filter(d => d.performance_status === "NO DATA").reduce((s, d) => s + +d.count, 0);
        return [{ name: "On Target", value: g, color: T.emerald }, { name: "Off Target", value: r, color: T.coral }, { name: "No Data", value: n, color: "#CBD5E1" }].filter(d => d.value > 0);
    }, [perfData]);

    const perfByIndicator = useMemo(() => {
        const map = {};
        perfData.forEach(d => {
            const key = d.indicator_title;
            if (!map[key]) map[key] = { name: key.replace(/^(Actual[- ]?)?-+\s*/i, "").slice(0, 24), green: 0, red: 0 };
            if (d.performance_status === "GREEN") map[key].green += +d.count;
            if (d.performance_status === "RED") map[key].red += +d.count;
        });
        return Object.values(map).slice(0, 10);
    }, [perfData]);

    const healthPct = useMemo(() => {
        const total = perfSummary.reduce((s, d) => s + d.value, 0);
        const green = perfSummary.find(d => d.name === "On Target")?.value || 0;
        return total ? Math.round((green / total) * 100) : 0;
    }, [perfSummary]);

    const filteredPlantPerf = useMemo(() => {
        if (plantView === "all") return plantPerf;
        if (plantView === "root") return plantPerf.filter(p => !p.parent_id);
        return plantPerf.filter(p => String(p.plant_id) === String(plantView));
    }, [plantPerf, plantView]);

    const plantChartData = useMemo(() => filteredPlantPerf.map(p => ({ name: p.plant_name.length > 16 ? p.plant_name.slice(0, 16) + "…" : p.plant_name, fullName: p.plant_name, on_target: +p.on_target || 0, off_target: +p.off_target || 0, no_data: +p.no_data || 0, total: +p.total || 0, health: +p.total > 0 ? Math.round(((+p.on_target) / (+p.on_target + +p.off_target || 1)) * 100) : 0 })), [filteredPlantPerf]);

    const deptChartData = useMemo(() => deptPerf.slice(0, 12).map(d => ({ name: d.department_name.length > 18 ? d.department_name.slice(0, 18) + "…" : d.department_name, fullName: d.department_name, on_target: +d.on_target || 0, off_target: +d.off_target || 0, no_data: +d.no_data || 0, health: +d.health_pct || 0 })), [deptPerf]);

    const analyticsKPIs = useMemo(() => {
        const totalOn = plantPerf.reduce((s, p) => s + (+p.on_target || 0), 0);
        const totalOff = plantPerf.reduce((s, p) => s + (+p.off_target || 0), 0);
        const totalNoData = plantPerf.reduce((s, p) => s + (+p.no_data || 0), 0);
        const globalHealth = (totalOn + totalOff) > 0 ? Math.round(totalOn / (totalOn + totalOff) * 100) : 0;
        const worstPlant = [...plantPerf].sort((a, b) => (+b.off_target || 0) - (+a.off_target || 0))[0];
        const bestPlant = [...plantPerf].filter(p => (+p.on_target + +p.off_target) > 0).sort((a, b) => (+b.on_target / (+b.on_target + +b.off_target)) - (+a.on_target / (+a.on_target + +a.off_target)))[0];
        return { totalOn, totalOff, totalNoData, globalHealth, worstPlant, bestPlant };
    }, [plantPerf]);

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, gap: 12, color: T.textSub, fontFamily: "'Sora',sans-serif" }}>
            <RefreshCw size={22} color={T.indigo} style={{ animation: "spin 0.9s linear infinite" }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Loading dashboard…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );

    return (
        <div style={{ fontFamily: "'Sora','Nunito','Segoe UI',sans-serif", background: T.bg, minHeight: "100vh", color: T.text, display: "flex" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:${T.bg};}
        ::-webkit-scrollbar-thumb{background:${T.indigoM};border-radius:4px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .kpi-sidebar{position:fixed;top:0;left:0;height:100vh;width:248px;background:#12152b;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,0.35);z-index:200;transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);}
        .kpi-sidebar-header{display:flex;align-items:center;gap:12px;padding:22px 20px 20px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;}
        .kpi-sidebar-logo{background:linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%);color:#fff;border-radius:12px;padding:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(99,85,255,0.45);}
        .kpi-brand-name{font-size:15px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;line-height:1.2;}
        .kpi-brand-sub{font-size:10px;color:rgba(255,255,255,0.38);font-weight:600;margin-top:2px;text-transform:uppercase;letter-spacing:1px;}
        .kpi-sidebar-nav{flex:1;overflow-y:auto;padding:22px 14px 16px;}
        .kpi-sidebar-nav::-webkit-scrollbar{width:0;}
        .kpi-nav-section-title{font-size:10px;font-weight:700;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:1.4px;padding:0 10px;margin-bottom:10px;}
        .kpi-nav-item{display:flex;align-items:center;gap:11px;width:100%;padding:11px 14px;border-radius:10px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:rgba(255,255,255,0.45);transition:all 0.18s ease;text-align:left;margin-bottom:3px;position:relative;}
        .kpi-nav-item:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.85);}
        .kpi-nav-item.active{background:rgba(99,85,255,0.22);color:#a89dff;}
        .kpi-nav-item.active::after{content:'';position:absolute;right:12px;top:50%;transform:translateY(-50%);width:7px;height:7px;border-radius:50%;background:#7c6fff;box-shadow:0 0 8px #7c6fff;}
        .kpi-nav-item.active svg{color:#a89dff !important;}
        .kpi-sidebar-footer{display:flex;align-items:center;gap:10px;padding:16px 18px;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0;}
        .kpi-user-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f857a6 0%,#a855f7 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;box-shadow:0 3px 10px rgba(168,85,247,0.5);}
        .kpi-user-name{font-size:11px;font-weight:800;color:#ffffff;line-height:1.3;}
        .kpi-user-org{font-size:10px;color:rgba(255,255,255,0.35);font-weight:500;margin-top:1px;}
        .kpi-settings-icon{margin-left:auto;cursor:pointer;flex-shrink:0;color:rgba(255,255,255,0.3);transition:color 0.15s;}
        .kpi-settings-icon:hover{color:rgba(255,255,255,0.7);}
        .kpi-sidebar-close{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.35);display:flex;padding:4px;transition:color 0.15s;}
        .kpi-sidebar-close:hover{color:rgba(255,255,255,0.8);}
        .kpi-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:199;backdrop-filter:blur(2px);}
        .kpi-main{flex:1;margin-left:248px;min-width:0;display:flex;flex-direction:column;}
        .kpi-topbar{background:${T.white};border-bottom:1px solid ${T.border};padding:0 28px;display:flex;align-items:center;justify-content:space-between;height:64px;flex-shrink:0;position:sticky;top:0;z-index:100;box-shadow:0 1px 0 rgba(0,0,0,0.04);}
        .kpi-hamburger{display:none;background:none;border:1.5px solid ${T.border};border-radius:8px;padding:7px;cursor:pointer;color:${T.textSub};align-items:center;justify-content:center;transition:border-color 0.15s;}
        .kpi-hamburger:hover{border-color:${T.indigo};color:${T.indigo};}
        @media(max-width:1024px){.kpi-main{margin-left:0;}.kpi-sidebar{transform:translateX(-100%);}.kpi-sidebar.open{transform:translateX(0);box-shadow:4px 0 32px rgba(15,23,42,0.16);}.kpi-overlay{display:block;}.kpi-hamburger{display:flex;}.kpi-topbar{padding:0 18px;}}
        @media(max-width:640px){.kpi-page-body{padding:18px 14px !important;}.kpi-kpi-grid{grid-template-columns:repeat(2,1fr) !important;}.kpi-tabs{flex-wrap:wrap;gap:6px !important;}.kpi-tabs button{padding:8px 14px !important;font-size:12px !important;}}
        .dept-week-cell{border-radius:6px;padding:6px 8px;text-align:center;font-size:11px;font-weight:700;transition:transform 0.1s;}
        .dept-week-cell:hover{transform:scale(1.05);}
      `}</style>

            {sidebarOpen && <div className="kpi-overlay" onClick={() => setSidebarOpen(false)} />}

            <aside className={`kpi-sidebar${sidebarOpen ? " open" : ""}`}>
                <div className="kpi-sidebar-header">
                    <div className="kpi-sidebar-logo"><BarChart3 size={20} /></div>
                    <div><div className="kpi-brand-name">KPI Dashboard</div><div className="kpi-brand-sub">Plant Management</div></div>
                    <button className="kpi-sidebar-close" onClick={() => setSidebarOpen(false)}><X size={16} /></button>
                </div>
                <nav className="kpi-sidebar-nav">
                    <div className="kpi-nav-section-title">Navigation</div>
                    <button className={`kpi-nav-item${location.pathname === "/" ? " active" : ""}`} onClick={() => { navigate("/"); setSidebarOpen(false); }}><LayoutDashboard size={17} /><span>Dashboard</span></button>
                    <button className={`kpi-nav-item${location.pathname === "/dashboard" ? " active" : ""}`} onClick={() => { navigate("/dashboard"); setSidebarOpen(false); }}><BarChart3 size={17} /><span>Statistics</span></button>
                </nav>
                <div className="kpi-sidebar-footer">
                    <div className="kpi-user-avatar">AD</div>
                    <div><div className="kpi-user-name">KPI TRACKING SYSTEM</div><div className="kpi-user-org">AvoCarbon Group</div></div>
                    <Settings size={15} className="kpi-settings-icon" />
                </div>
            </aside>

            <div className="kpi-main">
                <div className="kpi-topbar">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button className="kpi-hamburger" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>Plant Analytics</div>
                            <div style={{ fontSize: 11, color: T.textSub, fontWeight: 500 }}>KPI Intelligence Platform</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: T.indigoL, border: `1px solid ${T.indigoM}`, borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                            <Zap size={13} color={T.indigo} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.indigo }}>{currentWeek}</span>
                        </div>
                        <button onClick={fetchAll} style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", color: T.textSub, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "border-color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = T.indigo} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="kpi-page-body" style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>

                    <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: "-1px", marginBottom: 4 }}>Plant Statistics</h1>
                        <p style={{ fontSize: 13, color: T.textSub, fontWeight: 500 }}>Comprehensive performance analytics · {currentWeek}</p>
                    </div>

                    {stats && (
                        <div className="kpi-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 28 }}>
                            <KpiCard idx={0} icon={Globe} accent={T.indigo} accentLight={T.indigoL} label="Total Plants" value={stats.total_plants} sub={`${stats.root_plants} root · ${stats.child_plants} child`} />
                            <KpiCard idx={1} icon={Target} accent={T.violet} accentLight={T.violetL} label="Total KPIs" value={stats.total_kpis} sub="Indicators defined" />
                            <KpiCard idx={2} icon={Users} accent={T.emerald} accentLight={T.emeraldL} label="Responsible Persons" value={stats.total_responsible} sub={`${stats.total_departments} departments`} />
                            <KpiCard idx={3} icon={Database} accent={T.amber} accentLight={T.amberL} label="Data Points" value={stats.total_kpi_values} sub={`${stats.total_weeks} weeks tracked`} />
                        </div>
                    )}

                    {/* ── Tabs ───────────────────────────────── */}
                    <div className="kpi-tabs" style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={BarChart3} label="Overview" />
                        <TabBtn active={tab === "departments"} onClick={() => setTab("departments")} icon={Users} label="Departments" />
                    </div>

                    {/* ════ OVERVIEW ═════════════════════════════════════════ */}
                    {tab === "overview" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
                            <div style={{ gridColumn: "span 8" }}>
                                <Card title="Root Plants — Responsible, Children & KPIs" icon={BarChart3} accent={T.indigo} idx={0}>
                                    <ResponsiveContainer width="100%" height={270}>
                                        <BarChart data={rootBarData} barGap={3} barCategoryGap="30%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: T.textSub, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: T.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<Tip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: T.textSub, paddingTop: 8 }} />
                                            <Bar dataKey="responsible" name="Responsible" fill={T.indigo} radius={[6, 6, 0, 0]} maxBarSize={22} />
                                            <Bar dataKey="children" name="Children" fill={T.sky} radius={[6, 6, 0, 0]} maxBarSize={22} />
                                            <Bar dataKey="kpis" name="KPIs" fill={T.emerald} radius={[6, 6, 0, 0]} maxBarSize={22} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 4" }}>
                                <Card title="Plants by Hierarchy Level" icon={Layers} accent={T.violet} idx={1}>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={levelData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={4}>
                                                {levelData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} stroke={T.white} strokeWidth={2} />)}
                                            </Pie>
                                            <Tooltip content={<Tip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 6 }}>
                                        {levelData.map((d, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textSub, fontWeight: 600 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_PALETTE[i % PIE_PALETTE.length], display: "inline-block" }} />{d.name}: <b style={{ color: T.text }}>{d.value}</b></span>)}
                                    </div>
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 12" }}>
                                <Card title="Root Plants Overview" icon={Building} accent={T.sky} idx={2}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>{["Plant", "Manager", "Responsible", "Child Plants", "KPIs"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>)}</tr></thead>
                                        <tbody>{rootPlants.map((p, i) => <tr key={p.plant_id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = T.slateL} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><td style={{ padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.name}</span></div></td><td style={{ padding: "14px 16px", fontSize: 12, color: T.textSub }}>{p.manager || "—"}</td><td style={{ padding: "14px 16px" }}><span style={{ background: T.indigoL, color: T.indigo, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.responsible_count || 0}</span></td><td style={{ padding: "14px 16px" }}><span style={{ background: T.skyL, color: T.sky, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.child_plant_count || 0}</span></td><td style={{ padding: "14px 16px" }}><span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.total_child_kpis || 0}</span></td></tr>)}</tbody>
                                    </table>
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 12", borderTop: `2px dashed ${T.border}`, margin: "4px 0" }} />
                         
                        
                        </div>
                    )}

                    {/* ════ PERFORMANCE ══════════════════════════════════════ */}
                    {tab === "performance" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
                            <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>Plant:</span>
                                {rootPlants.map(p => <button key={p.plant_id} onClick={() => setSelectedPlant(p.plant_id)} style={{ background: selectedPlant === p.plant_id ? T.indigo : T.white, border: `1.5px solid ${selectedPlant === p.plant_id ? T.indigo : T.border}`, borderRadius: 20, padding: "6px 18px", color: selectedPlant === p.plant_id ? T.white : T.textSub, cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit" }}>{p.name}</button>)}
                                {perfLoading && <RefreshCw size={14} color={T.indigo} style={{ animation: "spin 0.9s linear infinite" }} />}
                            </div>
                            <div style={{ gridColumn: "span 3" }}>
                                <Card title="Health Score" icon={Shield} accent={healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral} idx={0}>
                                    <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                                        <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-3px", color: healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral, lineHeight: 1 }}>{healthPct}%</div>
                                        <div style={{ fontSize: 12, color: T.textSub, fontWeight: 700, marginTop: 8 }}>{healthPct >= 70 ? "✓ Healthy" : healthPct >= 40 ? "⚠ At Risk" : "✕ Critical"}</div>
                                        <div style={{ marginTop: 16, height: 7, background: T.border, borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${healthPct}%`, height: "100%", borderRadius: 99, background: healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral, transition: "width 0.9s ease" }} /></div>
                                        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20 }}>{perfSummary.map((d, i) => <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: d.color }}>{d.value}</div><div style={{ fontSize: 10, color: T.textSub, fontWeight: 600, marginTop: 2 }}>{d.name}</div></div>)}</div>
                                    </div>
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 4" }}>
                                <Card title="Performance Distribution" icon={Target} accent={T.violet} idx={1}>
                                    {perfSummary.length === 0 ? <div style={{ textAlign: "center", color: T.textSub, padding: "40px 0", fontSize: 13 }}>No data for this week</div> : <ResponsiveContainer width="100%" height={230}><PieChart><Pie data={perfSummary} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={4}>{perfSummary.map((d, i) => <Cell key={i} fill={d.color} stroke={T.white} strokeWidth={2} />)}</Pie><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12, color: T.textSub }} /></PieChart></ResponsiveContainer>}
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 5" }}>
                                <Card title="On / Off Target by Indicator" icon={Activity} accent={T.coral} idx={2}>
                                    {perfByIndicator.length === 0 ? <div style={{ textAlign: "center", color: T.textSub, padding: "40px 0", fontSize: 13 }}>No data</div> : <ResponsiveContainer width="100%" height={230}><BarChart data={perfByIndicator} layout="vertical" barGap={2} barCategoryGap="25%"><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} /><XAxis type="number" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} width={120} /><Tooltip content={<Tip />} /><Bar dataKey="green" name="On Target" fill={T.emerald} radius={[0, 4, 4, 0]} stackId="a" maxBarSize={16} /><Bar dataKey="red" name="Off Target" fill={T.coral} radius={[0, 4, 4, 0]} stackId="a" maxBarSize={16} /></BarChart></ResponsiveContainer>}
                                </Card>
                            </div>
                            <div style={{ gridColumn: "span 12" }}>
                                <Card title="Indicator Status Detail" icon={Award} accent={T.amber} idx={3}>
                                    {perfData.length === 0 ? <div style={{ textAlign: "center", color: T.textSub, padding: 32, fontSize: 13 }}>Select a plant to view performance</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>{["Indicator", "Direction", "Status", "Count"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>)}</tr></thead><tbody>{perfData.map((d, i) => <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = T.slateL} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><td style={{ padding: "12px 14px", fontSize: 12, color: T.text, fontWeight: 600, maxWidth: 280 }}>{d.indicator_title?.replace(/^(Actual[- ]?)?-+\s*/i, "")}</td><td style={{ padding: "12px 14px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}>{d.good_direction === "UP" && <><TrendingUp size={14} color={T.emerald} /><span style={{ color: T.emerald }}>UP</span></>}{d.good_direction === "DOWN" && <><TrendingDown size={14} color={T.coral} /><span style={{ color: T.coral }}>DOWN</span></>}{!["UP", "DOWN"].includes(d.good_direction) && <span style={{ color: T.textSub }}>{d.good_direction}</span>}</span></td><td style={{ padding: "12px 14px" }}><PerfBadge status={d.performance_status} /></td><td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800, color: T.text }}>{d.count}</td></tr>)}</tbody></table></div>}
                                </Card>
                            </div>
                        </div>
                    )}


                

                    {/* ════ DEPARTMENTS (new tab) ════════════════════════════ */}
                    {tab === "departments" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>

                            {/* ── Filter Bar ─────────────────────────────────── */}
                            <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.textSub }}>
                                    <Filter size={14} />
                                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Filters</span>
                                </div>

                                {/* Plant filter */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: T.textSub, fontWeight: 700 }}>Plant:</span>
                                    {[{ id: "all", label: "All Plants" }, ...rootPlants.map(p => ({ id: String(p.plant_id), label: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name }))].map(opt => (
                                        <button key={opt.id} onClick={() => setDeptPlantFilter(opt.id)} style={{ background: deptPlantFilter === opt.id ? T.indigo : T.white, border: `1.5px solid ${deptPlantFilter === opt.id ? T.indigo : T.border}`, borderRadius: 20, padding: "5px 14px", color: deptPlantFilter === opt.id ? T.white : T.textSub, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit", boxShadow: deptPlantFilter === opt.id ? `0 3px 10px ${T.indigo}30` : "none" }}>{opt.label}</button>
                                    ))}
                                </div>

                                <div style={{ width: 1, height: 28, background: T.border }} />

                                {/* Week range */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <Calendar size={13} color={T.textSub} />
                                    <span style={{ fontSize: 11, color: T.textSub, fontWeight: 700 }}>Range:</span>

                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }} style={{ background: T.slateL, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", color: T.text, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                                            {deptWeekStart} <ChevronDown size={11} />
                                        </button>
                                        {showStartPicker && <WeekPickerDropdown value={deptWeekStart} onChange={setDeptWeekStart} onClose={() => setShowStartPicker(false)} />}
                                    </div>

                                    <span style={{ color: T.textSub, fontSize: 12 }}>→</span>

                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }} style={{ background: T.slateL, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", color: T.text, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                                            {deptWeekEnd} <ChevronDown size={11} />
                                        </button>
                                        {showEndPicker && <WeekPickerDropdown value={deptWeekEnd} onChange={setDeptWeekEnd} onClose={() => setShowEndPicker(false)} />}
                                    </div>

                                    <span style={{ background: T.indigoL, color: T.indigo, borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, border: `1px solid ${T.indigoM}` }}>
                                        {selectedWeeks.length} weeks
                                    </span>
                                </div>

                                <button onClick={fetchDeptWeekly} disabled={deptWeeklyLoading} style={{ marginLeft: "auto", background: T.indigo, border: "none", borderRadius: 8, padding: "7px 16px", color: T.white, cursor: deptWeeklyLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", opacity: deptWeeklyLoading ? 0.7 : 1 }}>
                                    <RefreshCw size={13} style={{ animation: deptWeeklyLoading ? "spin 0.9s linear infinite" : "none" }} />
                                    {deptWeeklyLoading ? `${deptWeeklyProgress}%` : "Load Data"}
                                </button>
                            </div>

                            {/* Progress bar */}
                            {deptWeeklyLoading && (
                                <div style={{ gridColumn: "span 12", height: 3, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ height: "100%", background: T.indigo, borderRadius: 99, width: `${deptWeeklyProgress}%`, transition: "width 0.3s ease" }} />
                                </div>
                            )}

                            {/* ── Summary cards ──────────────────────────────── */}
                            {!deptWeeklyLoading && deptAggregated.length > 0 && (
                                <>
                                    {[
                                        { top: T.emerald, label: "Global Health", val: `${deptGlobalSummary.health}%`, sub: `${fmt(deptGlobalSummary.on)} on · ${fmt(deptGlobalSummary.off)} off`, valColor: deptGlobalSummary.health >= 70 ? T.emerald : deptGlobalSummary.health >= 40 ? T.amber : T.coral },
                                        { top: T.indigo, label: "Departments Tracked", val: deptGlobalSummary.depts, sub: `across ${deptGlobalSummary.weeks} weeks`, valColor: T.indigo },
                                        { top: T.emerald, label: "Best Department", val: deptAggregated[0]?.health + "%" || "—", sub: deptAggregated[0]?.fullName || "—", valColor: T.emerald },
                                        { top: T.coral, label: "Needs Attention", val: ([...deptAggregated].sort((a, b) => a.health - b.health)[0]?.health || 0) + "%", sub: [...deptAggregated].sort((a, b) => a.health - b.health)[0]?.fullName || "—", valColor: T.coral },
                                    ].map((c, i) => (
                                        <div key={i} style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "18px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${c.top}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", animation: "fadeUp 0.5s ease both", animationDelay: `${i * 0.07}s` }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{c.label}</div>
                                            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-2px", color: c.valColor, lineHeight: 1, marginBottom: 6 }}>{c.val}</div>
                                            <div style={{ fontSize: 11, color: T.textSub, fontWeight: 500 }}>{c.sub}</div>
                                        </div>
                                    ))}

                                    {/* ── View mode toggle ──────────────────────── */}
                                    <div style={{ gridColumn: "span 12", display: "flex", gap: 8 }}>
                                        {[{ id: "table", icon: SlidersHorizontal, label: "Weekly Table" }, { id: "trend", icon: Activity, label: "Trend Chart" }, { id: "bar", icon: BarChart3, label: "Totals Chart" }].map(({ id, icon: Icon, label }) => (
                                            <button key={id} onClick={() => setDeptChartMode(id)} style={{ background: deptChartMode === id ? T.indigo : T.white, border: `1.5px solid ${deptChartMode === id ? T.indigo : T.border}`, borderRadius: 10, padding: "9px 20px", color: deptChartMode === id ? T.white : T.textSub, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "all 0.15s", boxShadow: deptChartMode === id ? `0 4px 14px ${T.indigo}35` : "none" }}>
                                                <Icon size={14} strokeWidth={2.5} /> {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ════ TABLE VIEW ════════════════════════════ */}
                                    {deptChartMode === "table" && (
                                        <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", overflowX: "auto", animation: "fadeUp 0.4s ease both" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                                <div style={{ background: `${T.violet}14`, borderRadius: 10, padding: 8 }}><Users size={16} color={T.violet} strokeWidth={2.5} /></div>
                                                <div>
                                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Department Totals — Per Week</h3>
                                                    <p style={{ fontSize: 11, color: T.textSub, margin: 0, marginTop: 2 }}>Total KPI data points (on + off + no data) per department per week</p>
                                                </div>
                                            </div>
                                            <div style={{ minWidth: Math.max(700, selectedWeeks.length * 90 + 260) }}>
                                                {/* Header row */}
                                                <div style={{ display: "grid", gridTemplateColumns: `240px 80px repeat(${selectedWeeks.length}, 1fr)`, gap: 4, marginBottom: 4, position: "sticky", top: 0, background: T.white, zIndex: 2 }}>
                                                    <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>Department</div>
                                                    <div style={{ padding: "8px 4px", fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>Health</div>
                                                    {selectedWeeks.map(w => (
                                                        <div key={w} style={{ padding: "8px 4px", fontSize: 9, fontWeight: 700, color: T.textSub, textAlign: "center", background: T.slateL, borderRadius: 6 }}>
                                                            {weekLabel(w)}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Dept rows */}
                                                {deptAggregated.map((dept, di) => {
                                                    const weekDataMap = deptWeekMatrix[dept.fullName] || {};
                                                    return (
                                                        <div key={dept.fullName} style={{ display: "grid", gridTemplateColumns: `240px 80px repeat(${selectedWeeks.length}, 1fr)`, gap: 4, marginBottom: 3 }}
                                                            onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                        >
                                                            {/* Dept name */}
                                                            <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                                                                <div style={{ width: 8, height: 8, borderRadius: 2, background: DEPT_COLORS[di % DEPT_COLORS.length], flexShrink: 0 }} />
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dept.fullName}>{dept.fullName}</span>
                                                            </div>

                                                            {/* Overall health */}
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <span style={{ background: dept.health >= 70 ? T.emeraldL : dept.health >= 40 ? T.amberL : T.coralL, color: dept.health >= 70 ? T.emerald : dept.health >= 40 ? T.amber : T.coral, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{dept.health}%</span>
                                                            </div>

                                                            {/* Per-week cells */}
                                                            {selectedWeeks.map(week => {
                                                                const wd = weekDataMap[week];
                                                                if (!wd) return <div key={week} style={{ background: T.border, borderRadius: 6, opacity: 0.3 }} />;
                                                                const h = wd.health;
                                                                const bg = h == null ? T.border : h >= 70 ? T.emeraldL : h >= 40 ? T.amberL : T.coralL;
                                                                const fc = h == null ? T.textSub : h >= 70 ? T.emerald : h >= 40 ? T.amber : T.coral;
                                                                return (
                                                                    <div key={week} className="dept-week-cell" style={{ background: bg, border: `1px solid ${fc}30` }} title={`${dept.fullName} · ${week}\nOn: ${wd.on} · Off: ${wd.off} · No Data: ${wd.noData}\nTotal: ${wd.total}`}>
                                                                        <div style={{ color: fc, fontSize: 11, fontWeight: 800 }}>{wd.total}</div>
                                                                        <div style={{ color: fc, fontSize: 9, fontWeight: 600, opacity: 0.8 }}>{h != null ? `${h}%` : "—"}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}

                                                {/* Totals footer row */}
                                                <div style={{ display: "grid", gridTemplateColumns: `240px 80px repeat(${selectedWeeks.length}, 1fr)`, gap: 4, marginTop: 8, borderTop: `2px solid ${T.border}`, paddingTop: 8 }}>
                                                    <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, color: T.text }}>Total (all depts)</div>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <span style={{ background: T.indigoL, color: T.indigo, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{deptGlobalSummary.health}%</span>
                                                    </div>
                                                    {selectedWeeks.map(week => {
                                                        const rows = deptWeeklyData[week] || [];
                                                        const weekTotal = rows.reduce((s, r) => s + (+r.on_target || 0) + (+r.off_target || 0) + (+r.no_data || 0), 0);
                                                        const weekOn = rows.reduce((s, r) => s + (+r.on_target || 0), 0);
                                                        const weekOff = rows.reduce((s, r) => s + (+r.off_target || 0), 0);
                                                        const weekH = (weekOn + weekOff) > 0 ? Math.round(weekOn / (weekOn + weekOff) * 100) : null;
                                                        return (
                                                            <div key={week} style={{ background: T.indigoL, borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
                                                                <div style={{ color: T.indigo, fontSize: 11, fontWeight: 800 }}>{weekTotal}</div>
                                                                <div style={{ color: T.indigo, fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{weekH != null ? `${weekH}%` : "—"}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ════ TREND VIEW ════════════════════════════ */}
                                    {deptChartMode === "trend" && (
                                        <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", animation: "fadeUp 0.4s ease both" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                                <div style={{ background: `${T.sky}14`, borderRadius: 10, padding: 8 }}><Activity size={16} color={T.sky} strokeWidth={2.5} /></div>
                                                <div>
                                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Health % Trend — By Department</h3>
                                                    <p style={{ fontSize: 11, color: T.textSub, margin: 0, marginTop: 2 }}>Percentage of KPIs on target each week · dotted line = 70% threshold</p>
                                                </div>
                                            </div>
                                            <ResponsiveContainer width="100%" height={360}>
                                                <LineChart data={deptTrendData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                                    <XAxis dataKey="week" tick={{ fill: T.textSub, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<Tip />} />
                                                    <ReferenceLine y={70} stroke={`${T.emerald}50`} strokeDasharray="6 3" label={{ value: "70%", fill: T.emerald, fontSize: 10, fontWeight: 700 }} />
                                                    <Legend wrapperStyle={{ fontSize: 11, color: T.textSub, paddingTop: 12 }} />
                                                    {allDepts.slice(0, 12).map((dept, i) => (
                                                        <Line key={dept} type="monotone" dataKey={dept} name={dept.length > 22 ? dept.slice(0, 22) + "…" : dept} stroke={DEPT_COLORS[i % DEPT_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* ════ BAR TOTALS VIEW ═══════════════════════ */}
                                    {deptChartMode === "bar" && (
                                        <>
                                            <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", animation: "fadeUp 0.4s ease both" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                                    <div style={{ background: `${T.emerald}14`, borderRadius: 10, padding: 8 }}><BarChart3 size={16} color={T.emerald} strokeWidth={2.5} /></div>
                                                    <div>
                                                        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Cumulative On / Off Target — By Department</h3>
                                                        <p style={{ fontSize: 11, color: T.textSub, margin: 0, marginTop: 2 }}>Aggregated totals across {selectedWeeks.length} selected weeks</p>
                                                    </div>
                                                </div>
                                                <ResponsiveContainer width="100%" height={Math.max(300, deptBarData.length * 36)}>
                                                    <BarChart data={deptBarData} layout="vertical" barGap={2} barCategoryGap="22%">
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                                        <XAxis type="number" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                                        <YAxis dataKey="name" type="category" tick={{ fill: T.textSub, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={150} />
                                                        <Tooltip content={<AnalyticsTip />} />
                                                        <Legend wrapperStyle={{ fontSize: 12, color: T.textSub, paddingTop: 8 }} />
                                                        <Bar dataKey="on_target" name="On Target" fill={T.emerald} stackId="s" maxBarSize={22} />
                                                        <Bar dataKey="off_target" name="Off Target" fill={T.coral} stackId="s" maxBarSize={22} radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Summary table */}
                                            <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", animation: "fadeUp 0.4s ease both", animationDelay: "0.1s" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                                                    <div style={{ background: `${T.amber}14`, borderRadius: 10, padding: 8 }}><Award size={16} color={T.amber} strokeWidth={2.5} /></div>
                                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Department Rankings</h3>
                                                </div>
                                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                                                            {["#", "Department", "On Target", "Off Target", "No Data", "Total", "Health"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {deptAggregated.map((d, i) => {
                                                            const medalBg = i === 0 ? T.amber : i === 1 ? "#94A3B8" : i === 2 ? "#CD7F32" : T.border;
                                                            const medalText = i < 3 ? T.white : T.textSub;
                                                            return (
                                                                <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = T.slateL} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                                    <td style={{ padding: "12px 12px" }}><div style={{ width: 24, height: 24, borderRadius: 6, background: medalBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: medalText }}>{i + 1}</div></td>
                                                                    <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 700, color: T.text }}>{d.fullName}</td>
                                                                    <td style={{ padding: "12px 12px" }}><span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.on_target.toLocaleString()}</span></td>
                                                                    <td style={{ padding: "12px 12px" }}><span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.off_target.toLocaleString()}</span></td>
                                                                    <td style={{ padding: "12px 12px", fontSize: 12, color: T.textSub, fontWeight: 600 }}>{d.no_data.toLocaleString()}</td>
                                                                    <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 800, color: T.text }}>{d.total.toLocaleString()}</td>
                                                                    <td style={{ padding: "12px 12px", minWidth: 160 }}><HealthBar pct={d.health} /></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Empty state */}
                            {!deptWeeklyLoading && deptAggregated.length === 0 && (
                                <div style={{ gridColumn: "span 12", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 32px", textAlign: "center" }}>
                                    <Users size={48} color={T.border} style={{ marginBottom: 16 }} />
                                    <h4 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>No Department Data</h4>
                                    <p style={{ fontSize: 13, color: T.textSub }}>Select a week range and click <b>Load Data</b> to fetch department performance.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PlantStatsDashboard;
