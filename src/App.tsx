import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/lib/i18n";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Eager load - critical path (homepage)
import Index from "./pages/Index";

// Lazy load - secondary pages for faster initial load
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const MyTicketsPage = lazy(() => import('./pages/MyTicketsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Suspense fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-warm-cream">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes - Scanner */}
            <Route
              path="/scan"
              element={
                <ProtectedRoute allowedRoles={['scanner', 'admin']}>
                  <ScannerPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
