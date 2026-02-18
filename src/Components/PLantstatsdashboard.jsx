import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
    Building, TrendingUp, TrendingDown, Target, Users, Activity,
    BarChart3, Layers, Award, AlertTriangle, CheckCircle, RefreshCw,
    Minus, Factory, Globe, ChevronRight,
    Zap, Shield, Database, PieChartIcon, SlidersHorizontal,
    LayoutDashboard, Settings, Menu, X
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
const API = "https://kpi-form.azurewebsites.net/api";
const fmt = n => Number(n || 0).toLocaleString();

// ─── Custom Tooltip ──────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: T.white, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "12px 16px",
            boxShadow: "0 10px 40px rgba(15,23,42,0.12)", minWidth: 140
        }}>
            <p style={{ color: T.textSub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
            {payload.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || T.indigo }} />
                    <span style={{ fontSize: 12, color: T.textSub }}>{p.name}:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Analytics Custom Tooltip ────────────────────────────────
const AnalyticsTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    const green = payload.find(p => p.dataKey === "on_target")?.value || 0;
    const pct = total > 0 ? Math.round((green / total) * 100) : 0;
    return (
        <div style={{
            background: T.white, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "14px 18px",
            boxShadow: "0 12px 40px rgba(15,23,42,0.14)", minWidth: 180
        }}>
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
                <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: pct >= 70 ? T.emerald : pct >= 40 ? T.amber : T.coral
                }}>{pct}%</span>
            </div>
        </div>
    );
};

// ─── KPI Card ────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, accent, accentLight, idx }) => (
    <div style={{
        background: T.white, borderRadius: 18,
        padding: "22px 24px 20px",
        border: `1px solid ${T.border}`,
        borderTop: `4px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)",
        transition: "transform 0.2s, box-shadow 0.2s",
        animation: `fadeUp 0.5s ease both`,
        animationDelay: `${idx * 0.08}s`,
    }}
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

// ─── Card Shell ──────────────────────────────────────────────
const Card = ({ title, icon: Icon, accent = T.indigo, children, span, idx = 0 }) => (
    <div style={{
        background: T.white, borderRadius: 18,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
        padding: "24px 24px 20px",
        gridColumn: span ? `span ${span}` : undefined,
        animation: `fadeUp 0.5s ease both`,
        animationDelay: `${idx * 0.07 + 0.15}s`,
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ background: `${accent}14`, borderRadius: 10, padding: 8 }}>
                <Icon size={17} color={accent} strokeWidth={2.5} />
            </div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>{title}</h3>
        </div>
        {children}
    </div>
);

// ─── Tab Button ──────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} style={{
        background: active ? T.indigo : T.white,
        border: `1.5px solid ${active ? T.indigo : T.border}`,
        borderRadius: 10, padding: "9px 22px",
        color: active ? T.white : T.textSub,
        cursor: "pointer", fontWeight: 700, fontSize: 13,
        display: "flex", alignItems: "center", gap: 7,
        transition: "all 0.16s", fontFamily: "inherit",
        boxShadow: active ? `0 4px 14px ${T.indigo}35` : "none"
    }}>
        <Icon size={15} strokeWidth={2.5} /> {label}
    </button>
);

// ─── Perf Badge ──────────────────────────────────────────────
const PerfBadge = ({ status }) => {
    const map = {
        GREEN: { bg: T.emeraldL, color: T.emerald, label: "On Target", Icon: CheckCircle },
        RED: { bg: T.coralL, color: T.coral, label: "Off Target", Icon: AlertTriangle },
        "NO DATA": { bg: T.slateL, color: T.slate, label: "No Data", Icon: Minus },
    };
    const c = map[status] || map["NO DATA"];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: c.bg, color: c.color,
            borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700
        }}>
            <c.Icon size={11} strokeWidth={2.5} /> {c.label}
        </span>
    );
};

// ─── Health Bar ───────────────────────────────────────────────
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

    // Performance tab state
    const [perfData, setPerfData] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [perfLoading, setPerfLoading] = useState(false);

    // Analytics tab state
    const [plantPerf, setPlantPerf] = useState([]);
    const [deptPerf, setDeptPerf] = useState([]);
    const [analyticsPlantFilter, setAnalyticsPlantFilter] = useState("all");
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [plantView, setPlantView] = useState("all"); // "all" | "root" | plant_id

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
        } catch (e) { console.error(e); setPlantPerf([]); }
        setAnalyticsLoading(false);
    };

    const fetchDeptPerf = async () => {
        try {
            const params = analyticsPlantFilter === "all"
                ? `week=${currentWeek}`
                : `week=${currentWeek}&plantId=${analyticsPlantFilter}`;
            const res = await axios.get(`${API}/performance/by-departments?${params}`);
            setDeptPerf(res.data);
        } catch (e) { console.error(e); setDeptPerf([]); }
    };

    // ── derived ──────────────────────────────────────────────
    const levelData = useMemo(() => {
        const map = {};
        hierarchy.forEach(p => { const l = `L${p.level}`; map[l] = (map[l] || 0) + 1; });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [hierarchy]);

    const rootBarData = useMemo(() =>
        rootPlants.map(p => ({
            name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
            fullName: p.name,
            responsible: +p.responsible_count || 0,
            children: +p.child_plant_count || 0,
            kpis: +p.total_child_kpis || 0,
        })), [rootPlants]);

    const perfSummary = useMemo(() => {
        const g = perfData.filter(d => d.performance_status === "GREEN").reduce((s, d) => s + +d.count, 0);
        const r = perfData.filter(d => d.performance_status === "RED").reduce((s, d) => s + +d.count, 0);
        const n = perfData.filter(d => d.performance_status === "NO DATA").reduce((s, d) => s + +d.count, 0);
        return [
            { name: "On Target", value: g, color: T.emerald },
            { name: "Off Target", value: r, color: T.coral },
            { name: "No Data", value: n, color: "#CBD5E1" },
        ].filter(d => d.value > 0);
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

    // Analytics derived data
    const filteredPlantPerf = useMemo(() => {
        if (plantView === "all") return plantPerf;
        if (plantView === "root") return plantPerf.filter(p => !p.parent_id);
        return plantPerf.filter(p => String(p.plant_id) === String(plantView));
    }, [plantPerf, plantView]);

    const plantChartData = useMemo(() =>
        filteredPlantPerf.map(p => ({
            name: p.plant_name.length > 16 ? p.plant_name.slice(0, 16) + "…" : p.plant_name,
            fullName: p.plant_name,
            on_target: +p.on_target || 0,
            off_target: +p.off_target || 0,
            no_data: +p.no_data || 0,
            total: +p.total || 0,
            health: +p.total > 0
                ? Math.round(((+p.on_target) / (+p.on_target + +p.off_target || 1)) * 100)
                : 0,
        })), [filteredPlantPerf]);

    const deptChartData = useMemo(() =>
        deptPerf.slice(0, 12).map(d => ({
            name: d.department_name.length > 18 ? d.department_name.slice(0, 18) + "…" : d.department_name,
            fullName: d.department_name,
            on_target: +d.on_target || 0,
            off_target: +d.off_target || 0,
            no_data: +d.no_data || 0,
            health: +d.health_pct || 0,
        })), [deptPerf]);

    const analyticsKPIs = useMemo(() => {
        const allPlants = plantPerf;
        const totalOn = allPlants.reduce((s, p) => s + (+p.on_target || 0), 0);
        const totalOff = allPlants.reduce((s, p) => s + (+p.off_target || 0), 0);
        const totalNoData = allPlants.reduce((s, p) => s + (+p.no_data || 0), 0);
        const globalHealth = (totalOn + totalOff) > 0 ? Math.round(totalOn / (totalOn + totalOff) * 100) : 0;
        const worstPlant = [...allPlants].sort((a, b) => (+b.off_target || 0) - (+a.off_target || 0))[0];
        const bestPlant = [...allPlants].filter(p => (+p.on_target + +p.off_target) > 0)
            .sort((a, b) => {
                const hA = +a.on_target / (+a.on_target + +a.off_target);
                const hB = +b.on_target / (+b.on_target + +b.off_target);
                return hB - hA;
            })[0];
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

        /* ── Sidebar ─────────────────────────────── */
        .kpi-sidebar {
          position: fixed; top: 0; left: 0; height: 100vh; width: 248px;
          background: #12152b;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          box-shadow: 4px 0 24px rgba(0,0,0,0.35);
          z-index: 200;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .kpi-sidebar-header {
          display: flex; align-items: center; gap: 12px;
          padding: 22px 20px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .kpi-sidebar-logo {
          background: linear-gradient(135deg, #6c63ff 0%, #4f46e5 100%);
          color: #fff; border-radius: 12px; padding: 9px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
          box-shadow: 0 4px 14px rgba(99,85,255,0.45);
        }
        .kpi-brand-name {
          font-size: 15px; font-weight: 800; color: #ffffff;
          letter-spacing: -0.4px; line-height: 1.2;
        }
        .kpi-brand-sub {
          font-size: 10px; color: rgba(255,255,255,0.38);
          font-weight: 600; margin-top: 2px;
          text-transform: uppercase; letter-spacing: 1px;
        }

        .kpi-sidebar-nav { flex: 1; overflow-y: auto; padding: 22px 14px 16px; }
        .kpi-sidebar-nav::-webkit-scrollbar { width: 0; }
        .kpi-nav-section-title {
          font-size: 10px; font-weight: 700;
          color: rgba(255,255,255,0.28);
          text-transform: uppercase; letter-spacing: 1.4px;
          padding: 0 10px; margin-bottom: 10px;
        }
        .kpi-nav-item {
          display: flex; align-items: center; gap: 11px;
          width: 100%; padding: 11px 14px; border-radius: 10px;
          border: none; background: transparent; cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.45);
          transition: all 0.18s ease; text-align: left;
          margin-bottom: 3px; position: relative;
        }
        .kpi-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
        }
        .kpi-nav-item.active {
          background: rgba(99,85,255,0.22);
          color: #a89dff;
        }
        .kpi-nav-item.active::after {
          content: '';
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          width: 7px; height: 7px; border-radius: 50%;
          background: #7c6fff;
          box-shadow: 0 0 8px #7c6fff;
        }
        .kpi-nav-item.active svg { color: #a89dff !important; }

        .kpi-sidebar-footer {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 18px;
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .kpi-user-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #f857a6 0%, #a855f7 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(168,85,247,0.5);
        }
        .kpi-user-name {
          font-size: 11px; font-weight: 800; color: #ffffff;
          line-height: 1.3;
        }
        .kpi-user-org {
          font-size: 10px; color: rgba(255,255,255,0.35);
          font-weight: 500; margin-top: 1px;
        }
        .kpi-settings-icon {
          margin-left: auto; cursor: pointer; flex-shrink: 0;
          color: rgba(255,255,255,0.3); transition: color 0.15s;
        }
        .kpi-settings-icon:hover { color: rgba(255,255,255,0.7); }
        /* sidebar close btn (mobile) */
        .kpi-sidebar-close {
          margin-left: auto; background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.35); display: flex; padding: 4px;
          transition: color 0.15s;
        }
        .kpi-sidebar-close:hover { color: rgba(255,255,255,0.8); }

        /* ── Overlay (mobile) ────────────────────── */
        .kpi-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(15,23,42,0.4); z-index: 199;
          backdrop-filter: blur(2px);
          animation: fadeOverlay 0.2s ease;
        }
        @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }

        /* ── Main area ───────────────────────────── */
        .kpi-main { flex: 1; margin-left: 248px; min-width: 0; display: flex; flex-direction: column; }

        /* ── Top bar ─────────────────────────────── */
        .kpi-topbar {
          background: ${T.white}; border-bottom: 1px solid ${T.border};
          padding: 0 28px; display: flex; align-items: center;
          justify-content: space-between; height: 64px; flex-shrink: 0;
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 1px 0 rgba(0,0,0,0.04);
        }
        .kpi-hamburger {
          display: none; background: none; border: 1.5px solid ${T.border};
          border-radius: 8px; padding: 7px; cursor: pointer;
          color: ${T.textSub}; align-items: center; justify-content: center;
          transition: border-color 0.15s;
        }
        .kpi-hamburger:hover { border-color: ${T.indigo}; color: ${T.indigo}; }

        /* ── Responsive ──────────────────────────── */
        @media (max-width: 1024px) {
          .kpi-main { margin-left: 0; }
          .kpi-sidebar { transform: translateX(-100%); }
          .kpi-sidebar.open { transform: translateX(0); box-shadow: 4px 0 32px rgba(15,23,42,0.16); }
          .kpi-overlay { display: block; }
          .kpi-hamburger { display: flex; }
          .kpi-topbar { padding: 0 18px; }
        }
        @media (max-width: 640px) {
          .kpi-page-body { padding: 18px 14px !important; }
          .kpi-kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
          .kpi-tabs { flex-wrap: wrap; gap: 6px !important; }
          .kpi-tabs button { padding: 8px 14px !important; font-size: 12px !important; }
        }
      `}</style>

            {/* ── Mobile overlay ───────────────────────────────── */}
            {sidebarOpen && (
                <div className="kpi-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ══ SIDEBAR ══════════════════════════════════════════ */}
            <aside className={`kpi-sidebar${sidebarOpen ? " open" : ""}`}>

                {/* Header */}
                <div className="kpi-sidebar-header">
                    <div className="kpi-sidebar-logo">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <div className="kpi-brand-name">KPI Dashboard</div>
                        <div className="kpi-brand-sub">Plant Management</div>
                    </div>
                    <button className="kpi-sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={16} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="kpi-sidebar-nav">
                    <div className="kpi-nav-section-title">Navigation</div>
                    <button
                        className={`kpi-nav-item${location.pathname === "/" ? " active" : ""}`}
                        onClick={() => { navigate("/"); setSidebarOpen(false); }}
                    >
                        <LayoutDashboard size={17} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`kpi-nav-item${location.pathname === "/dashboard" ? " active" : ""}`}
                        onClick={() => { navigate("/dashboard"); setSidebarOpen(false); }}
                    >
                        <BarChart3 size={17} />
                        <span>Statistics</span>
                    </button>
                </nav>

                {/* Footer */}
                <div className="kpi-sidebar-footer">
                    <div className="kpi-user-avatar">AD</div>
                    <div>
                        <div className="kpi-user-name">KPI TRACKING SYSTEM</div>
                        <div className="kpi-user-org">AvoCarbon Group</div>
                    </div>
                    <Settings size={15} className="kpi-settings-icon" />
                </div>
            </aside>

            {/* ══ MAIN AREA ════════════════════════════════════════ */}
            <div className="kpi-main">

                {/* ── Sticky Top Bar ──────────────────────────────── */}
                <div className="kpi-topbar">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Hamburger — shown on mobile via CSS */}
                        <button className="kpi-hamburger" onClick={() => setSidebarOpen(true)}>
                            <Menu size={18} />
                        </button>
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
                        <button onClick={fetchAll} style={{
                            background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8,
                            padding: "7px 14px", color: T.textSub, cursor: "pointer",
                            fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                            fontFamily: "inherit", transition: "border-color 0.15s"
                        }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = T.indigo}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Page Body ───────────────────────────────────── */}
                <div className="kpi-page-body" style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>

                {/* Page heading */}
                <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: "-1px", marginBottom: 4 }}>
                        Plant Statistics
                    </h1>
                    <p style={{ fontSize: 13, color: T.textSub, fontWeight: 500 }}>
                        Comprehensive performance analytics · {currentWeek}
                    </p>
                </div>

                {/* KPI Cards */}
                {stats && (
                    <div className="kpi-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 28 }}>
                        <KpiCard idx={0} icon={Globe} accent={T.indigo} accentLight={T.indigoL} label="Total Plants" value={stats.total_plants} sub={`${stats.root_plants} root · ${stats.child_plants} child`} />
                        <KpiCard idx={1} icon={Target} accent={T.violet} accentLight={T.violetL} label="Total KPIs" value={stats.total_kpis} sub="Indicators defined" />
                        <KpiCard idx={2} icon={Users} accent={T.emerald} accentLight={T.emeraldL} label="Responsible Persons" value={stats.total_responsible} sub={`${stats.total_departments} departments`} />
                        <KpiCard idx={3} icon={Database} accent={T.amber} accentLight={T.amberL} label="Data Points" value={stats.total_kpi_values} sub={`${stats.total_weeks} weeks tracked`} />
                    </div>
                )}

                {/* Tabs */}
                <div className="kpi-tabs" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={BarChart3} label="Overview" />
                    <TabBtn active={tab === "performance"} onClick={() => setTab("performance")} icon={Activity} label="Performance" />
                    <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")} icon={PieChartIcon} label="Analytics" />
                    <TabBtn active={tab === "hierarchy"} onClick={() => setTab("hierarchy")} icon={Layers} label="Hierarchy" />
                </div>

                {/* ═══════════ OVERVIEW ═══════════ */}
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
                                    {levelData.map((d, i) => (
                                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textSub, fontWeight: 600 }}>
                                            <span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_PALETTE[i % PIE_PALETTE.length], display: "inline-block" }} />
                                            {d.name}: <b style={{ color: T.text }}>{d.value}</b>
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 12" }}>
                            <Card title="Root Plants Overview" icon={Building} accent={T.sky} idx={2}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                                            {["Plant", "Manager", "Responsible", "Child Plants", "KPIs"].map(h => (
                                                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rootPlants.map((p, i) => (
                                            <tr key={p.plant_id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 16px", fontSize: 12, color: T.textSub }}>{p.manager || "—"}</td>
                                                <td style={{ padding: "14px 16px" }}><span style={{ background: T.indigoL, color: T.indigo, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.responsible_count || 0}</span></td>
                                                <td style={{ padding: "14px 16px" }}><span style={{ background: T.skyL, color: T.sky, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.child_plant_count || 0}</span></td>
                                                <td style={{ padding: "14px 16px" }}><span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{p.total_child_kpis || 0}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        </div>

                        {/* ══ DIVIDER ══════════════════════════════════════════ */}
                        <div style={{ gridColumn: "span 12", borderTop: `2px dashed ${T.border}`, margin: "4px 0" }} />

                        {/* ── Overview Analytics: summary KPI row ── */}
                        <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 10, marginBottom: -6 }}>
                            <div style={{ background: `${T.emerald}14`, borderRadius: 10, padding: 8 }}>
                                <Activity size={17} color={T.emerald} strokeWidth={2.5} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>
                                Performance Summary — {currentWeek}
                            </h3>
                            {analyticsLoading && <RefreshCw size={13} color={T.indigo} style={{ animation: "spin 0.9s linear infinite", marginLeft: 6 }} />}
                        </div>

                        {/* 4 summary mini-cards */}
                        <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "18px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.emerald}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", animation: "fadeUp 0.5s ease both", animationDelay: "0.28s" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Global Health</div>
                            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-2px", color: analyticsKPIs.globalHealth >= 70 ? T.emerald : analyticsKPIs.globalHealth >= 40 ? T.amber : T.coral, lineHeight: 1, marginBottom: 8 }}>{analyticsKPIs.globalHealth}%</div>
                            <HealthBar pct={analyticsKPIs.globalHealth} />
                            <div style={{ marginTop: 12, display: "flex", gap: 14 }}>
                                <div><div style={{ fontSize: 18, fontWeight: 800, color: T.emerald }}>{fmt(analyticsKPIs.totalOn)}</div><div style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}>On Target</div></div>
                                <div><div style={{ fontSize: 18, fontWeight: 800, color: T.coral }}>{fmt(analyticsKPIs.totalOff)}</div><div style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}>Off Target</div></div>
                            </div>
                        </div>

                        <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "18px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.coral}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", animation: "fadeUp 0.5s ease both", animationDelay: "0.34s" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Most Off-Target Plant</div>
                            {analyticsKPIs.worstPlant ? <>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{analyticsKPIs.worstPlant.plant_name}</div>
                                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                    <span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{analyticsKPIs.worstPlant.off_target} off</span>
                                    <span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{analyticsKPIs.worstPlant.on_target} on</span>
                                </div>
                                <HealthBar pct={Math.round(+analyticsKPIs.worstPlant.on_target / (+analyticsKPIs.worstPlant.on_target + +analyticsKPIs.worstPlant.off_target || 1) * 100)} />
                            </> : <div style={{ color: T.textSub, fontSize: 13 }}>—</div>}
                        </div>

                        <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "18px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.emerald}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", animation: "fadeUp 0.5s ease both", animationDelay: "0.40s" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Best Performing Plant</div>
                            {analyticsKPIs.bestPlant ? <>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{analyticsKPIs.bestPlant.plant_name}</div>
                                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                    <span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{analyticsKPIs.bestPlant.on_target} on</span>
                                    <span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{analyticsKPIs.bestPlant.off_target} off</span>
                                </div>
                                <HealthBar pct={Math.round(+analyticsKPIs.bestPlant.on_target / (+analyticsKPIs.bestPlant.on_target + +analyticsKPIs.bestPlant.off_target || 1) * 100)} />
                            </> : <div style={{ color: T.textSub, fontSize: 13 }}>—</div>}
                        </div>

                        <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "18px 20px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.slate}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", animation: "fadeUp 0.5s ease both", animationDelay: "0.46s" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Coverage</div>
                            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-2px", color: T.text, lineHeight: 1, marginBottom: 4 }}>{plantPerf.length}</div>
                            <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>plants reporting</div>
                            <div style={{ marginTop: 8, fontSize: 12, color: T.slate, fontWeight: 600 }}>{fmt(analyticsKPIs.totalNoData)} missing data points</div>
                        </div>

                        {/* ── Chart: On/Off Target per Plant ── */}
                        <div style={{ gridColumn: "span 12" }}>
                            <div style={{ background: T.white, borderRadius: 18, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)", padding: "24px 24px 20px", animation: "fadeUp 0.5s ease both", animationDelay: "0.52s" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ background: `${T.indigo}14`, borderRadius: 10, padding: 8 }}>
                                            <BarChart3 size={17} color={T.indigo} strokeWidth={2.5} />
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>On Target vs Off Target — By Plant</h3>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <SlidersHorizontal size={13} color={T.textSub} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginRight: 4 }}>Show:</span>
                                        {[
                                            { id: "all", label: "All Plants" },
                                            { id: "root", label: "Root Only" },
                                            ...rootPlants.map(p => ({ id: String(p.plant_id), label: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name }))
                                        ].map(opt => (
                                            <button key={opt.id} onClick={() => setPlantView(opt.id)} style={{
                                                background: plantView === opt.id ? T.indigo : T.white,
                                                border: `1.5px solid ${plantView === opt.id ? T.indigo : T.border}`,
                                                borderRadius: 20, padding: "5px 14px",
                                                color: plantView === opt.id ? T.white : T.textSub,
                                                cursor: "pointer", fontSize: 11, fontWeight: 700,
                                                transition: "all 0.15s", fontFamily: "inherit",
                                            }}>{opt.label}</button>
                                        ))}
                                    </div>
                                </div>
                                {plantChartData.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: "50px 0", fontSize: 13 }}>No performance data available for {currentWeek}</div>
                                    : <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={plantChartData} barGap={3} barCategoryGap="28%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: T.textSub, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={plantChartData.length > 10 ? -30 : 0} textAnchor={plantChartData.length > 10 ? "end" : "middle"} height={plantChartData.length > 10 ? 54 : 30} />
                                            <YAxis tick={{ fill: T.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<AnalyticsTip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: T.textSub, paddingTop: 8 }} />
                                            <Bar dataKey="on_target" name="On Target" fill={T.emerald} radius={[6, 6, 0, 0]} maxBarSize={28} stackId="s" />
                                            <Bar dataKey="off_target" name="Off Target" fill={T.coral} maxBarSize={28} stackId="s" />
                                            <Bar dataKey="no_data" name="No Data" fill="#CBD5E1" radius={[0, 0, 0, 0]} maxBarSize={28} stackId="s" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                            </div>
                        </div>

                        {/* ── Plant health ranking + Dept chart side by side ── */}
                        <div style={{ gridColumn: "span 5", animation: "fadeUp 0.5s ease both", animationDelay: "0.58s" }}>
                            <Card title="Plant Health Ranking" icon={Award} accent={T.amber} idx={8}>
                                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                                    {[...plantChartData]
                                        .filter(p => p.on_target + p.off_target > 0)
                                        .sort((a, b) => b.health - a.health)
                                        .map((p, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: i === 0 ? T.amber : i === 1 ? "#94A3B8" : i === 2 ? "#CD7F32" : T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? T.white : T.textSub }}>{i + 1}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>{p.fullName || p.name}</div>
                                                    <HealthBar pct={p.health} />
                                                </div>
                                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                    <div style={{ fontSize: 11, color: T.emerald, fontWeight: 700 }}>{p.on_target} ✓</div>
                                                    <div style={{ fontSize: 11, color: T.coral, fontWeight: 700 }}>{p.off_target} ✗</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </Card>
                        </div>

                        {/* ── Department chart ── */}
                        <div style={{ gridColumn: "span 7", animation: "fadeUp 0.5s ease both", animationDelay: "0.62s" }}>
                            <div style={{ background: T.white, borderRadius: 18, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)", padding: "24px 24px 20px", height: "100%" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ background: `${T.violet}14`, borderRadius: 10, padding: 8 }}>
                                            <Users size={17} color={T.violet} strokeWidth={2.5} />
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>On / Off Target — By Department</h3>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <SlidersHorizontal size={13} color={T.textSub} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginRight: 2 }}>Plant:</span>
                                        <button onClick={() => setAnalyticsPlantFilter("all")} style={{ background: analyticsPlantFilter === "all" ? T.violet : T.white, border: `1.5px solid ${analyticsPlantFilter === "all" ? T.violet : T.border}`, borderRadius: 20, padding: "5px 14px", color: analyticsPlantFilter === "all" ? T.white : T.textSub, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit" }}>All</button>
                                        {rootPlants.map(p => (
                                            <button key={p.plant_id} onClick={() => setAnalyticsPlantFilter(String(p.plant_id))} style={{ background: analyticsPlantFilter === String(p.plant_id) ? T.violet : T.white, border: `1.5px solid ${analyticsPlantFilter === String(p.plant_id) ? T.violet : T.border}`, borderRadius: 20, padding: "5px 14px", color: analyticsPlantFilter === String(p.plant_id) ? T.white : T.textSub, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit" }}>{p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name}</button>
                                        ))}
                                    </div>
                                </div>
                                {deptChartData.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: "50px 0", fontSize: 13 }}>No department data available</div>
                                    : <ResponsiveContainer width="100%" height={290}>
                                        <BarChart data={deptChartData} layout="vertical" barGap={2} barCategoryGap="22%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fill: T.textSub, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={130} />
                                            <Tooltip content={<AnalyticsTip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: T.textSub }} />
                                            <Bar dataKey="on_target" name="On Target" fill={T.emerald} stackId="s" maxBarSize={18} />
                                            <Bar dataKey="off_target" name="Off Target" fill={T.coral} stackId="s" maxBarSize={18} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                            </div>
                        </div>

                        {/* ── Department detail table ── */}
                        <div style={{ gridColumn: "span 12", animation: "fadeUp 0.5s ease both", animationDelay: "0.66s" }}>
                            <Card title="Department Performance Detail" icon={Building} accent={T.sky} idx={9}>
                                {deptChartData.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: 32, fontSize: 13 }}>No data</div>
                                    : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                                                {["Department", "On Target", "Off Target", "No Data", "Total", "Health"].map(h => (
                                                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deptPerf.map((d, i) => (
                                                <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                >
                                                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.text }}>{d.department_name}</td>
                                                    <td style={{ padding: "12px 14px" }}><span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.on_target}</span></td>
                                                    <td style={{ padding: "12px 14px" }}><span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.off_target}</span></td>
                                                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.textSub, fontWeight: 600 }}>{d.no_data}</td>
                                                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 800, color: T.text }}>{d.total}</td>
                                                    <td style={{ padding: "12px 14px", minWidth: 160 }}><HealthBar pct={+d.health_pct || 0} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                }
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════ PERFORMANCE ═══════════ */}
                {tab === "performance" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
                        <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>Plant:</span>
                            {rootPlants.map(p => (
                                <button key={p.plant_id} onClick={() => setSelectedPlant(p.plant_id)} style={{
                                    background: selectedPlant === p.plant_id ? T.indigo : T.white,
                                    border: `1.5px solid ${selectedPlant === p.plant_id ? T.indigo : T.border}`,
                                    borderRadius: 20, padding: "6px 18px",
                                    color: selectedPlant === p.plant_id ? T.white : T.textSub,
                                    cursor: "pointer", fontSize: 12, fontWeight: 700,
                                    transition: "all 0.15s", fontFamily: "inherit",
                                    boxShadow: selectedPlant === p.plant_id ? `0 4px 14px ${T.indigo}30` : "none"
                                }}>{p.name}</button>
                            ))}
                            {perfLoading && <RefreshCw size={14} color={T.indigo} style={{ animation: "spin 0.9s linear infinite" }} />}
                        </div>

                        <div style={{ gridColumn: "span 3" }}>
                            <Card title="Health Score" icon={Shield} accent={healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral} idx={0}>
                                <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                                    <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-3px", color: healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral, lineHeight: 1 }}>
                                        {healthPct}%
                                    </div>
                                    <div style={{ fontSize: 12, color: T.textSub, fontWeight: 700, marginTop: 8 }}>
                                        {healthPct >= 70 ? "✓ Healthy" : healthPct >= 40 ? "⚠ At Risk" : "✕ Critical"}
                                    </div>
                                    <div style={{ marginTop: 16, height: 7, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                                        <div style={{ width: `${healthPct}%`, height: "100%", borderRadius: 99, background: healthPct >= 70 ? T.emerald : healthPct >= 40 ? T.amber : T.coral, transition: "width 0.9s ease" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20 }}>
                                        {perfSummary.map((d, i) => (
                                            <div key={i} style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: d.color }}>{d.value}</div>
                                                <div style={{ fontSize: 10, color: T.textSub, fontWeight: 600, marginTop: 2 }}>{d.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 4" }}>
                            <Card title="Performance Distribution" icon={Target} accent={T.violet} idx={1}>
                                {perfSummary.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: "40px 0", fontSize: 13 }}>No data for this week</div>
                                    : <ResponsiveContainer width="100%" height={230}>
                                        <PieChart>
                                            <Pie data={perfSummary} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={4}>
                                                {perfSummary.map((d, i) => <Cell key={i} fill={d.color} stroke={T.white} strokeWidth={2} />)}
                                            </Pie>
                                            <Tooltip content={<Tip />} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: T.textSub }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                }
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 5" }}>
                            <Card title="On / Off Target by Indicator" icon={Activity} accent={T.coral} idx={2}>
                                {perfByIndicator.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: "40px 0", fontSize: 13 }}>No data</div>
                                    : <ResponsiveContainer width="100%" height={230}>
                                        <BarChart data={perfByIndicator} layout="vertical" barGap={2} barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                                            <Tooltip content={<Tip />} />
                                            <Bar dataKey="green" name="On Target" fill={T.emerald} radius={[0, 4, 4, 0]} stackId="a" maxBarSize={16} />
                                            <Bar dataKey="red" name="Off Target" fill={T.coral} radius={[0, 4, 4, 0]} stackId="a" maxBarSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                }
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 12" }}>
                            <Card title="Indicator Status Detail" icon={Award} accent={T.amber} idx={3}>
                                {perfData.length === 0
                                    ? <div style={{ textAlign: "center", color: T.textSub, padding: 32, fontSize: 13 }}>Select a plant to view performance</div>
                                    : <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                                                    {["Indicator", "Direction", "Status", "Count"].map(h => (
                                                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {perfData.map((d, i) => (
                                                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        <td style={{ padding: "12px 14px", fontSize: 12, color: T.text, fontWeight: 600, maxWidth: 280 }}>
                                                            {d.indicator_title?.replace(/^(Actual[- ]?)?-+\s*/i, "")}
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}>
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}>
                                                                {d.good_direction === "UP" && <><TrendingUp size={14} color={T.emerald} /><span style={{ color: T.emerald }}>UP</span></>}
                                                                {d.good_direction === "DOWN" && <><TrendingDown size={14} color={T.coral} /><span style={{ color: T.coral }}>DOWN</span></>}
                                                                {!["UP", "DOWN"].includes(d.good_direction) && <span style={{ color: T.textSub }}>{d.good_direction}</span>}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "12px 14px" }}><PerfBadge status={d.performance_status} /></td>
                                                        <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800, color: T.text }}>{d.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                }
                            </Card>
                        </div>
                    </div>
                )}

                {/* ═══════════ ANALYTICS ═══════════ */}
                {tab === "analytics" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>

                        {/* ── Global summary KPIs ── */}
                        {analyticsLoading
                            ? <div style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 10, color: T.textSub, padding: "20px 0" }}>
                                <RefreshCw size={16} color={T.indigo} style={{ animation: "spin 0.9s linear infinite" }} />
                                <span style={{ fontSize: 13, fontWeight: 600 }}>Loading analytics…</span>
                            </div>
                            : <>
                                {/* Summary row */}
                                <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "20px 22px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.emerald}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Global Health Score</div>
                                    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-2px", color: analyticsKPIs.globalHealth >= 70 ? T.emerald : analyticsKPIs.globalHealth >= 40 ? T.amber : T.coral, lineHeight: 1, marginBottom: 10 }}>{analyticsKPIs.globalHealth}%</div>
                                    <HealthBar pct={analyticsKPIs.globalHealth} />
                                    <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
                                        <div><div style={{ fontSize: 20, fontWeight: 800, color: T.emerald }}>{fmt(analyticsKPIs.totalOn)}</div><div style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}>On Target</div></div>
                                        <div><div style={{ fontSize: 20, fontWeight: 800, color: T.coral }}>{fmt(analyticsKPIs.totalOff)}</div><div style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}>Off Target</div></div>
                                    </div>
                                </div>

                                <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "20px 22px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.coral}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Most Off-Target Plant</div>
                                    {analyticsKPIs.worstPlant ? <>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{analyticsKPIs.worstPlant.plant_name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                            <span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{analyticsKPIs.worstPlant.off_target} off</span>
                                            <span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{analyticsKPIs.worstPlant.on_target} on</span>
                                        </div>
                                        <HealthBar pct={analyticsKPIs.worstPlant.total > 0 ? Math.round(+analyticsKPIs.worstPlant.on_target / (+analyticsKPIs.worstPlant.on_target + +analyticsKPIs.worstPlant.off_target || 1) * 100) : 0} />
                                    </> : <div style={{ color: T.textSub, fontSize: 13 }}>—</div>}
                                </div>

                                <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "20px 22px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.emerald}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Best Performing Plant</div>
                                    {analyticsKPIs.bestPlant ? <>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{analyticsKPIs.bestPlant.plant_name}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                            <span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{analyticsKPIs.bestPlant.on_target} on</span>
                                            <span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{analyticsKPIs.bestPlant.off_target} off</span>
                                        </div>
                                        <HealthBar pct={analyticsKPIs.bestPlant.total > 0 ? Math.round(+analyticsKPIs.bestPlant.on_target / (+analyticsKPIs.bestPlant.on_target + +analyticsKPIs.bestPlant.off_target || 1) * 100) : 0} />
                                    </> : <div style={{ color: T.textSub, fontSize: 13 }}>—</div>}
                                </div>

                                <div style={{ gridColumn: "span 3", background: T.white, borderRadius: 16, padding: "20px 22px", border: `1px solid ${T.border}`, borderTop: `4px solid ${T.slate}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Coverage</div>
                                    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-2px", color: T.text, lineHeight: 1, marginBottom: 6 }}>{plantPerf.length}</div>
                                    <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>plants reporting this week</div>
                                    <div style={{ marginTop: 10, fontSize: 12, color: T.slate, fontWeight: 600 }}>{fmt(analyticsKPIs.totalNoData)} data points missing</div>
                                </div>

                                {/* ── CHART 1: On/Off Target per Plant ── */}
                                <div style={{ gridColumn: "span 12" }}>
                                    <div style={{
                                        background: T.white, borderRadius: 18,
                                        border: `1px solid ${T.border}`,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
                                        padding: "24px 24px 20px",
                                    }}>
                                        {/* Card header with filter */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ background: `${T.indigo}14`, borderRadius: 10, padding: 8 }}>
                                                    <BarChart3 size={17} color={T.indigo} strokeWidth={2.5} />
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>
                                                    On Target vs Off Target — By Plant
                                                </h3>
                                            </div>
                                            {/* View filter */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <SlidersHorizontal size={13} color={T.textSub} />
                                                <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginRight: 4 }}>Show:</span>
                                                {[
                                                    { id: "all", label: "All Plants" },
                                                    { id: "root", label: "Root Only" },
                                                    ...rootPlants.map(p => ({ id: String(p.plant_id), label: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name }))
                                                ].map(opt => (
                                                    <button key={opt.id} onClick={() => setPlantView(opt.id)} style={{
                                                        background: plantView === opt.id ? T.indigo : T.white,
                                                        border: `1.5px solid ${plantView === opt.id ? T.indigo : T.border}`,
                                                        borderRadius: 20, padding: "5px 14px",
                                                        color: plantView === opt.id ? T.white : T.textSub,
                                                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                                                        transition: "all 0.15s", fontFamily: "inherit",
                                                    }}>{opt.label}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {plantChartData.length === 0
                                            ? <div style={{ textAlign: "center", color: T.textSub, padding: "50px 0", fontSize: 13 }}>No performance data available for {currentWeek}</div>
                                            : <ResponsiveContainer width="100%" height={320}>
                                                <BarChart data={plantChartData} barGap={3} barCategoryGap="28%">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fill: T.textSub, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={plantChartData.length > 10 ? -30 : 0} textAnchor={plantChartData.length > 10 ? "end" : "middle"} height={plantChartData.length > 10 ? 54 : 30} />
                                                    <YAxis tick={{ fill: T.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<AnalyticsTip />} />
                                                    <Legend wrapperStyle={{ fontSize: 12, color: T.textSub, paddingTop: 8 }} />
                                                    <Bar dataKey="on_target" name="On Target" fill={T.emerald} radius={[6, 6, 0, 0]} maxBarSize={28} stackId="s" />
                                                    <Bar dataKey="off_target" name="Off Target" fill={T.coral} radius={[0, 0, 0, 0]} maxBarSize={28} stackId="s" />
                                                    <Bar dataKey="no_data" name="No Data" fill="#CBD5E1" radius={[0, 0, 0, 0]} maxBarSize={28} stackId="s" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        }
                                    </div>
                                </div>

                                {/* ── Plant health ranking table ── */}
                                <div style={{ gridColumn: "span 5" }}>
                                    <Card title="Plant Health Ranking" icon={Award} accent={T.amber} idx={4}>
                                        <div style={{ maxHeight: 340, overflowY: "auto" }}>
                                            {[...plantChartData]
                                                .filter(p => p.on_target + p.off_target > 0)
                                                .sort((a, b) => b.health - a.health)
                                                .map((p, i) => (
                                                    <div key={i} style={{
                                                        display: "flex", alignItems: "center", gap: 12,
                                                        padding: "10px 4px", borderBottom: `1px solid ${T.border}`,
                                                        transition: "background 0.12s"
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                    >
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                                                            background: i === 0 ? T.amber : i === 1 ? "#94A3B8" : i === 2 ? "#CD7F32" : T.border,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: 11, fontWeight: 800, color: i < 3 ? T.white : T.textSub
                                                        }}>{i + 1}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>{p.fullName || p.name}</div>
                                                            <HealthBar pct={p.health} />
                                                        </div>
                                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                            <div style={{ fontSize: 11, color: T.emerald, fontWeight: 700 }}>{p.on_target} ✓</div>
                                                            <div style={{ fontSize: 11, color: T.coral, fontWeight: 700 }}>{p.off_target} ✗</div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </Card>
                                </div>

                                {/* ── CHART 2: Department breakdown ── */}
                                <div style={{ gridColumn: "span 7" }}>
                                    <div style={{
                                        background: T.white, borderRadius: 18,
                                        border: `1px solid ${T.border}`,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
                                        padding: "24px 24px 20px",
                                        height: "100%",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ background: `${T.violet}14`, borderRadius: 10, padding: 8 }}>
                                                    <Users size={17} color={T.violet} strokeWidth={2.5} />
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>
                                                    On / Off Target — By Department
                                                </h3>
                                            </div>
                                            {/* Plant filter for department chart */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                <SlidersHorizontal size={13} color={T.textSub} />
                                                <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginRight: 2 }}>Plant:</span>
                                                <button onClick={() => setAnalyticsPlantFilter("all")} style={{
                                                    background: analyticsPlantFilter === "all" ? T.violet : T.white,
                                                    border: `1.5px solid ${analyticsPlantFilter === "all" ? T.violet : T.border}`,
                                                    borderRadius: 20, padding: "5px 14px",
                                                    color: analyticsPlantFilter === "all" ? T.white : T.textSub,
                                                    cursor: "pointer", fontSize: 11, fontWeight: 700,
                                                    transition: "all 0.15s", fontFamily: "inherit",
                                                }}>All</button>
                                                {rootPlants.map(p => (
                                                    <button key={p.plant_id} onClick={() => setAnalyticsPlantFilter(String(p.plant_id))} style={{
                                                        background: analyticsPlantFilter === String(p.plant_id) ? T.violet : T.white,
                                                        border: `1.5px solid ${analyticsPlantFilter === String(p.plant_id) ? T.violet : T.border}`,
                                                        borderRadius: 20, padding: "5px 14px",
                                                        color: analyticsPlantFilter === String(p.plant_id) ? T.white : T.textSub,
                                                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                                                        transition: "all 0.15s", fontFamily: "inherit",
                                                    }}>{p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {deptChartData.length === 0
                                            ? <div style={{ textAlign: "center", color: T.textSub, padding: "50px 0", fontSize: 13 }}>No department data available</div>
                                            : <ResponsiveContainer width="100%" height={290}>
                                                <BarChart data={deptChartData} layout="vertical" barGap={2} barCategoryGap="22%">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                                                    <XAxis type="number" tick={{ fill: T.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <YAxis dataKey="name" type="category" tick={{ fill: T.textSub, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={130} />
                                                    <Tooltip content={<AnalyticsTip />} />
                                                    <Legend wrapperStyle={{ fontSize: 12, color: T.textSub }} />
                                                    <Bar dataKey="on_target" name="On Target" fill={T.emerald} stackId="s" maxBarSize={18} />
                                                    <Bar dataKey="off_target" name="Off Target" fill={T.coral} stackId="s" maxBarSize={18} radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        }
                                    </div>
                                </div>

                                {/* ── Department detail table ── */}
                                <div style={{ gridColumn: "span 12" }}>
                                    <Card title="Department Performance Detail" icon={Building} accent={T.sky} idx={5}>
                                        {deptChartData.length === 0
                                            ? <div style={{ textAlign: "center", color: T.textSub, padding: 32, fontSize: 13 }}>No data</div>
                                            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                                                        {["Department", "On Target", "Off Target", "No Data", "Total", "Health"].map(h => (
                                                            <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {deptPerf.map((d, i) => {
                                                        const health = +d.health_pct || 0;
                                                        return (
                                                            <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.12s" }}
                                                                onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                                            >
                                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.text }}>{d.department_name}</td>
                                                                <td style={{ padding: "12px 14px" }}><span style={{ background: T.emeraldL, color: T.emerald, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.on_target}</span></td>
                                                                <td style={{ padding: "12px 14px" }}><span style={{ background: T.coralL, color: T.coral, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{d.off_target}</span></td>
                                                                <td style={{ padding: "12px 14px", fontSize: 12, color: T.textSub, fontWeight: 600 }}>{d.no_data}</td>
                                                                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 800, color: T.text }}>{d.total}</td>
                                                                <td style={{ padding: "12px 14px", minWidth: 160 }}><HealthBar pct={health} /></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        }
                                    </Card>
                                </div>
                            </>
                        }
                    </div>
                )}

                {/* ═══════════ HIERARCHY ═══════════ */}
                {tab === "hierarchy" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
                        <div style={{ gridColumn: "span 5" }}>
                            <Card title="Plants per Hierarchy Level" icon={Layers} accent={T.sky} idx={0}>
                                <ResponsiveContainer width="100%" height={230}>
                                    <AreaChart data={levelData}>
                                        <defs>
                                            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={T.sky} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={T.sky} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: T.textSub, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: T.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<Tip />} />
                                        <Area type="monotone" dataKey="value" name="Plants" stroke={T.sky} strokeWidth={2.5} fill="url(#skyGrad)" dot={{ fill: T.sky, r: 5, strokeWidth: 2, stroke: T.white }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 7" }}>
                            <Card title="Root Plants Radar — Responsible vs Children" icon={Activity} accent={T.violet} idx={1}>
                                <ResponsiveContainer width="100%" height={230}>
                                    <RadarChart data={rootBarData}>
                                        <PolarGrid stroke={T.border} />
                                        <PolarAngleAxis dataKey="name" tick={{ fill: T.textSub, fontSize: 11, fontWeight: 600 }} />
                                        <PolarRadiusAxis tick={{ fill: T.border, fontSize: 9 }} axisLine={false} />
                                        <Radar name="Responsible" dataKey="responsible" stroke={T.indigo} fill={T.indigo} fillOpacity={0.12} strokeWidth={2} dot={{ r: 3, fill: T.indigo }} />
                                        <Radar name="Children" dataKey="children" stroke={T.sky} fill={T.sky} fillOpacity={0.10} strokeWidth={2} dot={{ r: 3, fill: T.sky }} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: T.textSub }} />
                                        <Tooltip content={<Tip />} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        <div style={{ gridColumn: "span 12" }}>
                            <Card title="Full Plant Hierarchy" icon={Building} accent={T.amber} idx={2}>
                                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                                    {hierarchy.map((p, i) => (
                                        <div key={p.plant_id} style={{
                                            display: "flex", alignItems: "center", gap: 10,
                                            padding: "11px 14px", borderRadius: 10,
                                            borderBottom: `1px solid ${T.border}`,
                                            transition: "background 0.12s",
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.slateL}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        >
                                            <div style={{ width: p.level * 24, flexShrink: 0 }} />
                                            {p.level > 0 && <ChevronRight size={12} color="#CBD5E1" style={{ flexShrink: 0 }} />}
                                            <div style={{ width: 8, height: 8, borderRadius: 3, background: PIE_PALETTE[p.level % PIE_PALETTE.length], flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.name}</span>
                                                {p.manager && <span style={{ fontSize: 11, color: T.textSub, marginLeft: 8 }}>· {p.manager}</span>}
                                            </div>
                                            <span style={{ fontSize: 10, color: T.textSub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, background: T.slateL, borderRadius: 5, padding: "2px 7px", border: `1px solid ${T.border}` }}>L{p.level}</span>
                                            <span style={{ background: T.indigoL, color: T.indigo, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{p.responsible_count} resp.</span>
                                            <span style={{ background: T.skyL, color: T.sky, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{p.child_count} sub</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
                </div>{/* end kpi-page-body */}
            </div>{/* end kpi-main */}
        </div>
    );
};

export default PlantStatsDashboard;
