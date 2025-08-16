// src/pages/ViewProduct.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BASE_URL, getToken } from "../config";
import LeftSidebar from '../user/leftSideBar';
import { useAuth } from '../context/AuthContext';
import ProductMessage from '../components/ProductMessage'; // Import the product-specific message component
import {
    Button,
    CloseButton,
    Drawer,
    For,
    HStack,
    Kbd,
    Portal,
} from "@chakra-ui/react"
import { RiArrowRightLine, RiMailLine } from "react-icons/ri"
import BusinessMessage from '../components/BusinessMessage'; // This is for general business chat
import ProductMessageChatWindow from '../components/ProductMessageChatWindow'; // NEW: Import the product-specific chat window
// Import Chakra UI Drawer components

const swipeConfidenceThreshold = 100;

const ViewProduct = () => {
    const { id } = useParams(); // This is the product ID
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [direction, setDirection] = useState(0);
    const { user } = useAuth(); // Current logged-in user
    const [isProductChatOpen, setIsProductChatOpen] = useState(false); // State to control product chat drawer
    //const drawerSize = useBreakpointValue({ base: "full", md: "md", lg: "lg" }); // Responsive drawer size

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/api/products/${id}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const data = await res.json();
                // Assuming data.product contains product_id, owner_id, product_business_id, business_name, logo_url
                setProduct(data.product);
                setSelectedIndex(0);

                // Fetch related products by category (excluding current product)
                if (data.product?.category) {
                    const relatedRes = await fetch(
                        `${BASE_URL}/api/products?category=${encodeURIComponent(data.product.category)}`,
                        { headers: { 'Authorization': `Bearer ${getToken()}` } }
                    );
                    const relatedData = await relatedRes.json();
                    // Filter out current product
                    const filteredRelated = relatedData.products.filter(p => p._id !== id);
                    setRelatedProducts(filteredRelated);
                } else {
                    setRelatedProducts([]);
                }
            } catch (err) {
                console.error('Error loading product or related products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    // Determine if the logged-in user is the owner of the product
    // Assuming product.owner_id is the user ID of the product owner
    const isOwner = user && product && user.id === product.owner_id;

    if (loading) return <p>Loading product...</p>;
    if (!product) return <p>Product not found</p>;

    const images = product.images;

    const paginate = (newDirection) => {
        setDirection(newDirection);
        setSelectedIndex((prev) => {
            let nextIndex = prev + newDirection;
            if (nextIndex < 0) return images.length - 1;
            if (nextIndex >= images.length) return 0;
            return nextIndex;
        });
    };

    const handleDragEnd = (event, info) => {
        if (info.offset.x > swipeConfidenceThreshold) {
            paginate(-1);
        } else if (info.offset.x < -swipeConfidenceThreshold) {
            paginate(1);
        }
    };

    return (
        <div className="container">
            <div className="row align-items-start">
                <div className="col-md-2">
                    <LeftSidebar />
                </div>
                <div className="col-md-8">
                    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
                        <h2 style={{ display: 'inline-block' }}>{product.name}</h2>
                        {isOwner && (
                            <Link
                                to={`/products/${id}/edit`}
                                className="btn btn-primary"
                                style={{ marginLeft: '10px' }}
                            >
                                Edit Product
                            </Link>
                        )}
                        {/* Large Image Preview */}
                        {images.length > 0 && (
                            <div
                                style={{
                                    marginBottom: '15px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    height: '400px',
                                    border: 'solid',
                                }}
                            >
                                <AnimatePresence initial={false} custom={direction}>
                                    <motion.img
                                        key={images[selectedIndex]}
                                        src={images[selectedIndex]}
                                        alt={`Selected`}
                                        custom={direction}
                                        initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        style={{
                                            width: '100%',
                                            height: '400px',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                        }}
                                        onClick={() => setLightboxOpen(true)}
                                        aria-label="Open image lightbox"
                                        role="button"
                                        tabIndex={0}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') setLightboxOpen(true);
                                        }}
                                    />
                                </AnimatePresence>

                                <button
                                    onClick={() => paginate(-1)}
                                    aria-label="Previous image"
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: 10,
                                        transform: 'translateY(-50%)',
                                        background: 'rgba(0,0,0,0.5)',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        padding: '6px 12px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        zIndex: 10,
                                    }}
                                >
                                    ‹
                                </button>

                                <button
                                    onClick={() => paginate(1)}
                                    aria-label="Next image"
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        right: 10,
                                        transform: 'translateY(-50%)',
                                        background: 'rgba(0,0,0,0.5)',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        padding: '6px 12px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        zIndex: 10,
                                    }}
                                >
                                    ›
                                </button>
                            </div>
                        )}

                        {/* Thumbnail Images */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '10px',
                                overflowX: 'auto',
                                marginBottom: '20px',
                                justifyContent: 'center',
                            }}
                        >
                            {images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    onClick={() => {
                                        setSelectedIndex(idx);
                                        setDirection(idx > selectedIndex ? 1 : -1);
                                    }}
                                    alt={`Thumbnail ${idx + 1}`}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: selectedIndex === idx ? '2px solid #007bff' : '1px solid #ccc',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Lightbox */}
                        <AnimatePresence>
                            {lightboxOpen && (
                                <motion.div
                                    key="lightbox"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        width: '100vw',
                                        height: '100vh',
                                        backgroundColor: 'rgb(0, 0, 0)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 1000,
                                        userSelect: 'none',
                                        flexDirection: 'column',
                                    }}
                                    onClick={() => setLightboxOpen(false)}
                                    aria-modal="true"
                                    role="dialog"
                                >
                                    <div
                                        style={{
                                            color: 'white',
                                            fontSize: '1.2rem',
                                            marginBottom: '10px',
                                            userSelect: 'none',
                                            fontWeight: 'bold',
                                            textShadow: '0 0 8px rgba(0,0,0,0.7)',
                                        }}
                                    >
                                        {selectedIndex + 1} / {images.length}
                                    </div>

                                    <motion.img
                                        key={images[selectedIndex]}
                                        src={images[selectedIndex]}
                                        alt={`Lightbox image ${selectedIndex + 1}`}
                                        initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.2}
                                        onDragEnd={(e, info) => {
                                            e.stopPropagation();
                                            handleDragEnd(e, info);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            maxHeight: '90vh',
                                            maxWidth: '90vw',
                                            borderRadius: '8px',
                                            cursor: 'grab',
                                            touchAction: 'pan-y',
                                            userSelect: 'none',
                                            position: 'relative',
                                        }}
                                    />

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            paginate(-1);
                                        }}
                                        aria-label="Previous image"
                                        style={{
                                            position: 'fixed',
                                            top: '50%',
                                            left: 20,
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0,0,0,0.5)',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '2rem',
                                            padding: '0 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            zIndex: 1100,
                                        }}
                                    >
                                        ‹
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            paginate(1);
                                        }}
                                        aria-label="Next image"
                                        style={{
                                            position: 'fixed',
                                            top: '50%',
                                            right: 20,
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(0,0,0,0.5)',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '2rem',
                                            padding: '0 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            zIndex: 1100,
                                        }}
                                    >
                                        ›
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxOpen(false);
                                        }}
                                        aria-label="Close lightbox"
                                        style={{
                                            position: 'fixed',
                                            top: 20,
                                            right: 20,
                                            background: 'rgba(0,0,0,0.5)',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '2rem',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            zIndex: 1100,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Related Products Section */}
                        {relatedProducts.length > 0 && (
                            <section style={{ marginTop: '40px' }}>
                                <h3>Related Products in "{product.category}"</h3>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '15px',
                                        marginTop: '15px',
                                    }}
                                >
                                    {relatedProducts.map((relProd) => (
                                        <Link
                                            to={`/products/${relProd._id}`}
                                            key={relProd._id}
                                            style={{
                                                border: '1px solid #ccc',
                                                borderRadius: '8px',
                                                width: '150px',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                overflow: 'hidden',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                transition: 'transform 0.2s',
                                            }}
                                            onClick={() => window.scrollTo(0, 0)} // scroll to top on navigation
                                        >
                                            <img
                                                src={relProd.images[0]}
                                                alt={relProd.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                            <div style={{ padding: '8px' }}>
                                                <h4
                                                    style={{
                                                        fontSize: '1rem',
                                                        margin: '0 0 5px 0',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {relProd.name}
                                                </h4>
                                                <p style={{ margin: 0, fontWeight: 'bold' }}>
                                                    {relProd.is_free ? 'Free' : `$${relProd.price}`}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
                <div className="col-md-2">
                    <p style={{ marginTop: '10px' }}>{product.description}</p>
                    <p>
                        <strong>Price:</strong> {product.is_free ? 'Free' : `$${product.price}`}
                    </p>
                    <p>
                        <strong>Category:</strong> {product.category}
                    </p>
                    <p>
                        <strong>Seller:</strong> {product.owner}
                    </p>
                    {/* Conditional rendering for chat buttons */}
                    {!isOwner && user && ( // Ensure a user is logged in and not the owner
                        <div>
                            <strong>Contact:</strong>
                            {product.product_business_id ? (
                                <>
                                    {/* Product-specific chat button and drawer */}
                                    <HStack wrap="wrap">
                                        <For each={["sm"]}>
                                            {(size) => (
                                                <Drawer.Root key={size} size={size}>
                                                    <Drawer.Trigger asChild>
                                                        <Button variant="outline" size="sm">
                                                        Message Seller
                                                        </Button>
                                                    </Drawer.Trigger>
                                                    <Portal>
                                                        <Drawer.Backdrop />
                                                        <Drawer.Positioner>
                                                            <Drawer.Content>
                                                                <Drawer.Header>
                                                                    <Drawer.Title>Chat about {product.name}</Drawer.Title>
                                                                </Drawer.Header>
                                                                <Drawer.Body>



                                                                    <ProductMessageChatWindow
                                                                        currentUser={user} // The logged-in user object
                                                                        currentUserType="user" // <--- IMPORTANT: Specify the type
                                                                        business={{
                                                                            id: product.product_business_id, // Ensure this is the correct ID field for the business
                                                                            name: product.business_name,
                                                                            logo_url: product.logo_url, // Assuming you have this on product
                                                                            owner_id: product.owner_id // The business owner's user ID
                                                                        }}
                                                                        product={{
                                                                            product_id: product.product_id,
                                                                            name: product.name
                                                                        }}
                                                                        recipientUser={{
                                                                            id: product.owner_id, // The ID of the business owner (who is the recipient)
                                                                            username: product.owner, // Assuming you have the owner's username
                                                                        }}
                                                                        onBack={() => console.log("Close Drawer")}
                                                                    />
                                                                </Drawer.Body>
                                                                <Drawer.Footer>
                                                                    <Drawer.ActionTrigger asChild>
                                                                        <Button variant="outline">Cancel</Button>
                                                                    </Drawer.ActionTrigger>
                                                                    {/* <Button>Save</Button> // Removed if not needed for chat */}
                                                                </Drawer.Footer>
                                                                <Drawer.CloseTrigger asChild>
                                                                    <CloseButton size="sm" />
                                                                </Drawer.CloseTrigger>
                                                            </Drawer.Content>
                                                        </Drawer.Positioner>
                                                    </Portal>
                                                </Drawer.Root>
                                            )}
                                        </For>
                                    </HStack>

                                    {/* General Business Message (if still desired, otherwise remove) */}
                             
                                </>
                            ) : (
                                <ProductMessage
                                    currentUser={user}
                                    recipient={{ userid: product.owner_id }}
                                    productId={product.product_id} // Use product._id if product_id is not the correct field
                                />
                            )}
                        </div>
                    )}


                    <div
                        style={{
                            marginTop: '30px',
                            background: '#f9f9f9',
                            padding: '15px',
                            borderRadius: '8px',
                        }}
                    >
                        <h4>🎉 Fun Fact</h4>
                        <p>This product was listed on: {new Date(product.created_at).toLocaleDateString()}</p>
                        <p>Looks like a great deal! 🚀</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewProduct;