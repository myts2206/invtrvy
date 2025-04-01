
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, inventoryMetrics } from '@/lib/types';
import { processUploadedData } from '@/lib/dataProcessor';
import { calculateBundleInformation, isProductOverstocked } from '@/lib/bundleCalculator';

interface DataContextType {
  products: Product[];
  isUsingMockData: boolean;
  uploadData: (data: any[]) => void;
  resetToMockData: () => void;
  getLowStockItems: () => Product[];
  getOverstockItems: () => Product[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with empty array
  const [products, setProducts] = useState<Product[]>([]);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const uploadData = (data: any[]) => {
    console.log('Raw data being processed:', data);
    
    // Add more detailed logging to see exactly what's in the Excel for lead time
    if (data.length > 0) {
      // Print all column headers exactly as they appear in the Excel
      const sampleItem = data[0];
      console.log('All column headers as in Excel:', Object.keys(sampleItem));
      
      // Check for lead time field in the raw data
      console.log('Lead time field in raw data:', 
        Object.keys(sampleItem).find(key => 
          key.toLowerCase().includes('lead') || key.toLowerCase() === 'lead time'
        )
      );
      
      // Log the actual value in the first item
      Object.keys(sampleItem).forEach(key => {
        if (key.toLowerCase().includes('lead') || key.toLowerCase() === 'lead time') {
          console.log(`Found lead time in Excel with key "${key}":`, sampleItem[key]);
        }
      });
    }
    
    // Process the uploaded data with our data processor
    const processedData = processUploadedData(data);
    
    // Apply bundle calculations
    const productsWithBundleInfo = calculateBundleInformation(processedData);
    
    // Log some samples to diagnose issues
    if (productsWithBundleInfo.length > 0) {
      console.log('First product lead time:', productsWithBundleInfo[0].leadTime);
      console.log('Sample product data with bundle info:', productsWithBundleInfo[0]);
      
      // Log bundle groups
      const baseUnits = productsWithBundleInfo.filter(p => p.isBaseUnit);
      console.log('Base units found:', baseUnits.length);
      baseUnits.forEach(bu => {
        console.log(`Base unit ${bu.sku} with pack size ${bu.packSize} has final order: ${bu.finalToOrderBaseUnits}`);
        console.log(`Bundled SKUs:`, bu.bundledSKUs);
      });
      
      // Log overstock items
      const overstockItems = productsWithBundleInfo.filter(p => p.isOverstock);
      console.log('Overstock items found:', overstockItems.length);
    }
    
    console.log('Processed data with bundle info:', productsWithBundleInfo);
    setProducts(productsWithBundleInfo);
    setIsUsingMockData(false);
  };

  const resetToMockData = () => {
    // Reset to empty array
    setProducts([]);
    setIsUsingMockData(false);
  };

  // Calculate low stock items based on the formula: (WH + FBA) < (PASD × (Lead Time + Transit Time))
  const getLowStockItems = (): Product[] => {
    return products.filter(product => {
      // Get values directly from the dataset without defaults
      const pasd = product.pasd;
      const leadTime = product.leadTime;
      const transitTime = product.transit;
      
      // Skip products without necessary data
      if (pasd === undefined || leadTime === undefined) {
        return false;
      }
      
      // Calculate available inventory - using only what's in the dataset
      const warehouseStock = typeof product.wh === 'string' ? parseFloat(product.wh) : product.wh;
      const fbaStock = product.fba;
      
      // Skip if we don't have the necessary inventory data
      if (warehouseStock === undefined || isNaN(warehouseStock)) {
        return false;
      }
      
      // Calculate available inventory (WH + FBA)
      const availableInventory = warehouseStock + (fbaStock || 0);
      
      // Calculate low stock threshold: PASD × (Lead Time + Transit Time)
      const lowStockThreshold = pasd * (leadTime + (transitTime || 0));
      
      // Flag if available inventory is below threshold and the threshold is valid
      return lowStockThreshold > 0 && availableInventory < lowStockThreshold;
    });
  };
  
  // Calculate overstock items based on the formula: WH > PASD * Order Frequency * 1.5
  const getOverstockItems = (): Product[] => {
    return products.filter(product => isProductOverstocked(product));
  };

  return (
    <DataContext.Provider 
      value={{ 
        products, 
        isUsingMockData, 
        uploadData, 
        resetToMockData,
        getLowStockItems,
        getOverstockItems
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
