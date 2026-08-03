import { useState } from 'react';
import PortfolioGrowthHero from './PortfolioGrowthHero';
import YourGoals from './YourGoals';
import YTDReturnCard from './YTDReturnCard';
import DividendsCard from './DividendsCard';
import UnrealizedPnLCard from './UnrealizedPnLCard';
import AssetAllocationChart from './AssetAllocationChart';
import GeographyIndustryBreakdown from './GeographyIndustryBreakdown';
import HoldingsTable from './HoldingsTable';
import DividendLog from './DividendLog';
import RebalanceAlert from './RebalanceAlert';
import RebalancingHistory from './RebalancingHistory';

export default function Dashboard() {
  // Cross-filter: clicking an industry in the treemap narrows Holdings,
  // Asset Allocation, and Geography below to just that industry,
  // PowerBI-style. Lives here (not in PortfolioContext) since it's
  // transient view state, not something that should persist across
  // sessions.
  const [industryFilter, setIndustryFilter] = useState(null);

  function toggleIndustryFilter(industry) {
    setIndustryFilter((prev) => (prev === industry ? null : industry));
  }

  return (
    // Narrow "app mockup" frame on mobile/tablet, widening out on desktop
    // (lg/xl) so the charts and Holdings table get real breathing room
    // instead of squeezing into a phone-width column on a wide viewport.
    // Net Worth (superseded by PortfolioGrowthHero, which shows the same
    // figure plus a growth chart) is intentionally not duplicated below.
    <main className="max-w-xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <PortfolioGrowthHero />
      <YourGoals />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UnrealizedPnLCard />
        <YTDReturnCard />
        <DividendsCard />
      </div>

      <AssetAllocationChart industryFilter={industryFilter} />
      <GeographyIndustryBreakdown
        industryFilter={industryFilter}
        selectedIndustry={industryFilter}
        onSelectIndustry={toggleIndustryFilter}
      />
      <HoldingsTable industryFilter={industryFilter} onClearIndustryFilter={() => setIndustryFilter(null)} />
      <DividendLog />
      <RebalanceAlert />
      <RebalancingHistory />
    </main>
  );
}
