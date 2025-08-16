import React, { useState, useEffect } from 'react';
import AllProducts from './AllProducts';
import YourProducts from './YourProducts';
import SavedProducts from './SavedProducts';
import AddProduct from '../Products/AddProductForm';
import '../Products/products.css';
import { Tabs } from "@chakra-ui/react";
import { LuAlbum, LuFolder, LuSquareCheck, LuUser } from "react-icons/lu";
import { Button } from "@chakra-ui/react";

const ProductTabs = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [fadeIn, setFadeIn] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [refreshAllProducts, setRefreshAllProducts] = useState(0); // New state for refreshing

  useEffect(() => {
    setFadeIn(false);
    const timeout = setTimeout(() => {
      setFadeIn(true);
    }, 200);

    return () => clearTimeout(timeout);
  }, [activeTab]);

  const handleOpenAddProductModal = () => {
    setShowAddProductModal(true);
  };

  const handleCloseAddProductModal = () => {
    setShowAddProductModal(false);
  };

  // This function is called when a product is successfully added
  const handleProductAdded = () => {
    // Increment the refreshAllProducts state to trigger a re-fetch in AllProducts
    setRefreshAllProducts(prev => prev + 1);
    console.log("Product added successfully! AllProducts will refresh.");
  };

  return (
    <div style={{ display: 'flex' }}>
      <Tabs.Root defaultValue="members" variant="plain">
        <Tabs.List bg="bg.muted" rounded="l3" p="1">
          <Tabs.Trigger value="members">
            <LuAlbum />
            All
          </Tabs.Trigger>
          <Tabs.Trigger value="projects">
            <LuUser />
            Mine
          </Tabs.Trigger>
          <Tabs.Trigger value="tasks">
            <LuSquareCheck />
            Saved
          </Tabs.Trigger>
          <Tabs.Indicator rounded="l2" />
        </Tabs.List>
        {/* Pass the refreshAllProducts state as a prop to AllProducts */}
        <Tabs.Content value="members">
          <AllProducts refreshTrigger={refreshAllProducts} />
        </Tabs.Content>
        <Tabs.Content value="projects"><YourProducts /></Tabs.Content>
        <Tabs.Content value="tasks">
          <SavedProducts />
        </Tabs.Content>
      </Tabs.Root>

      <Button onClick={handleOpenAddProductModal}>
        Create product
      </Button>

      <AddProduct
        isOpen={showAddProductModal}
        onClose={handleCloseAddProductModal}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
};

export default ProductTabs;