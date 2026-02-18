import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronRight, ChevronDown, Folder, FolderOpen,
  Search, User, Calendar,
  Home, BarChart3, Settings, Bell,
  TrendingUp,
  Download,
  LayoutDashboard, FileText, Users,
  Target, AlertCircle, Loader,
  AlertTriangle, Database as DatabaseIcon,
  Building, Factory, MapPin, Truck,        // Supply chain, logistics
  DollarSign,   // Finance, budget, cost
  Shield,       // Safety, compliance
  Package,      // Inventory, stock
  Wrench,       // Maintenance
  CheckCircle,  // Quality, defect
  Star,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus
} from 'lucide-react';
import ReactCountryFlag from "react-country-flag";
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import './PlantTreeNavigatorEnhanced.css';
import { useNavigate, useLocation } from 'react-router-dom';

const PlantTreeNavigatorEnhanced = () => {
  // State for UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentWeek, setCurrentWeek] = useState('2026-Week7');

  // State for hierarchical data
  const [loading, setLoading] = useState({
    roots: true,
    children: false,
    indicators: false,
    subtitles: false
  });
  const [error, setError] = useState(null);
  // REMOVED: selectedPlant and selectedChildPlant
  const [rootPlants, setRootPlants] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]); // Array of selected plants in order
  const [childPlants, setChildPlants] = useState({}); // Map: plant_id -> children array
  const [indicators, setIndicators] = useState([]);
  const [selectedIndicatorGroup, setSelectedIndicatorGroup] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // Set of indicator titles
  const [indicatorSubtitles, setIndicatorSubtitles] = useState([]);
  const [indicatorFilter, setIndicatorFilter] = useState(''); // New state for KPI filter 
  // Stats state
  const [stats, setStats] = useState({
    totalPlants: 0,
    totalIndicators: 0,
    totalResponsible: 0,
    dataPoints: 0
  });
  const [performanceMap, setPerformanceMap] = useState({});
  const [subtitlePerformanceMap, setSubtitlePerformanceMap] = useState({});
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const filteredIndicators = useMemo(() => {
    if (!indicatorFilter.trim()) return indicators;
    return indicators.filter(ind =>
      ind.indicator_title.toLowerCase().includes(indicatorFilter.toLowerCase())
    );
  }, [indicators, indicatorFilter]);

  const groupedIndicators = useMemo(() => {
    const groups = {};
    filteredIndicators.forEach(ind => {
      const title = ind.indicator_title;
      if (!groups[title]) {
        groups[title] = {
          title,
          kpi_ids: [],
          responsible_count: 0,
          value_count: 0,
          unit: ind.unit || 'No unit',
          good_direction: ind.good_direction || 'N/A'
        };
      }
      groups[title].kpi_ids.push(ind.kpi_id);
      groups[title].responsible_count += ind.responsible_count || 0;
      groups[title].value_count += ind.value_count || 0;
    });
    return Object.values(groups);
  }, [filteredIndicators]);




  // Fetch root plants on component mount
  useEffect(() => {
    fetchRootPlants();
  }, []);



  const fetchRootPlants = async () => {
    try {
      setLoading(prev => ({ ...prev, roots: true }));
      setError(null);

      const response = await axios.get('https://kpi-form.azurewebsites.net/api/plants/roots');
      setRootPlants(response.data);

      // Calculate initial stats
      setStats(prev => ({
        ...prev,
        totalPlants: response.data.length,
        totalResponsible: response.data.reduce((sum, plant) => sum + (plant.responsible_count || 0), 0)
      }));

      setLoading(prev => ({ ...prev, roots: false }));
    } catch (err) {
      setError('Failed to load plants. Please try again.');
      setLoading(prev => ({ ...prev, roots: false }));
    }
  };


  const fetchPerformanceStatus = async (plantId, week) => {
    try {
      const response = await axios.get(
        `https://kpi-form.azurewebsites.net/api/plants/${plantId}/performance?week=${week}`
      );
      const map = {};
      response.data.forEach(row => {
        const title = row.indicator_title;
        if (!map[title]) {
          map[title] = {
            status: 'GREEN',
            good_direction: row.good_direction,
            minimum_value: row.minimum_value,
            maximum_value: row.maximum_value,
            redCount: 0,
            greenCount: 0,
            total: 0,
          };
        }
        const count = Number(row.count) || 1;
        map[title].total += count;
        if (row.performance_status === 'RED') {
          map[title].redCount += count;
        } else if (row.performance_status === 'GREEN') {
          map[title].greenCount += count;
        }
        // NO_DATA rows counted in total but don't affect status
      });

      // ✅ Set status AFTER counting all rows — majority wins
      Object.values(map).forEach(item => {
        if (item.redCount > item.greenCount) {
          item.status = 'RED';
        } else if (item.greenCount > 0 || item.redCount > 0) {
          item.status = 'GREEN';
        }
        // else stays as NO_DATA/GREEN default
      });

      setPerformanceMap(map);
    } catch (err) {
      console.error('Error fetching performance status:', err);
    }
  };

  const fetchSubtitlePerformance = async (plantId, kpiIds, week) => {
    try {
      const promises = kpiIds.map(kpi_id =>
        axios.get(`https://kpi-form.azurewebsites.net/api/plants/${plantId}/indicators/${kpi_id}/performance?week=${week}`)
          .then(res => res.data).catch(() => [])
      );
      const results = await Promise.all(promises);
      const map = {};
      results.flat().forEach(row => {
        map[`${row.kpi_id}_${row.responsible_id}`] = {
          status: row.performance_status,  // 'RED' | 'GREEN' | 'NO_DATA'
          good_direction: row.good_direction,
          new_value: row.new_value,           // ← from hist26
          target: row.target,              // ← from hist26
          minimum_value: row.minimum_value,       // ← from Kpi table
          maximum_value: row.maximum_value,       // ← from Kpi table
        };
      });
      setSubtitlePerformanceMap(map);
    } catch (err) {
      console.error('Error fetching subtitle performance:', err);
    }
  };

  // Excel Export Function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Plant Hierarchy
    const hierarchyData = [];

    // Add header
    hierarchyData.push(['Plant Hierarchy - Week: ' + currentWeek]);
    hierarchyData.push([]);
    hierarchyData.push(['Level', 'Plant Name', 'Manager', 'Responsible Count', 'Child Plant Count', 'KPI Count']);

    // Add root plants
    rootPlants.forEach(plant => {
      hierarchyData.push([
        'Root',
        plant.name,
        plant.manager || 'No manager assigned',
        plant.responsible_count || 0,
        plant.child_plant_count || 0,
        plant.kpi_count || 0
      ]);

      // Add child plants for each level
      const addChildPlants = (parentId, level) => {
        const children = childPlants[parentId] || [];
        children.forEach(child => {
          hierarchyData.push([
            `Level ${level}`,
            child.name,
            child.manager || 'No manager assigned',
            child.responsible_count || 0,
            child.has_children ? 'Has children' : '0',
            child.kpi_count || 0
          ]);

          if (child.has_children) {
            addChildPlants(child.plant_id, level + 1);
          }
        });
      };

      addChildPlants(plant.plant_id, 1);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(hierarchyData);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Plant Hierarchy');

    // Sheet 2: KPI Summary (if indicators exist)
    if (indicators.length > 0 && selectedPath.length > 0) {
      const lastPlant = selectedPath[selectedPath.length - 1];
      const kpiData = [];

      kpiData.push([`KPI Summary - ${lastPlant.name} - Week: ${currentWeek}`]);
      kpiData.push([]);
      kpiData.push(['Indicator Title', 'Unit', 'Good Direction', 'Responsible Count', 'Data Points']);

      groupedIndicators.forEach(group => {
        kpiData.push([
          formatIndicatorTitle(group.title),
          group.unit,
          group.good_direction,
          group.responsible_count,
          group.value_count
        ]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(workbook, ws2, 'KPI Summary');
    }

    // Sheet 3: Detailed KPI Data (if subtitles exist)
    if (indicatorSubtitles.length > 0 && selectedPath.length > 0) {
      const lastPlant = selectedPath[selectedPath.length - 1];
      const detailData = [];

      detailData.push([`Detailed KPI Data - ${lastPlant.name} - Week: ${currentWeek}`]);
      detailData.push([]);
      detailData.push(['Indicator Title', 'Indicator Subtitle', 'Responsible Person', 'Current Value', 'Target', 'Unit']);

      groupedIndicators.forEach(group => {
        const groupSubtitles = indicatorSubtitles.filter(st => group.kpi_ids.includes(st.kpi_id));

        groupSubtitles.forEach(subtitle => {
          detailData.push([
            formatIndicatorTitle(group.title),
            subtitle.indicator_subtitle || 'No subtitle',
            subtitle.responsible_name || 'Unassigned',
            subtitle.value !== null ? subtitle.value : 'No data',
            subtitle.target_snapshot || 'N/A',
            group.unit
          ]);
        });

        // Add total row for the group
        if (groupSubtitles.length > 0) {
          const total = calculateGroupTotal(group);
          detailData.push([
            formatIndicatorTitle(group.title) + ' - TOTAL',
            '',
            '',
            total,
            '',
            group.unit
          ]);
          detailData.push([]); // Empty row for separation
        }
      });

      const ws3 = XLSX.utils.aoa_to_sheet(detailData);
      XLSX.utils.book_append_sheet(workbook, ws3, 'Detailed KPI Data');
    }

    // Sheet 4: Statistics
    const statsData = [];
    statsData.push(['Dashboard Statistics - Week: ' + currentWeek]);
    statsData.push([]);
    statsData.push(['Metric', 'Value']);
    statsData.push(['Total Plants', stats.totalPlants]);
    statsData.push(['Total Indicators', stats.totalIndicators]);
    statsData.push(['Total Responsible Persons', stats.totalResponsible]);
    statsData.push(['Total Data Points', stats.dataPoints]);
    statsData.push([]);
    statsData.push(['Current Selection Path']);
    selectedPath.forEach((plant, index) => {
      statsData.push([`Level ${index}`, plant.name]);
    });

    const ws4 = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, ws4, 'Statistics');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Plant_KPI_Export_${currentWeek}_${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
  };

  const generateWeekOptions = () => {
    const weeks = [];
    const currentYear = 2026;
    const startYear = 2025;

    // Generate weeks for 2025 and 2026
    for (let year = startYear; year <= currentYear; year++) {
      const weeksInYear = year === 2025 ? 52 : 10; // Adjust as needed
      for (let week = 1; week <= weeksInYear; week++) {
        weeks.push(`${year}-W${week}`);
      }
    }

    return weeks.reverse(); // Most recent first
  };


  // Add this handler function
  const handleWeekChange = async (newWeek) => {
    setCurrentWeek(newWeek);
    setShowWeekPicker(false);

    // Refresh data for the selected week
    if (selectedPath.length > 0) {
      const lastPlant = selectedPath[selectedPath.length - 1];
      const lastChildren = childPlants[lastPlant.plant_id] || [];

      // If the last plant has no children, it means we're showing indicators
      // So we need to refresh the indicators for the new week
      if (lastChildren.length === 0) {
        try {
          setLoading(prev => ({ ...prev, indicators: true }));

          // Fetch indicators for the new week
          const indicatorsResponse = await axios.get(
            `https://kpi-form.azurewebsites.net/api/plants/${lastPlant.plant_id}/indicators?week=${newWeek}`
          );
          setIndicators(indicatorsResponse.data);

          // Calculate distinct titles for totalIndicators
          const distinctTitles = new Set(indicatorsResponse.data.map(i => i.indicator_title)).size;
          setStats(prev => ({
            ...prev,
            totalIndicators: distinctTitles,
            dataPoints: indicatorsResponse.data.reduce((sum, ind) => sum + (ind.value_count || 0), 0)
          }));

          // Clear expanded groups and subtitles since we're changing weeks
          setExpandedGroups(new Set());
          setIndicatorSubtitles([]);
          setSelectedIndicatorGroup(null);
          setSubtitlePerformanceMap({});
          await fetchPerformanceStatus(lastPlant.plant_id, newWeek);
          setLoading(prev => ({ ...prev, indicators: false }));
        } catch (err) {
          console.error('Error fetching indicators for new week:', err);
          setLoading(prev => ({ ...prev, indicators: false }));
        }
      }
    }
  };

  const formatIndicatorTitle = (title) => {
    if (!title) return title;
    // Removes leading "Actual", "Actual-", "Actual ", and any leading "-"
    return title.replace(/^(Actual[- ]?)?-+\s*/i, '');
  };


  const handlePlantClick = async (plant, level) => {
    console.log('handlePlantClick:', plant.name, 'ID:', plant.plant_id, 'Level:', level);

    // Update selected path
    const newPath = selectedPath.slice(0, level);
    newPath[level] = plant;
    setSelectedPath(newPath);

    // Clear deeper levels
    const newChildPlants = { ...childPlants };
    for (let i = level + 1; i < selectedPath.length; i++) {
      if (selectedPath[i]?.plant_id) {
        delete newChildPlants[selectedPath[i].plant_id];
      }
    }

    setChildPlants(newChildPlants);
    setIndicators([]);
    setPerformanceMap({});
    setSubtitlePerformanceMap({});
    setIndicatorSubtitles([]);


    try {
      setLoading(prev => ({ ...prev, children: true }));

      // 1. Fetch child plants
      console.log('Fetching child plants for plant ID:', plant.plant_id);
      const childrenResponse = await axios.get(
        `https://kpi-form.azurewebsites.net/api/plants/${plant.plant_id}/children`
      );

      console.log('Child plants response:', childrenResponse.data);

      // Store children
      newChildPlants[plant.plant_id] = childrenResponse.data;
      setChildPlants(newChildPlants);

      // 2. Check if plant has child plants
      if (childrenResponse.data.length === 0) {
        console.log('No child plants found, fetching indicators directly...');
        // No child plants - fetch indicators directly for this plant
        const indicatorsResponse = await axios.get(
          `https://kpi-form.azurewebsites.net/api/plants/${plant.plant_id}/indicators?week=${currentWeek}`
        );
        setIndicators(indicatorsResponse.data);
        await fetchPerformanceStatus(plant.plant_id, currentWeek);
        // Calculate distinct titles for totalIndicators
        const distinctTitles = new Set(indicatorsResponse.data.map(i => i.indicator_title)).size;
        setStats(prev => ({
          ...prev,
          totalIndicators: distinctTitles,
          dataPoints: indicatorsResponse.data.reduce((sum, ind) => sum + (ind.value_count || 0), 0)
        }));
      } else {
        // Has child plants - clear indicators
        console.log('Has', childrenResponse.data.length, 'child plants, clearing indicators');
        setIndicators([]);
      }

      setLoading(prev => ({ ...prev, children: false }));
    } catch (err) {
      console.error('Error fetching plant data:', err);
      setLoading(prev => ({ ...prev, children: false }));
    }
  };

  // REMOVED: handleChildPlantClick - now handled by handlePlantClick
  const handleGroupClick = async (group) => {
    setSelectedIndicatorGroup(group);

    const lastPlant = selectedPath[selectedPath.length - 1];
    if (!lastPlant) return;

    const plantId = lastPlant.plant_id;

    try {
      setLoading(prev => ({ ...prev, subtitles: true }));

      const promises = group.kpi_ids.map(kpi_id =>
        axios.get(`https://kpi-form.azurewebsites.net/api/plants/${plantId}/indicators/${kpi_id}/subtitles?week=${currentWeek}`)
          .then(res => res.data)
          .catch(() => [])
      );

      const results = await Promise.all(promises);
      setIndicatorSubtitles(results.flat());
      await fetchSubtitlePerformance(plantId, group.kpi_ids, currentWeek);
      const newExpanded = new Set(expandedGroups);
      newExpanded.add(group.title);
      setExpandedGroups(newExpanded);

      setLoading(prev => ({ ...prev, subtitles: false }));
    } catch (err) {
      console.error(err);
      setLoading(prev => ({ ...prev, subtitles: false }));
    }
  };
  const toggleGroupExpand = (title) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(title)) newExpanded.delete(title);
    else newExpanded.add(title);
    setExpandedGroups(newExpanded);
  };
  const handleRefresh = () => {
    if (selectedPath.length > 0) {
      // Refresh the last selected plant
      const lastPlant = selectedPath[selectedPath.length - 1];
      const level = selectedPath.length - 1;
      handlePlantClick(lastPlant, level);
    } else {
      fetchRootPlants();
    }
  };



  const getPlantIcon = (plantName) => {
    // Comprehensive country/region flag mapping
    const countryFlags = {
      // Countries
      'tunisia': 'TN',
      'france': 'FR',
      'germany': 'DE',
      'mexico': 'MX',
      'china': 'CN',
      'india': 'IN',
      'korea': 'KR',
      'usa': 'US',
      'italy': 'IT',
      'spain': 'ES',
      'uk': 'GB',
      'united kingdom': 'GB',
      'brazil': 'BR',
      'canada': 'CA',
      'australia': 'AU',
      'japan': 'JP',

      // Regions
      'global': 'GL',
      'europe': 'EU',
      'asia': 'AS',
      'americas': 'US',
      'africa': 'AF',

      // Cities (map to their countries)
      'tianjin': 'CN',
      'anhui': 'CN',
      'kunshan': 'CN',
      'chennai': 'IN',
      'daegu': 'KR',
      'poitiers': 'FR',
      'sceet': 'TN',
      'sts': 'TN',
      'same': 'TN',
      'cyclam': 'FR',
      'germany': 'DE',
      'france': 'FR',
      'tianjin': 'CN',
      'anhui': 'CN',
      'korea': 'KR',
      'mexico': 'MX',
      'india': 'IN',
    };

    const lowerName = plantName.toLowerCase();

    // First, check for exact country/region names
    for (const [country, countryCode] of Object.entries(countryFlags)) {
      if (lowerName.includes(country)) {
        return (
          <div className="flag-container">
            <ReactCountryFlag
              countryCode={countryCode}
              svg
              style={{
                width: '48px',  // Increased from 24px
                height: '48px', // Increased from 24px
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}
              title={plantName}
            />
          </div>
        );
      }
    }

    // Fallback for specific plant types
    if (lowerName.includes('factory') || lowerName.includes('plant')) {
      return (
        <div className="icon-container">
          <Factory size={48} /> {/* Increased from 24 */}
        </div>
      );
    }

    if (lowerName.includes('headquarters') || lowerName.includes('group')) {
      return (
        <div className="icon-container">
          <Building size={48} /> {/* Increased from 24 */}
        </div>
      );
    }

    if (lowerName.includes('region')) {
      return (
        <div className="icon-container">
          <MapPin size={48} /> {/* Increased from 24 */}
        </div>
      );
    }

    // Default fallback
    return (
      <div className="icon-container">
        <Building size={48} /> {/* Increased from 24 */}
      </div>
    );
  };


  const getIndicatorIcon = (title) => {
    const lower = title.toLowerCase();

    // Define a professional color palette per category
    const colors = {
      sales: '#2E7D32',        // deep green – growth, revenue
      supply: '#0B5E7E',       // teal – logistics, supply chain
      hr: '#6A4E9C',          // purple – people, HR
      finance: '#1565C0',     // blue – finance, budget
      quality: '#2E7D32',     // green – quality, check
      production: '#BF5B2E',  // burnt orange – manufacturing
      safety: '#C62828',      // red – safety, incidents
      customer: '#FFB300',    // amber – satisfaction, star
      inventory: '#2C6B2F',   // forest green – stock, warehouse
      maintenance: '#6D4C41', // brown – maintenance, repair
      default: '#455A64'      // slate grey – fallback
    };

    let iconColor = colors.default;

    if (lower.includes('sales') || lower.includes('revenue') || lower.includes('turnover')) {
      iconColor = colors.sales;
      return <TrendingUp size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('supply') || lower.includes('chain') || lower.includes('logistics')) {
      iconColor = colors.supply;
      return <Truck size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('hr') || lower.includes('human') || lower.includes('people') || lower.includes('staff')) {
      iconColor = colors.hr;
      return <Users size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('finance') || lower.includes('budget') || lower.includes('cost')) {
      iconColor = colors.finance;
      return <DollarSign size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('quality') || lower.includes('defect') || lower.includes('rework')) {
      iconColor = colors.quality;
      return <CheckCircle size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('production') || lower.includes('output') || lower.includes('manufacturing')) {
      iconColor = colors.production;
      return <Factory size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('safety') || lower.includes('accident') || lower.includes('incident')) {
      iconColor = colors.safety;
      return <Shield size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('customer') || lower.includes('satisfaction') || lower.includes('csat')) {
      iconColor = colors.customer;
      return <Star size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('warehouse')) {
      iconColor = colors.inventory;
      return <Package size={32} strokeWidth={1.5} color={iconColor} />;
    }
    if (lower.includes('maintenance') || lower.includes('repair') || lower.includes('downtime')) {
      iconColor = colors.maintenance;
      return <Wrench size={32} strokeWidth={1.5} color={iconColor} />;
    }

    // default fallback
    return <BarChart3 size={32} strokeWidth={1.5} color={colors.default} />;
  };
  const renderBreadcrumb = () => {
    const items = [];

    // Build breadcrumb from selectedPath
    selectedPath.forEach((plant, index) => {
      if (index > 0) {
        items.push(<span key={`sep-${index}`} className="breadcrumb-separator">/</span>);
      }
      items.push(
        <span key={plant.plant_id} className="breadcrumb-item active">
          {plant.name}
        </span>
      );
    });

    if (selectedIndicatorGroup) {
      items.push(
        <span key="separator-indicator" className="breadcrumb-separator">/</span>,
        <span key="indicator" className="breadcrumb-item">
          {formatIndicatorTitle(selectedIndicatorGroup.title)}
        </span>
      );
    }

    return items;
  };

  // Add this helper function near the top of your component, after the state declarations
  const calculateGroupTotal = (group) => {
    const groupSubtitles = indicatorSubtitles.filter(st =>
      group.kpi_ids.includes(st.kpi_id)
    );

    const total = groupSubtitles.reduce((sum, subtitle) => {
      const value = parseFloat(subtitle.value);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    return total;
  };

  const performanceSummary = useMemo(() => {
    const values = Object.values(performanceMap);
    return {
      red: values.filter(v => v.status === 'RED').length,
      green: values.filter(v => v.status === 'GREEN').length,
      total: values.length,
    };
  }, [performanceMap]);



  // inside your component:
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="brand-name">KPI Dashboard</div>
            <div className="brand-subtitle">Plant Management</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-title">Navigation</div>
            <div className="nav-items">
              <button
                className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <LayoutDashboard size={18} className="nav-icon" />
                <span>Dashboard</span>
              </button>

              <button
                className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                <BarChart3 size={18} className="nav-icon" />
                <span>Statistics</span>
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <h4>KPI TRACKING SYSTEM</h4>
            <p>AvoCarbon Group</p>
          </div>
          <Settings size={18} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.7 }} />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="breadcrumb">
              <span className="breadcrumb-item">
                <Home size={14} />
                Dashboard
              </span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item">Plant Hierarchy</span>
              {renderBreadcrumb()}
            </div>
          </div>
          <div className="header-right">
            <button className="header-action">
              <Bell size={16} />
              <span>Notifications</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content-wrapper">
          {/* Welcome Section */}
          <div className="content-header">
            <div className="welcome-section">
              <h1>Plant KPI Hierarchy</h1>
              <p>Navigate through plant hierarchy to view KPIs, responsible persons, and performance metrics</p>
            </div>
            <div className="date-badge-container">
              <div className="date-badge" onClick={() => setShowWeekPicker(!showWeekPicker)}>
                <Calendar size={16} className="date-icon" />
                <span className="date-text">Week: {currentWeek}</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </div>

              {showWeekPicker && (
                <>
                  <div className="week-picker-overlay" onClick={() => setShowWeekPicker(false)} />
                  <div className="week-picker-dropdown">
                    <div className="week-picker-header">
                      <span>Select Week</span>
                      <button className="close-picker" onClick={() => setShowWeekPicker(false)}>
                        <X size={16} />
                      </button>
                    </div>
                    <div className="week-picker-list">
                      {generateWeekOptions().map((week) => (
                        <div
                          key={week}
                          className={`week-option ${currentWeek === week ? 'selected' : ''}`}
                          onClick={() => handleWeekChange(week)}
                        >
                          <Calendar size={14} />
                          <span>{week}</span>
                          {currentWeek === week && <CheckCircle size={14} className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="search-container">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search plants, indicators, responsible persons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card blue small">
              <div className="stat-content">
                <div className="stat-label">
                  <Building size={14} />
                  Total Plants
                </div>
                <div className="stat-value">{stats.totalPlants}</div>
              </div>
              <div className="stat-icon-wrapper">
                <Building size={24} className="stat-icon" />
              </div>
            </div>

            <div className="stat-card green small">
              <div className="stat-content">
                <div className="stat-label">
                  <Target size={14} />
                  Indicators
                </div>
                <div className="stat-value">{stats.totalIndicators}</div>
              </div>
              <div className="stat-icon-wrapper">
                <Target size={24} className="stat-icon" />
              </div>
            </div>

            {/* ← NEW: Performance summary cards */}
            {performanceSummary.total > 0 && (
              <>
                <div className="stat-card stat-card-green small">
                  <div className="stat-content">
                    <div className="stat-label">
                      <TrendingUp size={14} />
                      On Target
                    </div>
                    <div className="stat-value">{performanceSummary.green}</div>
                  </div>
                  <div className="stat-icon-wrapper">
                    <TrendingUp size={24} className="stat-icon" />
                  </div>
                </div>
                <div className="stat-card stat-card-red small">
                  <div className="stat-content">
                    <div className="stat-label">
                      <TrendingDown size={14} />
                      Off Target
                    </div>
                    <div className="stat-value">{performanceSummary.red}</div>
                  </div>
                  <div className="stat-icon-wrapper">
                    <TrendingDown size={24} className="stat-icon" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="error-state">
              <h4>
                <AlertTriangle size={20} />
                {error}
              </h4>
              <p>Please check your connection and try again.</p>
              <button className="retry-button" onClick={fetchRootPlants}>
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading.roots && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading plant hierarchy...</p>
            </div>
          )}

          {/* Plant Hierarchy Navigation */}
          {!loading.roots && !error && (
            <div className="topics-container">
              <div className="container-header">
                <div className="header-title">
                  <div className="header-icon">
                    <BarChart3 size={20} />
                  </div>
                  <div className="header-text">
                    <h2>Plant KPI Management</h2>
                    <p>Click through the hierarchy to view KPIs and responsible persons</p>
                  </div>
                </div>
                <div className="header-actions">
                  <button className="action-button" onClick={exportToExcel}>
                    <Download size={16} />
                    Export to Excel
                  </button>
                </div>
              </div>

              {/* Root Plants Section */}
              <div className="section-card">
                <h3 className="section-title">
                  <Folder size={20} />
                  Root Plants
                  <span className="subtopics-count">
                    {groupedIndicators.length} {groupedIndicators.length !== indicators.length && `of ${indicators.length}`} indicators
                  </span>
                </h3>

                {rootPlants.length === 0 ? (
                  <div className="empty-state">
                    <FolderOpen size={64} />
                    <h4>No Root Plants Found</h4>
                    <p>Add a root plant to start building your hierarchy.</p>
                  </div>
                ) : (
                  <div className="plants-grid">
                    {rootPlants.map((plant) => (
                      <div
                        key={plant.plant_id}
                        className={`plant-card ${selectedPath[0]?.plant_id === plant.plant_id ? 'selected' : ''}`}
                        onClick={() => handlePlantClick(plant, 0)}
                      >
                        <div className="plant-icon">
                          {getPlantIcon(plant.name)}
                        </div>
                        <div className="plant-info">
                          <h4>{plant.name}</h4>
                          <p>{plant.manager || 'No manager assigned'}</p>
                          <div className="plant-stats">
                            <span className="stat-badge">
                              <Users size={12} />
                              {plant.responsible_count || 0} responsible
                            </span>
                            <span className="stat-badge">
                              <Building size={12} />
                              {plant.child_plant_count || 0} children
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={20} className="chevron" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Child Plants Sections for Multiple Levels */}
              {selectedPath.map((plant, level) => {
                const children = childPlants[plant.plant_id] || [];
                if (children.length === 0) return null;

                return (
                  <div key={`level-${level}`} className="section-card">
                    <h3 className="section-title">
                      <ChevronRight size={20} />
                      {plant.name} - Child Plants
                      <span className="subtopics-count">{children.length} plants</span>
                    </h3>

                    <div className="plants-grid">
                      {children.map((childPlant) => (
                        <div
                          key={childPlant.plant_id}
                          className={`plant-card ${selectedPath[level + 1]?.plant_id === childPlant.plant_id ? 'selected' : ''}`}
                          onClick={() => handlePlantClick(childPlant, level + 1)}
                        >
                          <div className="plant-icon">
                            {getPlantIcon(childPlant.name)}
                          </div>
                          <div className="plant-info">
                            <h4>{childPlant.name}</h4>
                            <p>{childPlant.manager || 'No manager assigned'}</p>
                            <div className="plant-stats">
                              <span className="stat-badge">
                                <Users size={12} />
                                {childPlant.responsible_count || 0} responsible
                              </span>
                              <span className="stat-badge">
                                {childPlant.has_children ? (
                                  <>
                                    <Building size={12} />
                                    Has children
                                  </>
                                ) : (
                                  <>
                                    <Target size={12} />
                                    {childPlant.kpi_count || 0} KPIs
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={20} className="chevron" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Indicators Section */}
              {selectedPath.length > 0 && (() => {
                const lastPlant = selectedPath[selectedPath.length - 1];
                const lastChildren = childPlants[lastPlant.plant_id] || [];

                if (lastChildren.length === 0) {
                  return (
                    <div className="section-card">
                      <h3 className="section-title">
                        <Target size={20} />
                        {lastPlant.name} - Key Performance Indicators
                        <span className="subtopics-count">
                          {filteredIndicators.length} {filteredIndicators.length !== indicators.length && `of ${indicators.length}`} indicators
                        </span>

                        {/* ← NEW: Performance summary pill */}
                        {performanceSummary.total > 0 && (
                          <span className="performance-summary-pill">
                            <span className="pill-green">
                              <TrendingUp size={12} /> {performanceSummary.green} on target
                            </span>
                            <span className="pill-red">
                              <TrendingDown size={12} /> {performanceSummary.red} off target
                            </span>
                          </span>
                        )}
                      </h3>

                      {/* KPI Filter Bar */}
                      <div className="kpi-filter-bar">
                        <div className="filter-input-wrapper">
                          <Search size={16} className="filter-search-icon" />
                          <input
                            type="text"
                            className="kpi-filter-input"
                            placeholder="Filter by indicator title..."
                            value={indicatorFilter}
                            onChange={(e) => setIndicatorFilter(e.target.value)}
                          />
                          {indicatorFilter && (
                            <button
                              className="clear-filter-btn"
                              onClick={() => setIndicatorFilter('')}
                              title="Clear filter"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {loading.indicators ? (
                        <div className="loading-state">
                          <div className="loading-spinner"></div>
                          <p>Loading indicators...</p>
                        </div>
                      ) : indicators.length === 0 ? (
                        <div className="empty-state">
                          <Target size={64} />
                          <h4>No Indicators Found</h4>
                          <p>No KPIs are defined for this plant.</p>
                        </div>
                      ) : (
                        <div className="indicators-grid">
                          {groupedIndicators.map((group) => {
                            // ← NEW: derive performance for this group
                            const perf = performanceMap[group.title];
                            const isRed = perf?.status === 'RED';
                            const isGreen = perf?.status === 'GREEN';

                            return (
                              <div
                                key={group.title}
                                className={`indicator-card ${isRed ? 'indicator-card--red' : ''} ${isGreen ? 'indicator-card--green' : ''}`}
                                onClick={() => handleGroupClick(group)}
                              >
                                {/* ← NEW: Status strip at top of card */}
                                {perf && (
                                  <div className={`indicator-status-strip ${isRed ? 'strip-red' : 'strip-green'}`}>
                                    {isGreen ? (
                                      <><ArrowUpCircle size={14} /><span>On Target</span></>
                                    ) : (
                                      <><ArrowDownCircle size={14} /><span>Off Target</span></>
                                    )}
                                    {perf.redCount > 0 && perf.total > 1 && (
                                      <span className="strip-count">{perf.redCount}/{perf.total} off</span>
                                    )}
                                  </div>
                                )}

                                {/* Card Header with Icon & Title */}
                                <div className="indicator-card-header">
                                  <div className="indicator-card-icon">
                                    {getIndicatorIcon(group.title)}
                                  </div>
                                  <div className="indicator-card-title">
                                    <h4>{formatIndicatorTitle(group.title)}</h4>
                                  </div>
                                  {/* Total Display */}
                                  {expandedGroups.has(group.title) && indicatorSubtitles.length > 0 && (
                                    <div className="indicator-total">
                                      <span className="total-label">Total:</span>
                                      <span className="total-value">
                                        {calculateGroupTotal(group)}
                                        <span className="total-unit">{group.unit}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Compact Meta Info */}
                                <div className="indicator-card-meta">
                                  <span className="meta-badge">{group.unit}</span>
                                  <span className="meta-badge">
                                    <User size={12} /> {group.responsible_count}
                                  </span>
                                  <span className="meta-badge">
                                    <DatabaseIcon size={12} /> {group.value_count}
                                  </span>
                                  <span className="meta-badge">
                                    <TrendingUp size={12} /> {group.good_direction}
                                  </span>
                                  {/* ← NEW: Inline status badge */}
                                  {perf && (
                                    <span className={`meta-badge meta-badge--status ${isRed ? 'meta-badge--red' : 'meta-badge--green'}`}>
                                      {isGreen
                                        ? <><TrendingUp size={12} /> GREEN</>
                                        : <><TrendingDown size={12} /> RED</>
                                      }
                                    </span>
                                  )}
                                </div>

                                {/* Expand Button */}
                                <div className="indicator-card-expand">
                                  <button
                                    className="expand-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupExpand(group.title);
                                    }}
                                  >
                                    {expandedGroups.has(group.title) ? (
                                      <ChevronDown size={20} />
                                    ) : (
                                      <ChevronRight size={20} />
                                    )}
                                  </button>
                                </div>

                                {/* Expanded Subtitle Table */}
                                {expandedGroups.has(group.title) && (
                                  <div className="subtitle-details">
                                    {loading.subtitles && selectedIndicatorGroup?.title === group.title ? (
                                      <div className="loading-state">
                                        <Loader size={24} className="loading-spinner" />
                                        <p>Loading details...</p>
                                      </div>
                                    ) : indicatorSubtitles.length === 0 ? (
                                      <div className="empty-state">
                                        <AlertCircle size={48} />
                                        <h4>No Data Available</h4>
                                        <p>No subtitle data found for this indicator.</p>
                                      </div>
                                    ) : (
                                      <>
                                        <h5>
                                          <FileText size={18} />
                                          Indicator Details
                                        </h5>
                                        <div className="subtitle-table">
                                          <div className="table-header">
                                            <div className="table-cell">Indicator Subtitle</div>
                                            <div className="table-cell">Responsible Person</div>
                                            <div className="table-cell">Current Value</div>
                                            <div className="table-cell">Target</div>
                                            <div className="table-cell">Min</div>
                                            <div className="table-cell">Max</div>
                                            {/* ← Status column header */}
                                            <div className="table-cell table-cell--status">Status</div>
                                          </div>

                                          {indicatorSubtitles
                                            .filter(st => group.kpi_ids.includes(st.kpi_id))
                                            .filter(st => {
                                              const perfKey = `${st.kpi_id}_${st.responsible_id}`;
                                              const rowPerf = subtitlePerformanceMap[perfKey];
                                              return rowPerf?.new_value != null;   // ← only show rows that have a value
                                            })
                                            .map((subtitle, idx) => {
                                              const perfKey = `${subtitle.kpi_id}_${subtitle.responsible_id}`;
                                              const rowPerf = subtitlePerformanceMap[perfKey];
                                              const rowIsRed = rowPerf?.status === 'RED';

                                              return (
                                                <div
                                                  key={idx}
                                                  className={`table-row ${rowIsRed ? 'row--red' : 'row--green'}`}
                                                >
                                                  {/* Subtitle */}
                                                  <div className="table-cell">
                                                    {subtitle.indicator_subtitle || 'No subtitle'}
                                                  </div>
                                                  {/* Responsible */}
                                                  <div className="table-cell">
                                                    <div className="responsible-info">
                                                      <User size={14} />
                                                      <span>{subtitle.responsible_name || 'Unassigned'}</span>
                                                    </div>
                                                  </div>
                                                  {/* Current Value — new_value from hist26 */}
                                                  <div className="table-cell">
                                                    <div className="value-display">
                                                      {rowPerf?.new_value != null ? rowPerf.new_value : 'No data'}
                                                    </div>
                                                  </div>
                                                  {/* Target — target from hist26 */}
                                                  <div className="table-cell">
                                                    {rowPerf?.target != null ? rowPerf.target : 'N/A'}
                                                  </div>
                                                  {/* Min / Max — from Kpi table */}
                                                  <div className="table-cell">
                                                    <span className="limit-badge">
                                                      {rowPerf?.minimum_value != null ? rowPerf.minimum_value : '—'}
                                                    </span>
                                                  </div>
                                                  <div className="table-cell">
                                                    <span className="limit-badge">
                                                      {rowPerf?.maximum_value != null ? rowPerf.maximum_value : '—'}
                                                    </span>
                                                  </div>
                                                  {/* Status */}
                                                  <div className="table-cell table-cell--status">
                                                    {rowPerf && rowPerf.status !== 'NO_DATA' ? (
                                                      <div className={`row-status-badge ${rowIsRed ? 'row-status--red' : 'row-status--green'}`}>
                                                        {rowIsRed
                                                          ? <><TrendingDown size={14} /><span>Off Target</span></>
                                                          : <><TrendingUp size={14} /><span>On Target</span></>
                                                        }
                                                      </div>
                                                    ) : (
                                                      <span className="row-status-na">
                                                        <Minus size={14} /> N/A
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantTreeNavigatorEnhanced;
