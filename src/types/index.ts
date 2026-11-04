export type Role = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ORDER' | 'STOCK';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  createdAt: string;
  _count?: {
    orders: number;
  };
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProductDTO {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  stock: number;
  categoryId: string;
  category?: CategoryDTO;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  totalAmount: number;
  status: string;
  paymentMethod: string;
  items?: OrderItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLogDTO {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface DashboardStats {
  metrics: {
    totalRevenue: number;
    revenueChange: number;
    totalUsers: number;
    currentNewUsers?: number;
    usersChange: number;
    totalOrders: number;
    periodOrders?: number;
    ordersChange: number;
    averageOrderValue: number;
    aovChange: number;
    activeSubscriptions?: number;
    subscriptionsChange?: number;
  };
  revenueChart: {
    name: string;
    gelir: number;
    siparis: number;
  }[];
  userGrowthChart: {
    name: string;
    kullanici: number;
  }[];
  recentOrders: OrderDTO[];
  recentActivities: ActivityLogDTO[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
