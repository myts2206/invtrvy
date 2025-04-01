
import { Product, inventoryMetrics } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Processes uploaded Excel data into the application's Product format
 */
export const processUploadedData = (data: any[]): Product[] => {
  console.log('Starting data processing');
  return data.map(item => {
    const id = uuidv4().substring(0, 8);

    // Updated normalization logic
    const normalizedItem: any = {};
    Object.keys(item).forEach(key => {
      const cleanKey = key.replace(/\n|\s|_/g, '').toLowerCase();
      normalizedItem[cleanKey] = item[key];
    });

    // Updated extractField function
    const extractField = (fieldName: string, aliases: string[] = []): any => {
      const normalize = (str: string) => str.replace(/\s|_/g, '').toLowerCase();
      const allKeys = [fieldName, ...aliases].map(normalize);

      if (normalize(fieldName) === 'leadtime') {
        allKeys.push('reordertime', 'lt');
      }

      for (const key of allKeys) {
        if (normalizedItem[key] !== undefined) {
          return normalizedItem[key];
        }
      }

      return undefined;
    };

    // Set up an empty sales history array - not generating fake data
    const salesHistory: { date: string; amount: number }[] = [];

    // Extract all fields directly from Excel without adding defaults
    const brand = extractField('brand');
    const product = extractField('product');
    const variant = extractField('variant');
    const productName = extractField('productname', ['product name', 'name']);
    const asins = extractField('asins');
    const gs1Code = extractField('gs1code', ['gs1 code']);
    const sku = extractField('sku', ['skuid', 'productid']);
    const fsn = extractField('fsn');
    const vendorAMZ = extractField('vendoramz', ['vendor amz']);
    const column1 = extractField('column1');
    const launchType = extractField('launchtype', ['launch type']);
    const vendor2 = extractField('vendor2');
    const fbaSales = extractField('fbasales', ['fba sales']);
    const rkrzSale = extractField('rkrzsale', ['rk/rz sale']);
    const amazonSale = extractField('amazonsale', ['amazon sale']);
    const amazonASD = extractField('amazonasd', ['amazon asd']);
    const amazonGrowth = extractField('amazongrowth', ['amazon growth']);
    const maxDRR = extractField('maxdrr', ['max drr']);
    const amazonPASD = extractField('amazonpasd', ['amazon pasd']);
    const diff = extractField('diff');
    const ctTargetInventory = extractField('cttargetinventory', ['ct target inventory']);
    const amazonInventory = extractField('amazoninventory', ['amazon inventory']);
    const fba = extractField('fba');
    const amazonDemand = extractField('amazondemand', ['amazon demand']);
    const fkAlphaSales = extractField('fkalphasales', ['fk alpha sales']);
    const fkAlphaInv = extractField('fkalphainv', ['fk alpha inv']);
    const fkSales = extractField('fksales', ['fk sales']);
    const fbfInv = extractField('fbfinv', ['fbf inv']);
    const fkSalesTotal = extractField('fksalestotal', ['fk sales total']);
    const fkInv = extractField('fkinv', ['fk inv']);
    const fkASD = extractField('fkasd', ['fk asd']);
    const fkGrowth = extractField('fkgrowth', ['fk growth']);
    const maxDRR2 = extractField('maxdrr2', ['max drr2']);
    const fkPASD = extractField('fkpasd', ['fk pasd']);
    const fkDemand = extractField('fkdemand', ['fk demand']);
    const otherMPSales = extractField('othermpsales', ['other mp sales']);
    const qcPASD = extractField('qcpasd', ['qc pasd']);
    const qcommerceDemand = extractField('qcommercedemand', ['qcommerce demand']);
    const wh = extractField('wh');

    let leadTime = extractField('leadtime', ['Lead Time']);

    if (leadTime !== undefined && typeof leadTime === 'string') {
      const parsedLeadTime = parseInt(leadTime.trim(), 10);
      if (!isNaN(parsedLeadTime)) leadTime = parsedLeadTime;
    }

    const orderFreq = extractField('orderfreq', ['order frequ']);
    const pasd = extractField('pasd');
    const mpDemand = extractField('mpdemand', ['mp demand']);
    const transit = extractField('transit');
    const toOrder = extractField('toorder', ['to order']);
    const finalOrder = extractField('finalorder', ['final order']);
    const remark = extractField('remark');
    const daysInvInHand = extractField('daysinvinhand', ['no.of days inv inhand']);
    const daysInvTotal = extractField('daysinvtotal', ['no.of days inv total']);

    // Derive DOC and DRR from the dataset values
    const drr = pasd; // Using PASD as the demand replenishment rate
    const doc = daysInvInHand; // Using days inventory in hand as DOC
    const target = ctTargetInventory; // Using CT target inventory as target

    return {
      id,
      name: productName || `${brand || ''} ${product || ''} ${variant || ''}`.trim() || `Product ${id}`,
      sku: sku || `SKU-${id}`,
      category: extractField('category', ['productcategory']) || 'Uncategorized',
      // Only include fields that are in the Excel
      salesHistory,
      brand,
      product,
      variant,
      asins,
      gs1Code,
      fsn,
      vendorAMZ,
      column1,
      launchType,
      vendor2,
      fbaSales,
      rkrzSale,
      amazonSale,
      amazonASD,
      amazonGrowth,
      maxDRR,
      amazonPASD,
      diff,
      ctTargetInventory,
      amazonInventory,
      fba,
      amazonDemand,
      fkAlphaSales,
      fkAlphaInv,
      fkSales,
      fbfInv,
      fkSalesTotal,
      fkInv,
      fkASD,
      fkGrowth,
      maxDRR2,
      fkPASD,
      fkDemand,
      otherMPSales,
      qcPASD,
      qcommerceDemand,
      wh,
      leadTime,
      orderFreq,
      pasd,
      mpDemand,
      transit,
      toOrder,
      finalOrder,
      remark,
      daysInvInHand,
      daysInvTotal,
      // Include derived fields for the dashboard
      drr,
      doc,
      target
    };
  });
};

