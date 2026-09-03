import React, { useState } from 'react';
import { Search, Activity, Layers, RefreshCw, BarChart2, Sparkles, Zap, Eye, Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  currentSymbol: string;
  currentTimeframe: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  profileType: 'tpo-collapsed' | 'tpo-split' | 'volume';
  onProfileTypeChange: (type: 'tpo-collapsed' | 'tpo-split' | 'volume') => void;
  binCount: number;
  onBinCountChange: (count: number) => void;
  onRefresh: () => void;
  viewMode?: 'profile' | 'gex' | 'btst' | 'pcr' | 'nineam' | 'options' | 'reports' | 'monthly';
  onViewModeChange?: (mode: 'profile' | 'gex' | 'btst' | 'pcr' | 'nineam' | 'options' | 'reports' | 'monthly') => void;
  sessionPeriod: 'daily' | 'weekly' | 'monthly';
  onSessionPeriodChange: (period: 'daily' | 'weekly' | 'monthly') => void;
  viewerCount?: number;
}

const PRESETS = [
  { value: 'NSE:NIFTY', label: 'Nifty 50 Index' },
  { value: 'NSE:BANKNIFTY', label: 'Bank Nifty Index' },
  { value: 'NSE:NIFTY1!', label: 'Nifty Index Futures' },
  // Commodities & Crypto
  { value: 'MCX:CRUDEOIL1!', label: 'Crude Oil Futures (MCX)' },
  { value: 'TVC:USOIL', label: 'Crude Oil Spot / WTI' },
  { value: 'OANDA:XAUUSD', label: 'Gold Spot / US Dollar' },
  { value: 'COINBASE:BTCUSD', label: 'Bitcoin / US Dollar' },
  { value: 'DELTAIN:BTCUSD.P', label: 'Bitcoin Perpetual Futures (Delta.in)' },
  // Indian Stocks (Alphabetical)
  { value: 'NSE:360ONE', label: '360One' },
  { value: 'NSE:ABB', label: 'Abb' },
  { value: 'NSE:ABCAPITAL', label: 'Abcapital' },
  { value: 'NSE:ADANIENSOL', label: 'Adaniensol' },
  { value: 'NSE:ADANIENT', label: 'Adanient' },
  { value: 'NSE:ADANIGREEN', label: 'Adanigreen' },
  { value: 'NSE:ADANIPORTS', label: 'Adaniports' },
  { value: 'NSE:ADANIPOWER', label: 'Adanipower' },
  { value: 'NSE:ALKEM', label: 'Alkem' },
  { value: 'NSE:AMBER', label: 'Amber' },
  { value: 'NSE:AMBUJACEM', label: 'Ambujacem' },
  { value: 'NSE:ANGELONE', label: 'Angelone' },
  { value: 'NSE:APLAPOLLO', label: 'Aplapollo' },
  { value: 'NSE:APOLLOHOSP', label: 'Apollohosp' },
  { value: 'NSE:ASHOKLEY', label: 'Ashokley' },
  { value: 'NSE:ASIANPAINT', label: 'Asianpaint' },
  { value: 'NSE:ASTRAL', label: 'Astral' },
  { value: 'NSE:AUBANK', label: 'Aubank' },
  { value: 'NSE:AUROPHARMA', label: 'Auropharma' },
  { value: 'NSE:AXISBANK', label: 'Axisbank' },
  { value: 'NSE:BAJAJFINSV', label: 'Bajajfinsv' },
  { value: 'NSE:BAJAJHLDNG', label: 'Bajajhldng' },
  { value: 'NSE:BAJAJ_AUTO', label: 'Bajaj-Auto' },
  { value: 'NSE:BAJFINANCE', label: 'Bajfinance' },
  { value: 'NSE:BANDHANBNK', label: 'Bandhanbnk' },
  { value: 'NSE:BANKBARODA', label: 'Bankbaroda' },
  { value: 'NSE:BANKINDIA', label: 'Bankindia' },
  { value: 'NSE:BDL', label: 'Bdl' },
  { value: 'NSE:BEL', label: 'Bel' },
  { value: 'NSE:BHARATFORG', label: 'Bharatforg' },
  { value: 'NSE:BHARTIARTL', label: 'Bhartiartl' },
  { value: 'NSE:BHEL', label: 'Bhel' },
  { value: 'NSE:BIOCON', label: 'Biocon' },
  { value: 'NSE:BLUESTARCO', label: 'Bluestarco' },
  { value: 'NSE:BOSCHLTD', label: 'Boschltd' },
  { value: 'NSE:BPCL', label: 'Bpcl' },
  { value: 'NSE:BRITANNIA', label: 'Britannia' },
  { value: 'NSE:BSE', label: 'Bse' },
  { value: 'NSE:CAMS', label: 'Cams' },
  { value: 'NSE:CANBK', label: 'Canbk' },
  { value: 'NSE:CDSL', label: 'Cdsl' },
  { value: 'NSE:CGPOWER', label: 'Cgpower' },
  { value: 'NSE:CHOLAFIN', label: 'Cholafin' },
  { value: 'NSE:CIPLA', label: 'Cipla' },
  { value: 'NSE:COALINDIA', label: 'Coalindia' },
  { value: 'NSE:COCHINSHIP', label: 'Cochinship' },
  { value: 'NSE:COFORGE', label: 'Coforge' },
  { value: 'NSE:COLPAL', label: 'Colpal' },
  { value: 'NSE:CONCOR', label: 'Concor' },
  { value: 'NSE:CROMPTON', label: 'Crompton' },
  { value: 'NSE:CUMMINSIND', label: 'Cumminsind' },
  { value: 'NSE:DABUR', label: 'Dabur' },
  { value: 'NSE:DALBHARAT', label: 'Dalbharat' },
  { value: 'NSE:DELHIVERY', label: 'Delhivery' },
  { value: 'NSE:DIVISLAB', label: 'Divislab' },
  { value: 'NSE:DIXON', label: 'Dixon' },
  { value: 'NSE:DLF', label: 'Dlf' },
  { value: 'NSE:DMART', label: 'Dmart' },
  { value: 'NSE:DRREDDY', label: 'Drreddy' },
  { value: 'NSE:EICHERMOT', label: 'Eichermot' },
  { value: 'NSE:ETERNAL', label: 'Eternal' },
  { value: 'NSE:EXIDEIND', label: 'Exideind' },
  { value: 'NSE:FEDERALBNK', label: 'Federalbnk' },
  { value: 'NSE:FORCEMOT', label: 'Forcemot' },
  { value: 'NSE:FORTIS', label: 'Fortis' },
  { value: 'NSE:GAIL', label: 'Gail' },
  { value: 'NSE:GLENMARK', label: 'Glenmark' },
  { value: 'NSE:GMRINFRA', label: 'Gmrairport' },
  { value: 'NSE:GODFRYPHLP', label: 'Godfryphlp' },
  { value: 'NSE:GODREJCP', label: 'Godrejcp' },
  { value: 'NSE:GODREJPROP', label: 'Godrejprop' },
  { value: 'NSE:GRASIM', label: 'Grasim' },
  { value: 'NSE:GVT&D', label: 'Gvt&D' },
  { value: 'NSE:HAL', label: 'Hal' },
  { value: 'NSE:HAVELLS', label: 'Havells' },
  { value: 'NSE:HCLTECH', label: 'Hcltech' },
  { value: 'NSE:HDFCAMC', label: 'Hdfcamc' },
  { value: 'NSE:HDFCBANK', label: 'Hdfcbank' },
  { value: 'NSE:HDFCLIFE', label: 'Hdfclife' },
  { value: 'NSE:HEROMOTOCO', label: 'Heromotoco' },
  { value: 'NSE:HINDALCO', label: 'Hindalco' },
  { value: 'NSE:HINDPETRO', label: 'Hindpetro' },
  { value: 'NSE:HINDUNILVR', label: 'Hindunilvr' },
  { value: 'NSE:HINDZINC', label: 'Hindzinc' },
  { value: 'NSE:HYUNDAI', label: 'Hyundai' },
  { value: 'NSE:ICICIBANK', label: 'Icicibank' },
  { value: 'NSE:ICICIGI', label: 'Icicigi' },
  { value: 'NSE:ICICIPRULI', label: 'Icicipruli' },
  { value: 'NSE:IDEA', label: 'Idea' },
  { value: 'NSE:IDFCFIRSTB', label: 'Idfcfirstb' },
  { value: 'NSE:IEX', label: 'Iex' },
  { value: 'NSE:INDHOTEL', label: 'Indhotel' },
  { value: 'NSE:INDIANB', label: 'Indianb' },
  { value: 'NSE:INDIGO', label: 'Indigo' },
  { value: 'NSE:INDUSINDBK', label: 'Indusindbk' },
  { value: 'NSE:INDUSTOWER', label: 'Industower' },
  { value: 'NSE:INFY', label: 'Infy' },
  { value: 'NSE:INOXWIND', label: 'Inoxwind' },
  { value: 'NSE:IOC', label: 'Ioc' },
  { value: 'NSE:IREDA', label: 'Ireda' },
  { value: 'NSE:IRFC', label: 'Irfc' },
  { value: 'NSE:ITC', label: 'Itc' },
  { value: 'NSE:JINDALSTEL', label: 'Jindalstel' },
  { value: 'NSE:JIOFIN', label: 'Jiofin' },
  { value: 'NSE:JSWENERGY', label: 'Jswenergy' },
  { value: 'NSE:JSWSTEEL', label: 'Jswsteel' },
  { value: 'NSE:JUBLFOOD', label: 'Jublfood' },
  { value: 'NSE:KALYANKJIL', label: 'Kalyankjil' },
  { value: 'NSE:KAYNES', label: 'Kaynes' },
  { value: 'NSE:KEI', label: 'Kei' },
  { value: 'NSE:KFINTECH', label: 'Kfintech' },
  { value: 'NSE:KOTAKBANK', label: 'Kotakbank' },
  { value: 'NSE:KPITTECH', label: 'Kpittech' },
  { value: 'NSE:LAURUSLABS', label: 'Lauruslabs' },
  { value: 'NSE:LICHSGFIN', label: 'Lichsgfin' },
  { value: 'NSE:LICI', label: 'Lici' },
  { value: 'NSE:LODHA', label: 'Lodha' },
  { value: 'NSE:LT', label: 'Lt' },
  { value: 'NSE:LTF', label: 'Ltf' },
  { value: 'NSE:LTIM', label: 'Ltm' },
  { value: 'NSE:LUPIN', label: 'Lupin' },
  { value: 'NSE:MANAPPURAM', label: 'Manappuram' },
  { value: 'NSE:MANKIND', label: 'Mankind' },
  { value: 'NSE:MARICO', label: 'Marico' },
  { value: 'NSE:MARUTI', label: 'Maruti' },
  { value: 'NSE:MAXHEALTH', label: 'Maxhealth' },
  { value: 'NSE:MAZDOCK', label: 'Mazdock' },
  { value: 'NSE:MCX', label: 'Mcx' },
  { value: 'NSE:MFSL', label: 'Mfsl' },
  { value: 'NSE:MOTHERSON', label: 'Motherson' },
  { value: 'NSE:MOTILALOFS', label: 'Motilalofs' },
  { value: 'NSE:MPHASIS', label: 'Mphasis' },
  { value: 'NSE:MUTHOOTFIN', label: 'Muthootfin' },
  { value: 'NSE:M_M', label: 'M&M' },
  { value: 'NSE:NAM_INDIA', label: 'Nam-India' },
  { value: 'NSE:NATIONALUM', label: 'Nationalum' },
  { value: 'NSE:NAUKRI', label: 'Naukri' },
  { value: 'NSE:NBCC', label: 'Nbcc' },
  { value: 'NSE:NESTLEIND', label: 'Nestleind' },
  { value: 'NSE:NHPC', label: 'Nhpc' },
  { value: 'NSE:NMDC', label: 'Nmdc' },
  { value: 'NSE:NTPC', label: 'Ntpc' },
  { value: 'NSE:NUVAMA', label: 'Nuvama' },
  { value: 'NSE:NYKAA', label: 'Nykaa' },
  { value: 'NSE:OBEROIRLTY', label: 'Oberoirlty' },
  { value: 'NSE:OFSS', label: 'Ofss' },
  { value: 'NSE:OIL', label: 'Oil' },
  { value: 'NSE:ONGC', label: 'Ongc' },
  { value: 'NSE:PAGEIND', label: 'Pageind' },
  { value: 'NSE:PATANJALI', label: 'Patanjali' },
  { value: 'NSE:PAYTM', label: 'Paytm' },
  { value: 'NSE:PERSISTENT', label: 'Persistent' },
  { value: 'NSE:PETRONET', label: 'Petronet' },
  { value: 'NSE:PFC', label: 'Pfc' },
  { value: 'NSE:PGEL', label: 'Pgel' },
  { value: 'NSE:PHOENIXLTD', label: 'Phoenixltd' },
  { value: 'NSE:PIDILITIND', label: 'Pidilitind' },
  { value: 'NSE:PIIND', label: 'Piind' },
  { value: 'NSE:PNB', label: 'Pnb' },
  { value: 'NSE:PNBHOUSING', label: 'Pnbhousing' },
  { value: 'NSE:POLICYBZR', label: 'Policybzr' },
  { value: 'NSE:POLYCAB', label: 'Polycab' },
  { value: 'NSE:POWERGRID', label: 'Powergrid' },
  { value: 'NSE:POWERINDIA', label: 'Powerindia' },
  { value: 'NSE:PREMIERENE', label: 'Premierene' },
  { value: 'NSE:PRESTIGE', label: 'Prestige' },
  { value: 'NSE:RADICO', label: 'Radico' },
  { value: 'NSE:RBLBANK', label: 'Rblbank' },
  { value: 'NSE:RECLTD', label: 'Recltd' },
  { value: 'NSE:RELIANCE', label: 'Reliance' },
  { value: 'NSE:RVNL', label: 'Rvnl' },
  { value: 'NSE:SAIL', label: 'Sail' },
  { value: 'NSE:SBICARD', label: 'Sbicard' },
  { value: 'NSE:SBILIFE', label: 'Sbilife' },
  { value: 'NSE:SBIN', label: 'Sbin' },
  { value: 'NSE:SHREECEM', label: 'Shreecem' },
  { value: 'NSE:SHRIRAMFIN', label: 'Shriramfin' },
  { value: 'NSE:SIEMENS', label: 'Siemens' },
  { value: 'NSE:SOLARINDS', label: 'Solarinds' },
  { value: 'NSE:SONACOMS', label: 'Sonacoms' },
  { value: 'NSE:SRF', label: 'Srf' },
  { value: 'NSE:SUNPHARMA', label: 'Sunpharma' },
  { value: 'NSE:SUPREMEIND', label: 'Supremeind' },
  { value: 'NSE:SUZLON', label: 'Suzlon' },
  { value: 'NSE:SWIGGY', label: 'Swiggy' },
  { value: 'NSE:TATACONSUM', label: 'Tataconsum' },
  { value: 'NSE:TATAELXSI', label: 'Tataelxsi' },
  { value: 'NSE:TATAPOWER', label: 'Tatapower' },
  { value: 'NSE:TATASTEEL', label: 'Tatasteel' },
  { value: 'NSE:TCS', label: 'Tcs' },
  { value: 'NSE:TECHM', label: 'Techm' },
  { value: 'NSE:TIINDIA', label: 'Tiindia' },
  { value: 'NSE:TITAN', label: 'Titan' },
  { value: 'NSE:TMPV', label: 'Tmpv' },
  { value: 'NSE:TORNTPHARM', label: 'Torntpharm' },
  { value: 'NSE:TRENT', label: 'Trent' },
  { value: 'NSE:TVSMOTOR', label: 'Tvsmotor' },
  { value: 'NSE:ULTRACEMCO', label: 'Ultracemco' },
  { value: 'NSE:UNIONBANK', label: 'Unionbank' },
  { value: 'NSE:UNITDSPR', label: 'Unitdspr' },
  { value: 'NSE:UNOMINDA', label: 'Unominda' },
  { value: 'NSE:UPL', label: 'Upl' },
  { value: 'NSE:VBL', label: 'Vbl' },
  { value: 'NSE:VEDL', label: 'Vedl' },
  { value: 'NSE:VMM', label: 'Vmm' },
  { value: 'NSE:VOLTAS', label: 'Voltas' },
  { value: 'NSE:WAAREEENER', label: 'Waareeener' },
  { value: 'NSE:WIPRO', label: 'Wipro' },
  { value: 'NSE:YESBANK', label: 'Yesbank' },
  { value: 'NSE:ZYDUSLIFE', label: 'Zyduslife' }
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentSymbol,
  currentTimeframe,
  connectionStatus,
  onSymbolChange,
  onTimeframeChange,
  profileType,
  onProfileTypeChange,
  binCount,
  onBinCountChange,
  onRefresh,
  viewMode = 'profile',
  onViewModeChange,
  sessionPeriod,
  onSessionPeriodChange,
  viewerCount
}) => {
  const [searchInput, setSearchInput] = useState(currentSymbol);
  const [showPresets, setShowPresets] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSymbolChange(searchInput.trim().toUpperCase());
      setShowPresets(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981'; // green
      case 'connecting': return '#f59e0b'; // orange
      case 'disconnected': return '#ef4444'; // red
    }
  };

  return (
    <header className="glass-panel animate-fade-in" style={{ padding: '16px 24px', position: 'relative', zIndex: 1100 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
              MIHIR
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontWeight: '700', letterSpacing: '0.5px' }}>
              MARKET PROFILE BHAICHARA
            </p>
          </div>
        </div>

        {/* Layout View Mode Toggle */}
        {onViewModeChange && (
          <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => onViewModeChange('profile')}
              style={{
                background: viewMode === 'profile' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Activity size={13} />
              Market Profile
            </button>

            <button
              onClick={() => onViewModeChange('gex')}
              style={{
                background: viewMode === 'gex' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={13} style={{ transform: 'rotate(90deg)' }} />
              GEX Analysis
            </button>

            <button
              onClick={() => onViewModeChange('pcr')}
              style={{
                background: viewMode === 'pcr' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <BarChart2 size={13} />
              PCR Analysis
            </button>



            <button
              onClick={() => onViewModeChange('btst')}
              style={{
                background: viewMode === 'btst' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={13} />
              3:15 PM BTST
            </button>

            <button
              onClick={() => onViewModeChange('nineam')}
              style={{
                background: viewMode === 'nineam' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={13} />
              9:00 AM Pre-Market
            </button>

            <button
              onClick={() => onViewModeChange('options')}
              style={{
                background: viewMode === 'options' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={13} color="var(--accent-blue)" />
              Options Tracker
            </button>

            <button
              onClick={() => onViewModeChange('monthly')}
              style={{
                background: viewMode === 'monthly' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Calendar size={13} color="#60a5fa" />
              Monthly Profile
            </button>

            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <button
                onClick={() => onViewModeChange('reports')}
                style={{
                  background: viewMode === 'reports' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <BarChart2 size={13} color="var(--accent-purple)" />
                Daily Post-Mortem
              </button>
            )}
          </div>

        )}

        {/* Symbol Search Form */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '300px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
              <input
                type="text"
                className="custom-input"
                style={{ width: '100%', paddingLeft: '36px', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                placeholder="Search symbol (e.g. NSE:NIFTY)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setShowPresets(true)}
                onBlur={() => setTimeout(() => setShowPresets(false), 200)}
              />
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <button 
                type="submit" 
                className="glow-btn"
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '0 16px' }}
              >
                Go
              </button>
            </div>
          </form>

          {showPresets && (() => {
            const term = searchInput.trim().toLowerCase();
            const isDefault = !term || term === currentSymbol.toLowerCase();
            const filteredPresets = PRESETS.filter(p => {
              if (isDefault) {
                return [
                  'NSE:NIFTY', 'NSE:BANKNIFTY', 'NSE:NIFTY1!', 
                  'MCX:CRUDEOIL1!', 'OANDA:XAUUSD', 'COINBASE:BTCUSD', 'NSE:RELIANCE', 'NSE:HDFCBANK'
                ].includes(p.value);
              }
              return p.value.toLowerCase().includes(term) || p.label.toLowerCase().includes(term);
            }).slice(0, 12);

            return (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '100%',
                zIndex: 1200,
                borderRadius: '8px',
                padding: '6px 0',
                boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                border: '1px solid var(--border-hover)',
                maxHeight: '320px',
                overflowY: 'auto'
              }}>
                <p style={{ 
                  fontSize: '9px', 
                  fontWeight: '800', 
                  color: isDefault ? 'var(--text-muted)' : 'var(--accent-blue)', 
                  padding: '4px 12px 4px 12px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.8px',
                  margin: 0,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  marginBottom: '4px'
                }}>
                  {isDefault ? 'Popular Presets' : 'Matching Symbols'}
                </p>
                {filteredPresets.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    No matching symbols found.
                  </div>
                ) : (
                  filteredPresets.map((preset) => (
                    <div
                      key={preset.value}
                      onMouseDown={() => {
                        setSearchInput(preset.value);
                        onSymbolChange(preset.value);
                      }}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.2s',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                        e.currentTarget.style.color = 'var(--accent-blue)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'white';
                      }}
                    >
                      <span style={{ fontWeight: '700', letterSpacing: '0.2px' }}>{preset.value}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.label}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })()}
        </div>

        {/* Timeframe selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TF:</label>
          <select
            className="custom-input custom-select"
            style={{ width: '85px', padding: '6px 28px 6px 12px' }}
            value={currentTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
          >
            <option value="1">1 Min</option>
            <option value="5">5 Min</option>
            <option value="15">15 Min</option>
            <option value="30">30 Min</option>
            <option value="60">1 Hour</option>
            <option value="D">Daily</option>
            <option value="W">Weekly</option>
            <option value="M">Monthly</option>
          </select>
        </div>

        {/* Profile Mode Controls */}
        {viewMode === 'profile' && (
          <>
            {/* Session Period (Daily/Weekly/Monthly) */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3px' }}>
              <button
                onClick={() => onSessionPeriodChange('daily')}
                style={{
                  background: sessionPeriod === 'daily' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12.5px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Daily
              </button>
              <button
                onClick={() => onSessionPeriodChange('weekly')}
                style={{
                  background: sessionPeriod === 'weekly' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12.5px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Weekly
              </button>
              <button
                onClick={() => onSessionPeriodChange('monthly')}
                style={{
                  background: sessionPeriod === 'monthly' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12.5px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
            </div>

            {/* Profile Type */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3px' }}>
              <button
                onClick={() => onProfileTypeChange('tpo-collapsed')}
                style={{
                  background: profileType === 'tpo-collapsed' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Layers size={13} />
                TPO Collapsed
              </button>
              <button
                onClick={() => onProfileTypeChange('tpo-split')}
                style={{
                  background: profileType === 'tpo-split' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Layers size={13} style={{ transform: 'rotate(90deg)' }} />
                TPO Split
              </button>
              <button
                onClick={() => onProfileTypeChange('volume')}
                style={{
                  background: profileType === 'volume' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <BarChart2 size={13} />
                Volume Profile
              </button>
            </div>

            {/* Dynamic Price Bins */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Row Resolution:</label>
              <select
                className="custom-input custom-select"
                style={{ width: '80px', padding: '6px 28px 6px 12px' }}
                value={binCount}
                onChange={(e) => onBinCountChange(parseInt(e.target.value, 10))}
              >
                <option value="20">Coarse (20)</option>
                <option value="30">Normal (30)</option>
                <option value="40">Fine (40)</option>
                <option value="60">Extra Fine (60)</option>
                <option value="80">Ultra (80)</option>
              </select>
            </div>
          </>
        )}

        {/* Right side connection info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active Viewers Count Badge */}
          {viewerCount !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px' }} title="Active viewers watching this dashboard">
              <Eye size={14} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                Viewers: <span style={{ color: 'var(--text-primary)' }}>{viewerCount}</span>
              </span>
            </div>
          )}

          <button
            onClick={onRefresh}
            style={{
              background: 'transparent',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}
            title="Force refresh"
          >
            <RefreshCw size={15} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(), boxShadow: `0 0 10px ${getStatusColor()}` }}></div>
            <span style={{ fontSize: '12px', textTransform: 'capitalize', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
