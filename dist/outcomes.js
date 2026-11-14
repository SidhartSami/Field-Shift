// Decision arithmetic only. These comparisons do not validate the agronomic model.
export function compareOutcomes(baseline,selected,area){
 if(!Number.isFinite(area)||area<=0)throw Error('A positive farm area is required.');
 return {baselineId:baseline.id,selectedId:selected.id,demandReductionMm:baseline.demand-selected.demand,demandReductionPct:(baseline.demand-selected.demand)/baseline.demand*100,demandEquivalentM3:(baseline.demand-selected.demand)*area*10,gapReductionMm:baseline.deficit-selected.deficit,remainingGapMm:selected.deficit,soilSupportChange:selected.soil-baseline.soil,protectionChange:selected.erosion-baseline.erosion,familyBreakChange:selected.breaks-baseline.breaks,legumeSeasons:selected.legumes};
}
export function screenEconomics({baseline,selected,area,irrigation,economics}){
 for(const k of ['pumpingCost','marginChange','transitionCost'])if(economics[k]===''||economics[k]===null||economics[k]===undefined)return null;
 const pumpingCost=Number(economics.pumpingCost),marginChange=Number(economics.marginChange),transitionCost=Number(economics.transitionCost);
 if(![area,irrigation,pumpingCost,marginChange,transitionCost].every(Number.isFinite)||area<=0||irrigation<0||pumpingCost<0||transitionCost<0)throw Error('Enter a valid area, irrigation amount and local cost assumptions. Pumping and switching costs cannot be negative.');
 if(!['INR','PKR','USD'].includes(economics.currency))throw Error('Choose a supported currency.');
 // Cap hypothetical application at available root-zone irrigation. Unmet demand is not pumped water.
 const application=r=>Math.min(irrigation,Math.max(0,r.demand-r.effectiveRain));
 const baselineApplicationMm=application(baseline),selectedApplicationMm=application(selected);
 const applicationReductionM3=(baselineApplicationMm-selectedApplicationMm)*area*10;
 const pumpingCostChange=applicationReductionM3*pumpingCost;
 const cropMarginChange=marginChange*area,firstYearSwitchingCost=transitionCost*area;
 return {currency:economics.currency,baselineApplicationMm,selectedApplicationMm,applicationReductionM3,pumpingCostChange,cropMarginChange,firstYearSwitchingCost,firstYearNetChange:pumpingCostChange+cropMarginChange-firstYearSwitchingCost,breakEvenCropMarginPerHa:(firstYearSwitchingCost-pumpingCostChange)/area,assumptions:{pumpingCost,marginChange,transitionCost,irrigation,area},interpretation:'Hypothetical first-year cost screen, not a profit forecast. Assumes annual irrigation application at min(available irrigation, demand minus effective rainfall). Costs are per root-zone-equivalent m³; daily timing, conveyance losses, fixed charges, uncertain yields and prices are not modelled.'};
}