/**
 * Calculate aggregated inventory metrics from product data
 */
export const calculateInventoryMetrics = (products: Product[]) => {
  // Calculate low stock items using the same logic as in DataContext's getLowStockItems
  const lowStockItems = products.filter(product => {
    const pasd = product.pasd;
    const leadTime = product.leadTime;
    const transitTime = product.transit;
    
    if (pasd === undefined || leadTime === undefined) {
      return false;
    }
    
    // Ensure warehouse stock is a number
    let warehouseStock: number;
    if (typeof product.wh === 'string') {
      warehouseStock = parseFloat(product.wh);
      if (isNaN(warehouseStock)) return false;
    } else if (typeof product.wh === 'number') {
      warehouseStock = product.wh;
    } else {
      return false;
    }
    
    const fbaStock = typeof product.fba === 'number' ? product.fba : 0;
    
    const availableInventory = warehouseStock + fbaStock;
    const lowStockThreshold = typeof pasd === 'number' && typeof leadTime === 'number' ? 
      pasd * (leadTime + (typeof transitTime === 'number' ? transitTime : 0)) : 0;
    
    return lowStockThreshold > 0 && availableInventory < lowStockThreshold;
  }).length;
  
  const totalProducts = products.length;
  
  // Calculate metrics using only available data
  const totalValue = products.reduce((sum, product) => {
    if (product.wh === undefined) return sum;
    
    // Convert warehouse stock to number
    let whValue: number;
    if (typeof product.wh === 'string') {
      whValue = parseFloat(product.wh);
      if (isNaN(whValue)) return sum;
    } else if (typeof product.wh === 'number') {
      whValue = product.wh;
    } else {
      return sum;
    }
    
    // Just count total inventory value as warehouse quantity
    return sum + whValue;
  }, 0);
  
  // Count out-of-stock items
  const outOfStockItems = products.filter(product => {
    if (product.wh === undefined) return false;
    
    if (typeof product.wh === 'string') {
      const whValue = parseFloat(product.wh);
      return !isNaN(whValue) && whValue === 0;
    }
    
    return typeof product.wh === 'number' && product.wh === 0;
  }).length;
  
  // Only calculate metrics using products with necessary data
  const validProducts = products.filter(p => {
    if (p.wh === undefined || p.pasd === undefined) return false;
    
    let whValue: number;
    if (typeof p.wh === 'string') {
      whValue = parseFloat(p.wh);
      return !isNaN(whValue) && typeof p.pasd === 'number' && p.pasd > 0;
    }
    
    return typeof p.wh === 'number' && typeof p.pasd === 'number' && p.pasd > 0;
  });
  
  // Calculate average DRR using only products with PASD values
  const drrProducts = products.filter(p => typeof p.pasd === 'number' && p.pasd !== undefined);
  const avgDRR = drrProducts.length > 0 
    ? drrProducts.reduce((sum, product) => {
        const pasd = typeof product.pasd === 'number' ? product.pasd : 0;
        return sum + pasd;
      }, 0) / drrProducts.length 
    : 0;
  
  // Calculate average DOC using only products with DOC or necessary calculation values
  const docProducts = products.filter(p => {
    if (p.daysInvInHand !== undefined) return true;
    
    if (p.wh !== undefined && p.pasd !== undefined) {
      let whValue: number;
      if (typeof p.wh === 'string') {
        whValue = parseFloat(p.wh);
        return !isNaN(whValue) && typeof p.pasd === 'number' && p.pasd > 0;
      }
      return typeof p.wh === 'number' && typeof p.pasd === 'number' && p.pasd > 0;
    }
    
    return false;
  });
  
  const avgDOC = docProducts.length > 0
    ? docProducts.reduce((sum, product) => {
        if (typeof product.daysInvInHand === 'number') return sum + product.daysInvInHand;
        
        let whValue: number;
        if (typeof product.wh === 'string') {
          whValue = parseFloat(product.wh);
          if (isNaN(whValue)) return sum;
        } else if (typeof product.wh === 'number') {
          whValue = product.wh;
        } else {
          return sum;
        }
        
        const pasd = typeof product.pasd === 'number' ? product.pasd : 0;
        return pasd > 0 ? sum + (whValue / pasd) : sum;
      }, 0) / docProducts.length
    : 0;
  
  // Count items with inventory in transit
  const itemsInTransit = products.filter(product => 
    typeof product.transit === 'number' && product.transit > 0
  ).length;
  
  // Sum total transit inventory
  const totalTransit = products.reduce((sum, product) => {
    const transit = typeof product.transit === 'number' ? product.transit : 0;
    return sum + transit;
  }, 0);
  
  // Count items needing to be ordered
  const itemsToOrder = products.filter(product => 
    typeof product.toOrder === 'number' && product.toOrder > 0
  ).length;
  
  // Sum total to order quantities
  const totalToOrder = products.reduce((sum, product) => {
    const toOrder = typeof product.toOrder === 'number' ? product.toOrder : 0;
    return sum + toOrder;
  }, 0);
  
  // Calculate average PASD from products with PASD values
  const pasdProducts = products.filter(p => typeof p.pasd === 'number' && p.pasd !== undefined);
  const avgPASD = pasdProducts.length > 0
    ? pasdProducts.reduce((sum, product) => {
        const pasd = typeof product.pasd === 'number' ? product.pasd : 0;
        return sum + pasd;
      }, 0) / pasdProducts.length
    : 0;
  
  // Calculate target achievement percentage - only for products with both target and currentStock
  const productsWithTarget = products.filter(p => {
    if (p.ctTargetInventory === undefined || p.wh === undefined) return false;
    
    const targetValue = typeof p.ctTargetInventory === 'number' ? p.ctTargetInventory : 0;
    if (targetValue <= 0) return false;
    
    return true;
  });
  
  const targetAchievement = productsWithTarget.length > 0
    ? productsWithTarget.reduce((sum, product) => {
        let whValue: number;
        if (typeof product.wh === 'string') {
          whValue = parseFloat(product.wh);
          if (isNaN(whValue)) return sum;
        } else if (typeof product.wh === 'number') {
          whValue = product.wh;
        } else {
          return sum;
        }
        
        const targetValue = typeof product.ctTargetInventory === 'number' ? product.ctTargetInventory : 0;
        return sum + (whValue >= targetValue ? 1 : 0);
      }, 0) / productsWithTarget.length * 100
    : 0;
  
  // Calculate inventory health score using available metrics
  const stockoutRisk = totalProducts > 0 ? (lowStockItems / totalProducts) * 100 : 0;
  const inventoryEfficiency = (100 - (stockoutRisk * 0.5) + (targetAchievement * 0.3) + (avgDRR * 10)) / 1.8;
  const inventoryHealthScore = Math.round(Math.min(Math.max(inventoryEfficiency, 0), 100));
  
  return {
    totalProducts,
    totalValue,
    lowStockItems,
    outOfStockItems,
    averageTurnoverRate: 0, // Not calculating without sales history
    avgDRR,
    avgDOC,
    targetAchievement,
    inventoryHealthScore,
    totalTransit,
    itemsInTransit, 
    totalToOrder,
    itemsToOrder,
    avgPASD
  };
};
