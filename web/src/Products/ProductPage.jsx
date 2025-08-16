import React from "react";
import { BASE_URL, getToken } from "../config";
import { useAuth } from '../context/AuthContext';
import LeftSidebar from "../user/leftSideBar";
import ProductTabs from "../components/ProductTabs";

const ProductPage = () => {
  return (
    <div className="container">
        <div className="d-flex">
            <div style={{ width: "20px" }}>
                <LeftSidebar />
            </div>
            <div style={{ flex: 1 }}>
                <ProductTabs />
            </div>
        </div>

    </div>
  );
};

export default ProductPage;
