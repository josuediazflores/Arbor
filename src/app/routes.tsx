import { createBrowserRouter } from 'react-router';
import { Marketplace } from './pages/Marketplace';
import { TemplateDetail } from './pages/TemplateDetail';

export const router = createBrowserRouter([
  { path: '/', Component: Marketplace },
  { path: '/template/:id', Component: TemplateDetail },
]);
